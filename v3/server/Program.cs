using System.Text;
using GameServer;
using GameServer.Auth;
using GameServer.Data;
using GameServer.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGameOpenApi();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// JWT authentication
var jwtSection = builder.Configuration.GetSection(JwtOptions.Section);
var jwt = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
if (Encoding.UTF8.GetByteCount(jwt.Key) < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes (set it in appsettings or the Jwt__Key environment variable).");
}
builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddSingleton<TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            NameClaimType = ClaimNames.Name,
            RoleClaimType = ClaimNames.Role,
        };

        // Browsers can't send headers on WebSocket requests, so SignalR passes the token in the query string.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

// Real-time
builder.Services.AddSignalR();
builder.Services.AddSingleton<PlayerRegistry>();

// The game client runs on another origin (Vite dev server or GitHub Pages).
// In development, games served from this machine or the local network are allowed on any port
// (Vite picks the next free port, and LAN players open the game via this machine's IP).
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var allowLocalNetwork = builder.Environment.IsDevelopment();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .SetIsOriginAllowed(origin =>
        allowedOrigins.Contains(origin) || (allowLocalNetwork && LocalNetwork.IsLocalOrigin(origin)))
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

await DatabaseSetup.InitializeAsync(app);

// Swagger UI at /swagger (development only).
if (app.Environment.IsDevelopment())
{
    app.UseGameOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapHub<GameHub>("/hubs/game");

app.Run();
