# v3 — Game + Server

- `game/` — the v2 game client, connected to the server (login + live player positions).
- `server/` — .NET 10 Web API: JWT auth, SQLite, SignalR hub for real-time player sync.

## Run the server

```bash
cd server
dotnet run
```

Runs on http://localhost:5080. On first start it creates `game.db` (SQLite) and the admin account
from `appsettings.Development.json`.

API docs (development only):
- Swagger UI: http://localhost:5080/swagger — use **Authorize** with a token from register/login.
- OpenAPI JSON: http://localhost:5080/openapi/v1.json

## Run the game

```bash
cd game
npm install
npm run dev
```

## Test multiplayer (two clients)

1. Start the server (`cd server && dotnet run`).
2. Start the game (`cd game && npm run dev`).
3. Open the game in **two separate browser windows** side by side (not two tabs: background tabs pause the game loop).
4. Enter a different name in each. Each window shows the other player as a teal knight with a name label (also a teal dot on the minimap).

Only one window? Add a fake player that walks in a circle on map A:

```bash
cd game
npm run bot -- Sentinel A     # name and map are optional
```

Positions are sent about 10× per second while moving. Players only see others on the same map.
The game connects to the server on the same host it was opened from, port 5080 (override with `VITE_SERVER_URL` in `game/.env`).

## LAN multiplayer (players on the same network)

On the host computer:

```bash
cd server && dotnet run                        # server reachable from other computers
cd game && npm run dev                         # prints the link to share with other players
```

Everyone (host included) opens the link printed under **"Multiplayer — players on this network open"**
(`http://<host-ip>:5173`) and enters a name. The game automatically
connects to the server on the same host (`<host-ip>:5080`).

- macOS may ask to allow incoming connections for `dotnet` and `node`: click **Allow**.
- Some networks (e.g. university Wi-Fi like eduroam, or guest networks) block devices from talking
  to each other. If friends can't open the page, try a phone hotspot or a home router.

## Auth (JWT)

| Endpoint | Body | Notes |
|---|---|---|
| `POST /auth/register` | `{ "username": "Knight_1" }` | Players: username only (3–20 letters, digits, `_`). Returns a token. 409 if taken. |
| `POST /auth/login` | `{ "username": "admin", "password": "..." }` | Accounts with a password (the admin). |
| `GET /auth/me` | — | Requires `Authorization: Bearer <token>`. |
| `GET /admin/users` | — | Admin token only. |

Tokens last 120 minutes. Example requests are in `server/GameServer.http`.

## Real-time (SignalR)

Hub: `/hubs/game`. Requires the JWT (the JS client sends it via `accessTokenFactory`).
Each map (A–L) is a group; players only receive updates from their own map.

| Direction | Message | Payload |
|---|---|---|
| client → server | `JoinMap(map, x, z, rotation)` | On connect and after travelling |
| client → server | `UpdatePosition(x, z, rotation)` | About 10× per second while moving |
| client → server | `UpdateStats(health, maxHealth, weaponLevel)` | When any of them changes |
| client → server | `Attack(targetId, damage)` | Sword hit on another knight; server checks map, range, rate, alive |
| client → server | `ReportKilled(killerId, gold, spices)` | Victim reports its death and the loot it dropped |
| server → client | `PlayersInMap` | Everyone already on the map (sent to the joiner) |
| server → client | `PlayerJoined` / `PlayerMoved` | A player's state (position, health, weapon level) |
| server → client | `PlayerLeft` | The connection id that left |
| server → client | `PlayerStats` | A player's health / max health / weapon level |
| server → client | `PlayerAttacked(attackerId, targetId)` | Accepted hit: play swing and hit flash |
| server → client | `TakeDamage(damage, attackerId, attackerName)` | Only to the target |
| server → client | `PlayerKilled(killerName, victimName)` | Everyone on the map |
| server → client | `Loot(gold, spices, victimName)` | Only to the killer |

**PvP:** right-click another knight to target it; you auto-attack within 2.5 units using your sword
damage. The defeated knight respawns at the map centre and drops 25% of its gold and spices to the
killer. Damage and loot amounts come from the clients (the server caps damage at 100) until
upgrades and resources are stored on the server. Bots can be attacked too.

Client example:

```ts
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5080/hubs/game', { accessTokenFactory: () => token })
  .withAutomaticReconnect()
  .build();

connection.on('PlayerMoved', (player) => { /* move that player's mesh */ });
await connection.start();
await connection.invoke('JoinMap', 'A', 0, 0, 0);
```

## Configuration

`appsettings.Development.json` holds a dev-only JWT key and admin password. For any real
deployment set them with environment variables instead: `Jwt__Key` (32+ characters),
`Admin__Username`, `Admin__Password`. Allowed client origins are in `appsettings.json` → `Cors`.

The database schema is created with `EnsureCreated`; delete `game.db` to reset it. Switch to EF Core
migrations once the schema starts changing.
