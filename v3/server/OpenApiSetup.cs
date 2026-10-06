using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace GameServer;

public static class OpenApiSetup
{
    private const string BearerScheme = "Bearer";

    // The SignalR hub can't be described by OpenAPI, so it is documented in the description.
    private const string Description = """
        REST API for the game prototype: player registration, admin login and JWT-protected endpoints.

        **Authorize:** call `POST /auth/register` or `POST /auth/login`, copy the `token`,
        click **Authorize** and paste it (without the `Bearer ` prefix).

        **Real-time (SignalR):** hub at `/hubs/game`, requires the JWT
        (the JS client sends it with `accessTokenFactory`). Each map A-L is a group.
        - Client → server: `JoinMap(map, x, z, rotation)`, `UpdatePosition(x, z, rotation)`
        - Server → client: `PlayersInMap`, `PlayerJoined`, `PlayerMoved`, `PlayerLeft`
        """;

    public static void AddGameOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Game Server API",
                    Version = "v1",
                    Description = Description,
                };

                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT from /auth/register or /auth/login.",
                };
                return Task.CompletedTask;
            });

            // Only endpoints that require authorization get the lock icon in Swagger UI.
            options.AddOperationTransformer((operation, context, _) =>
            {
                var requiresAuth = context.Description.ActionDescriptor.EndpointMetadata
                    .OfType<IAuthorizeData>()
                    .Any();
                if (requiresAuth)
                {
                    operation.Security ??= [];
                    operation.Security.Add(new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecuritySchemeReference(BearerScheme, context.Document)] = [],
                    });
                }
                return Task.CompletedTask;
            });
        });
    }

    public static void UseGameOpenApi(this WebApplication app)
    {
        app.MapOpenApi(); // /openapi/v1.json
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "Game Server API v1");
            options.DocumentTitle = "Game Server API";
        }); // /swagger
    }
}
