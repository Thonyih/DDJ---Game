using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GameServer.Data;

public class AdminOptions
{
    public const string Section = "Admin";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public static class DatabaseSetup
{
    // Creates the SQLite database and the admin account on startup.
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        // Simple schema creation; switch to EF Core migrations once the schema starts changing.
        await db.Database.EnsureCreatedAsync();

        if (await db.Users.AnyAsync(u => u.Role == Roles.Admin))
        {
            return;
        }

        var admin = app.Configuration.GetSection(AdminOptions.Section).Get<AdminOptions>();
        if (string.IsNullOrWhiteSpace(admin?.Username) || string.IsNullOrWhiteSpace(admin.Password))
        {
            app.Logger.LogWarning("No admin account exists and Admin:Username / Admin:Password are not configured.");
            return;
        }

        var user = new User { Username = admin.Username, Role = Roles.Admin };
        user.PasswordHash = hasher.HashPassword(user, admin.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        app.Logger.LogInformation("Created admin account '{Username}'.", user.Username);
    }
}
