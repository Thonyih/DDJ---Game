// Fake player for testing multiplayer with a single browser window.
// Usage: npm run bot -- [name] [map]     e.g. npm run bot -- Sentinel A
import * as signalR from '@microsoft/signalr';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:5080';
const name = process.argv[2] ?? `Bot_${Math.floor(Math.random() * 1000)}`;
const map = process.argv[3] ?? 'A';
const RADIUS = 6;
const SPEED = 0.5; // radians per second around the circle
const SEND_INTERVAL_MS = 100;

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

await connection.start();

// Walk in a circle around the map centre, facing the direction of travel.
let angle = 0;
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
