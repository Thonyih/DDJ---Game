using System.Security.Claims;
using System.Text.RegularExpressions;
using GameServer.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GameServer.Auth;

public record RegisterRequest(string Username);
public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, string Username, string Role);
public record ErrorResponse(string Error);
public record MeResponse(string? Id, string? Username, string? Role);
public record UserSummary(int Id, string Username, string Role, DateTime CreatedAt);

public static partial class AuthEndpoints
{
    [GeneratedRegex("^[A-Za-z0-9_]{3,20}$")]
    private static partial Regex UsernamePattern();

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/auth").WithTags("Auth");

        auth.MapPost("/register", Register)
            .WithSummary("Register a player")
            .WithDescription("Creates a player account with just a username (3-20 letters, digits or underscores) and returns a JWT.")
            .Produces<AuthResponse>()
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict);

        auth.MapPost("/login", Login)
            .WithSummary("Log in with a password")
            .WithDescription("For accounts that have a password (currently only the admin). Returns a JWT.")
            .Produces<AuthResponse>()
            .Produces(StatusCodes.Status401Unauthorized);

        auth.MapGet("/me", Me)
            .WithSummary("Current user")
            .WithDescription("Returns the user the JWT belongs to.")
            .Produces<MeResponse>()
            .Produces(StatusCodes.Status401Unauthorized)
            .RequireAuthorization();

        app.MapGet("/admin/users", ListUsers)
            .WithTags("Admin")
            .WithSummary("List all users")
            .WithDescription("Admin only.")
            .Produces<List<UserSummary>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .RequireAuthorization(policy => policy.RequireRole(Roles.Admin));
    }

    // Players join with just a username, no password.
    private static async Task<IResult> Register(RegisterRequest request, AppDbContext db, TokenService tokens)
    {
        var username = request.Username?.Trim() ?? "";
        if (!UsernamePattern().IsMatch(username))
        {
            return Results.BadRequest(new ErrorResponse("Username must be 3-20 letters, digits or underscores."));
        }
        if (await db.Users.AnyAsync(u => u.Username == username))
        {
            return Results.Conflict(new ErrorResponse("Username is already taken."));
        }

        var user = new User { Username = username };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Results.Ok(new AuthResponse(tokens.CreateToken(user), user.Username, user.Role));
    }

    // For accounts that have a password (currently only the admin).
    private static async Task<IResult> Login(
        LoginRequest request, AppDbContext db, TokenService tokens, IPasswordHasher<User> hasher)
    {
        if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
        {
            return Results.Unauthorized();
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user?.PasswordHash is null
            || hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new AuthResponse(tokens.CreateToken(user), user.Username, user.Role));
    }

    private static IResult Me(ClaimsPrincipal user) => Results.Ok(new MeResponse(
        user.FindFirstValue(ClaimNames.UserId),
        user.Identity?.Name,
        user.FindFirstValue(ClaimNames.Role)));

    private static async Task<IResult> ListUsers(AppDbContext db) => Results.Ok(
        await db.Users.Select(u => new UserSummary(u.Id, u.Username, u.Role, u.CreatedAt)).ToListAsync());
}
