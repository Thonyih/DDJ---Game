using System.Security.Claims;
using System.Text.RegularExpressions;
using GameServer.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GameServer.Hubs;

// Real-time player sync. Each map (A-L) is a SignalR group, so players only
// receive updates from players on the same map.
//
// Client -> server: JoinMap, UpdatePosition
// Server -> client: PlayersInMap, PlayerJoined, PlayerMoved, PlayerLeft
[Authorize]
public partial class GameHub(PlayerRegistry players, ILogger<GameHub> logger) : Hub
{
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

        var state = new PlayerState(Context.ConnectionId, UserId, Username, map, x, z, rotation);
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
