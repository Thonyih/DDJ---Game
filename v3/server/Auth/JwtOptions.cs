namespace GameServer.Auth;

public class JwtOptions
{
    public const string Section = "Jwt";
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";
    public int ExpiryMinutes { get; set; } = 120;
}

// Claim names written into the token and read back by the server.
public static class ClaimNames
{
    public const string UserId = "sub";
    public const string Name = "name";
    public const string Role = "role";
}
