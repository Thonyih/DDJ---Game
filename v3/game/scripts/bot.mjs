// Fake player for testing multiplayer with a single browser window.
// Usage: npm run bot -- [name] [map]     e.g. npm run bot -- Sentinel A
import * as signalR from '@microsoft/signalr';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:5080';
const name = process.argv[2] ?? `Bot_${Math.floor(Math.random() * 1000)}`;
const map = process.argv[3] ?? 'A';
const RADIUS = 6;
const SPEED = 0.5; // radians per second around the circle
const SEND_INTERVAL_MS = 100;
const MAX_HEALTH = 100;
let health = MAX_HEALTH;
let angle = 0; // position on the circle the bot walks

const response = await fetch(`${SERVER_URL}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: name }),
});
const body = await response.json();
if (!response.ok) {
  console.error('Register failed:', body.error ?? response.status);
  process.exit(1);
}

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${SERVER_URL}/hubs/game`, { accessTokenFactory: () => body.token })
  .configureLogging(signalR.LogLevel.Warning)
  .build();

connection.on('PlayersInMap', (players) => console.log(`On map ${map} with:`, players.map((p) => p.username)));
connection.on('PlayerJoined', (p) => console.log(`${p.username} joined`));
connection.on('PlayerLeft', () => console.log('A player left'));
connection.on('PlayerMoved', () => {}); // the bot doesn't need other players' positions
connection.on('PlayerStats', () => {});
connection.on('PlayerAttacked', () => {});
connection.on('PlayerKilled', (killer, victim) => console.log(`${killer} defeated ${victim}`));

// The bot can be attacked: it loses health, and when it dies it reports the kill (no loot) and respawns.
connection.on('TakeDamage', (damage, attackerId, attackerName) => {
  health = Math.max(0, health - damage);
  console.log(`Hit by ${attackerName} for ${damage} (HP ${health}/${MAX_HEALTH})`);
  if (health > 0) {
    connection.send('UpdateStats', health, MAX_HEALTH, 1);
    return;
  }
  connection.send('ReportKilled', attackerId, 0, 0);
  health = MAX_HEALTH;
  angle += Math.PI; // respawn on the other side of the circle
  connection.send('UpdateStats', health, MAX_HEALTH, 1);
});

await connection.start();

// Walk in a circle around the map centre, facing the direction of travel.
const position = () => ({
  x: Math.cos(angle) * RADIUS,
  z: Math.sin(angle) * RADIUS,
  rotation: Math.atan2(-Math.sin(angle), Math.cos(angle)),
});

const start = position();
await connection.invoke('JoinMap', map, start.x, start.z, start.rotation);
console.log(`${name} is walking on map ${map}. Ctrl+C to stop.`);

setInterval(() => {
  angle += SPEED * (SEND_INTERVAL_MS / 1000);
  const p = position();
  connection.send('UpdatePosition', p.x, p.z, p.rotation);
}, SEND_INTERVAL_MS);

process.on('SIGINT', async () => {
  await connection.stop();
  process.exit(0);
});
