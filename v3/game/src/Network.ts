import * as signalR from '@microsoft/signalr';

// The server is expected on the same machine that served the game page, so LAN players who open
// http://<host-ip>:5173 reach the server at <host-ip>:5080. Override with VITE_SERVER_URL in a .env file.
export const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:5080`;

const SEND_INTERVAL = 0.1; // seconds -> about 10 position updates per second
const MIN_MOVE = 0.01; // ignore tiny changes so a standing player sends nothing

// Same shape as the server's PlayerState.
export interface RemotePlayerState {
  connectionId: string;
  userId: string;
  username: string;
  map: string;
  x: number;
  z: number;
  rotation: number;
  health: number;
  maxHealth: number;
  weaponLevel: number;
}

export interface NetworkEvents {
  onPlayersInMap: (players: RemotePlayerState[]) => void;
  onPlayerJoined: (player: RemotePlayerState) => void;
  onPlayerMoved: (player: RemotePlayerState) => void;
  onPlayerLeft: (connectionId: string) => void;
  onPlayerStats: (connectionId: string, health: number, maxHealth: number, weaponLevel: number) => void;
  // A hit the server accepted: everyone on the map plays the swing and the hit flash.
  onPlayerAttacked: (attackerId: string, targetId: string) => void;
  // Sent only to the knight that was hit.
  onTakeDamage: (damage: number, attackerId: string, attackerName: string) => void;
  onPlayerKilled: (killerName: string, victimName: string) => void;
  // Sent only to the killer: what the victim dropped.
  onLoot: (gold: number, spices: number, victimName: string) => void;
  // The server forgets players on disconnect, so the game must join its map again.
  onReconnected: () => void;
}

// Registers a player with just a username and returns the JWT.
export async function register(username: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
  } catch {
    throw new Error(`Can't reach the server at ${SERVER_URL}`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Register failed (${response.status})`);
  }
  return body.token;
}

export class Network {
  private readonly connection: signalR.HubConnection;
  private sendTimer = 0;
  private lastSent = { x: Number.NaN, z: Number.NaN, rotation: Number.NaN };
  private lastStats = '';

  constructor(token: string, events: NetworkEvents) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SERVER_URL}/hubs/game`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('PlayersInMap', events.onPlayersInMap);
    this.connection.on('PlayerJoined', events.onPlayerJoined);
    this.connection.on('PlayerMoved', events.onPlayerMoved);
    this.connection.on('PlayerLeft', events.onPlayerLeft);
    this.connection.on('PlayerStats', events.onPlayerStats);
    this.connection.on('PlayerAttacked', events.onPlayerAttacked);
    this.connection.on('TakeDamage', events.onTakeDamage);
    this.connection.on('PlayerKilled', events.onPlayerKilled);
    this.connection.on('Loot', events.onLoot);
    this.connection.onreconnected(() => events.onReconnected());
  }

  get isConnected(): boolean {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }

  async start(): Promise<void> {
    await this.connection.start();
  }

  async joinMap(map: string, x: number, z: number, rotation: number): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    this.lastSent = { x, z, rotation };
    this.lastStats = ''; // send stats again after joining
    await this.connection.invoke('JoinMap', map, x, z, rotation);
  }

  // Sends health, max health and weapon level, only when one of them changed.
  updateStats(health: number, maxHealth: number, weaponLevel: number): void {
    const stats = `${health}/${maxHealth}/${weaponLevel}`;
    if (!this.isConnected || stats === this.lastStats) {
      return;
    }
    this.lastStats = stats;
    void this.connection.send('UpdateStats', health, maxHealth, weaponLevel);
  }

  attack(targetConnectionId: string, damage: number): void {
    if (this.isConnected) {
      void this.connection.send('Attack', targetConnectionId, damage);
    }
  }

  reportKilled(killerConnectionId: string, gold: number, spices: number): void {
    if (this.isConnected) {
      void this.connection.send('ReportKilled', killerConnectionId, gold, spices);
    }
  }

  // Called every frame; sends at most 10 times per second and only after moving or turning.
  update(delta: number, x: number, z: number, rotation: number): void {
    this.sendTimer -= delta;
    if (!this.isConnected || this.sendTimer > 0) {
      return;
    }

    const moved =
      Math.abs(x - this.lastSent.x) > MIN_MOVE ||
      Math.abs(z - this.lastSent.z) > MIN_MOVE ||
      Math.abs(rotation - this.lastSent.rotation) > MIN_MOVE;
    if (!moved) {
      return;
    }

    this.sendTimer = SEND_INTERVAL;
    this.lastSent = { x, z, rotation };
    void this.connection.send('UpdatePosition', x, z, rotation);
  }
}
