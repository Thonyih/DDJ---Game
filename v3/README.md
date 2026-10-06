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
The server URL defaults to `http://localhost:5080` (override with `VITE_SERVER_URL` in `game/.env`).

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
| server → client | `PlayersInMap` | Everyone already on the map (sent to the joiner) |
| server → client | `PlayerJoined` / `PlayerMoved` | A player's state |
| server → client | `PlayerLeft` | The connection id that left |

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
