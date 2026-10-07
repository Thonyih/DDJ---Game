using System.Collections.Concurrent;

namespace GameServer.Hubs;

public record PlayerState(
    string ConnectionId,
    string UserId,
    string Username,
    string Map,
    float X,
    float Z,
    float Rotation,
    int Health = 100,
    int MaxHealth = 100,
    int WeaponLevel = 1);

// Latest known state of every connected player. In memory only; cleared on restart.
public class PlayerRegistry
{
    private readonly ConcurrentDictionary<string, PlayerState> players = new();
    private readonly ConcurrentDictionary<string, DateTime> lastAttackAt = new();

    public void Set(PlayerState state) => players[state.ConnectionId] = state;

    public PlayerState? Get(string connectionId) =>
        players.TryGetValue(connectionId, out var state) ? state : null;

    public PlayerState? Remove(string connectionId)
    {
        lastAttackAt.TryRemove(connectionId, out _);
        return players.TryRemove(connectionId, out var state) ? state : null;
    }

    public List<PlayerState> InMap(string map, string exceptConnectionId) =>
        players.Values.Where(p => p.Map == map && p.ConnectionId != exceptConnectionId).ToList();

    // Rate limit for attacks: false if this player attacked less than minInterval ago.
    public bool TryStartAttack(string connectionId, TimeSpan minInterval)
    {
        var now = DateTime.UtcNow;
        if (lastAttackAt.TryGetValue(connectionId, out var last) && now - last < minInterval)
        {
            return false;
        }
        lastAttackAt[connectionId] = now;
        return true;
    }
}
