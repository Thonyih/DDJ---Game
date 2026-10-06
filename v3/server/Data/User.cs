namespace GameServer.Data;

public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }

    // Null for players, who register with just a username.
    public string? PasswordHash { get; set; }

    public string Role { get; set; } = Roles.Player;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class Roles
{
    public const string Player = "Player";
    public const string Admin = "Admin";
}
