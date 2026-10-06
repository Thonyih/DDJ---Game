using System.Collections.Concurrent;

namespace GameServer.Hubs;

public record PlayerState(
    string ConnectionId,
    string UserId,
    string Username,
    string Map,
    float X,
    float Z,
    float Rotation);

// Latest known state of every connected player. In memory only; cleared on restart.
public class PlayerRegistry
{
    private readonly ConcurrentDictionary<string, PlayerState> players = new();

    public void Set(PlayerState state) => players[state.ConnectionId] = state;

    public PlayerState? Get(string connectionId) =>
        players.TryGetValue(connectionId, out var state) ? state : null;

    public PlayerState? Remove(string connectionId) =>
        players.TryRemove(connectionId, out var state) ? state : null;

    public List<PlayerState> InMap(string map, string exceptConnectionId) =>
        players.Values.Where(p => p.Map == map && p.ConnectionId != exceptConnectionId).ToList();
}
