using System.Security.Claims;
using System.Text;
using GameServer.Data;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GameServer.Auth;

public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JsonWebTokenHandler handler = new();

    public string CreateToken(User user)
    {
        var jwt = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));

        return handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            Expires = DateTime.UtcNow.AddMinutes(jwt.ExpiryMinutes),
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimNames.UserId, user.Id.ToString()),
                new Claim(ClaimNames.Name, user.Username),
                new Claim(ClaimNames.Role, user.Role),
            ]),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        });
    }
}
