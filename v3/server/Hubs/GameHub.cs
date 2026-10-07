using System.Security.Claims;
using System.Text.RegularExpressions;
using GameServer.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GameServer.Hubs;

// Real-time player sync and PvP. Each map (A-L) is a SignalR group, so players only
// receive updates from players on the same map.
//
// Client -> server: JoinMap, UpdatePosition, UpdateStats, Attack, ReportKilled
// Server -> client: PlayersInMap, PlayerJoined, PlayerMoved, PlayerLeft, PlayerStats,
//                   PlayerAttacked, TakeDamage, PlayerKilled, Loot
[Authorize]
public partial class GameHub(PlayerRegistry players, ILogger<GameHub> logger) : Hub
{
    // Client range is 2.5; the extra allows for position updates arriving ~10 times per second.
    private const float MaxHitDistance = 4f;
    // Client cooldown is 0.8 s.
    private static readonly TimeSpan MinAttackInterval = TimeSpan.FromSeconds(0.6);
    // Damage comes from the client's weapon level, which the server doesn't store yet.
    private const int MaxDamage = 100;
    private const int MaxHealthLimit = 10_000;

    [GeneratedRegex("^[A-L]$")]
    private static partial Regex MapPattern();

    private string Username => Context.User?.Identity?.Name ?? "unknown";
    private string UserId => Context.User?.FindFirstValue(ClaimNames.UserId) ?? "";

    public override Task OnConnectedAsync()
    {
        logger.LogInformation("{Username} connected ({ConnectionId})", Username, Context.ConnectionId);
        return base.OnConnectedAsync();
    }

    // Call after connecting and after travelling to another map.
    public async Task JoinMap(string map, float x, float z, float rotation)
    {
        if (!MapPattern().IsMatch(map))
        {
            throw new HubException("Unknown map.");
        }

        var previous = players.Get(Context.ConnectionId);
        if (previous is not null && previous.Map != map)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, previous.Map);
            await Clients.Group(previous.Map).SendAsync("PlayerLeft", Context.ConnectionId);
        }

        var state = previous is null
            ? new PlayerState(Context.ConnectionId, UserId, Username, map, x, z, rotation)
            : previous with { Map = map, X = x, Z = z, Rotation = rotation };
        players.Set(state);
        await Groups.AddToGroupAsync(Context.ConnectionId, map);

        await Clients.Caller.SendAsync("PlayersInMap", players.InMap(map, Context.ConnectionId));
        await Clients.OthersInGroup(map).SendAsync("PlayerJoined", state);
    }

    // Clients send this about 10 times per second while moving.
    public Task UpdatePosition(float x, float z, float rotation)
    {
        var current = players.Get(Context.ConnectionId);
        if (current is null)
        {
            return Task.CompletedTask; // JoinMap must be called first
        }

        var state = current with { X = x, Z = z, Rotation = rotation };
        players.Set(state);
        return Clients.OthersInGroup(state.Map).SendAsync("PlayerMoved", state);
    }

    // Clients send this when their health, max health or weapon level changes.
    public Task UpdateStats(int health, int maxHealth, int weaponLevel)
    {
        var current = players.Get(Context.ConnectionId);
        if (current is null)
        {
            return Task.CompletedTask;
        }

        maxHealth = Math.Clamp(maxHealth, 1, MaxHealthLimit);
        var state = current with
        {
            Health = Math.Clamp(health, 0, maxHealth),
            MaxHealth = maxHealth,
            WeaponLevel = Math.Max(1, weaponLevel),
        };
        players.Set(state);
        return Clients.OthersInGroup(state.Map)
            .SendAsync("PlayerStats", state.ConnectionId, state.Health, state.MaxHealth, state.WeaponLevel);
    }

    // The attacker's client calls this when its sword swing lands on another knight.
    // The server checks the hit, then the target's client applies the damage.
    public async Task Attack(string targetConnectionId, int damage)
    {
        var attacker = players.Get(Context.ConnectionId);
        var target = players.Get(targetConnectionId);
        if (attacker is null || target is null || attacker.ConnectionId == target.ConnectionId)
        {
            return;
        }

        var distance = MathF.Sqrt(MathF.Pow(attacker.X - target.X, 2) + MathF.Pow(attacker.Z - target.Z, 2));
        var valid = attacker.Map == target.Map
            && attacker.Health > 0
            && target.Health > 0
            && distance <= MaxHitDistance
            && players.TryStartAttack(attacker.ConnectionId, MinAttackInterval);
        if (!valid)
        {
            return;
        }

        await Clients.Group(attacker.Map).SendAsync("PlayerAttacked", attacker.ConnectionId, target.ConnectionId);
        await Clients.Client(target.ConnectionId)
            .SendAsync("TakeDamage", Math.Clamp(damage, 0, MaxDamage), attacker.ConnectionId, attacker.Username);
    }

    // The victim's client calls this when another knight's hit killed it, with the loot it dropped.
    public async Task ReportKilled(string killerConnectionId, int gold, int spices)
    {
        var victim = players.Get(Context.ConnectionId);
        var killer = players.Get(killerConnectionId);
        if (victim is null || killer is null)
        {
            return;
        }

        await Clients.Client(killer.ConnectionId)
            .SendAsync("Loot", Math.Max(0, gold), Math.Max(0, spices), victim.Username);
        await Clients.Group(victim.Map).SendAsync("PlayerKilled", killer.Username, victim.Username);
        logger.LogInformation("{Killer} defeated {Victim}", killer.Username, victim.Username);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var state = players.Remove(Context.ConnectionId);
        if (state is not null)
        {
            await Clients.Group(state.Map).SendAsync("PlayerLeft", Context.ConnectionId);
        }

        logger.LogInformation("{Username} disconnected ({ConnectionId})", Username, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
