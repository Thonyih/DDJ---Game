import * as THREE from 'three';
import { Chest } from './Chest';
import { Enemy } from './Enemy';
import { Input } from './Input';
import { DIRECTION_STEPS, hasMap, mapLetter, mapName, type Direction } from './Maps';
import { Minimap } from './Minimap';
import { formatReward, type Mission } from './Missions';
import { flatDistance } from './Movement';
import { Network, type RemotePlayerState } from './Network';
import { Player } from './Player';
import { RemotePlayer } from './RemotePlayer';
import { addReward } from './PlayerData';
import { UI, type MapExit } from './UI';
import { AREA_HALF_SIZE, World } from './World';

const VIEW_SIZE = 18;
const CAMERA_OFFSET = new THREE.Vector3(12, 12, 12);
const CLICK_EFFECT_TIME = 0.5;
const ENEMY_SPAWN_DISTANCE = 10;
const MAX_CHESTS = 3;
const CHEST_RESPAWN_TIME = 30;
const CHEST_OPEN_RANGE = 2.5;
const CHEST_MIN_SPAWN_DISTANCE = 8;
const TOO_FAR_MESSAGE_MS = 1200;
const POTION_HEAL = 30;
const BORDER_ZONE = 1.5;
const ARRIVAL_INSET = 4;

const EFFECT_COLOR = {
  move: 0x00ff00,
  enemy: 0xff2a2a,
  chest: 0xffc65a,
  nothing: 0x9a9a9a,
};

// Chests of a map the player has left, restored when they come back.
interface SavedMap {
  chests: Chest[];
  respawnTimers: number[];
}

interface ClickEffect {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  size: number;
  age: number;
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly input: Input;
  private readonly world: World;
  private readonly player: Player;
  private readonly ui: UI;
  private readonly minimap: Minimap;
  private readonly targetMarker: THREE.Mesh;
  private readonly effectGeometry = new THREE.RingGeometry(0.5, 0.7, 32);

  private mission: Mission | null = null;
  private enemies: Enemy[] = [];
  private chests: Chest[] = [];
  private chestRespawnTimers: number[] = [];
  private defeated = 0;
  private effects: ClickEffect[] = [];
  private mapColumn = 0;
  private mapRow = 0;
  private readonly savedMaps = new Map<string, SavedMap>();
  private borderDirection: Direction | null = null;
  private promptDismissed = false;
  private network: Network | null = null;
  private readonly remotePlayers = new Map<string, RemotePlayer>();

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Isometric view: orthographic camera at a fixed angle that follows the player.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.updateCameraFrustum();

    this.createLights();
    this.world = new World(this.scene);

    this.player = new Player();
    this.scene.add(this.player.mesh);

    for (let i = 0; i < MAX_CHESTS; i++) {
      this.spawnChest();
    }

    this.targetMarker = new THREE.Mesh(
      this.effectGeometry,
      new THREE.MeshBasicMaterial({ color: EFFECT_COLOR.enemy }),
    );
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.visible = false;
    this.scene.add(this.targetMarker);

    this.input = new Input(canvas);
    this.minimap = new Minimap(minimapCanvas);
    this.ui = new UI({
      onStartMission: (mission) => this.startMission(mission),
      onTravel: () => this.travel(),
      onStayAtBorder: () => {
        this.promptDismissed = true;
        this.ui.hideTravelPrompt();
      },
    });
    this.ui.setCurrentMap(this.mapColumn, this.mapRow, this.getExits());

    window.addEventListener('resize', () => this.onResize());
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // Connects to the multiplayer server. Until then (or without it) the game runs offline.
  async connect(token: string, username: string): Promise<void> {
    const network = new Network(token, {
      onPlayersInMap: (players) => {
        this.clearRemotePlayers();
        players.forEach((player) => this.upsertRemotePlayer(player));
      },
      onPlayerJoined: (player) => this.upsertRemotePlayer(player),
      onPlayerMoved: (player) => this.upsertRemotePlayer(player),
      onPlayerLeft: (connectionId) => this.removeRemotePlayer(connectionId),
      onReconnected: () => void this.joinCurrentMap(),
    });
    await network.start();
    this.network = network;
    await this.joinCurrentMap();
    this.player.setName(username);
    this.ui.showMessage(`Connected as ${username}`);
  }

  private tick(): void {
    // Clamped so a long pause (e.g. switching tabs) doesn't cause a huge jump.
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.handleClick();
    this.player.update(delta, this.world);
    this.network?.update(delta, this.player.position.x, this.player.position.z, this.player.facing);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player, this.world);
    }
    this.removeDefeatedEnemies();
    this.updateChests(delta);
    this.updateBorderPrompt();

    if (this.player.isDead) {
      this.handleDeath();
    } else if (this.mission && this.defeated >= this.mission.enemyCount) {
      this.completeMission(this.mission);
    }

    this.updateCamera();
    for (const enemy of this.enemies) {
      enemy.updateHealthBar(this.camera);
    }
    for (const chest of this.chests) {
      chest.updateGlow(this.clock.elapsedTime);
    }
    this.player.updateNameLabel(this.camera);
    for (const remote of this.remotePlayers.values()) {
      remote.update(delta, this.camera);
    }
    this.updateTargetMarker();
    this.updateEffects(delta);
    this.ui.updateHud(this.player, this.defeated);
    const exitDirections = this.getExits().map((exit) => exit.direction);
    const others = [...this.remotePlayers.values()].map((remote) => remote.position);
    this.minimap.draw(this.world, this.player, this.enemies, others, exitDirections);
    this.renderer.render(this.scene, this.camera);
  }

  private handleClick(): void {
    const click = this.input.consumeClick();
    if (!click) {
      return;
    }

    this.raycaster.setFromCamera(click.position, this.camera);

    if (click.button === 'right') {
      this.handleRightClick();
    } else {
      this.handleLeftClick();
    }
  }

  // Right click: target an enemy or open a chest. Never moves the player.
  private handleRightClick(): void {
    const enemyHits = this.raycaster.intersectObjects(this.enemies.map((enemy) => enemy.mesh), false);
    const enemy = this.enemies.find((item) => item.mesh === enemyHits[0]?.object);
    if (enemy) {
      this.player.attack(enemy);
      this.spawnEffect(enemy.position, EFFECT_COLOR.enemy, 1.3);
      if (!this.player.isInAttackRange(enemy)) {
        this.ui.showMessage('Too far away', TOO_FAR_MESSAGE_MS);
      }
      return;
    }

    const chestHits = this.raycaster.intersectObjects(this.chests.map((chest) => chest.mesh), true);
    const chest = this.chests.find((item) => chestHits.length > 0 && item.owns(chestHits[0].object));
    if (chest) {
      this.spawnEffect(chest.position, EFFECT_COLOR.chest, 1.3);
      if (flatDistance(this.player.position, chest.position) <= CHEST_OPEN_RANGE) {
        this.openChest(chest);
      } else {
        this.ui.showMessage('Too far away', TOO_FAR_MESSAGE_MS);
      }
      return;
    }

    const groundHits = this.raycaster.intersectObject(this.world.ground, false);
    if (groundHits.length > 0) {
      this.spawnEffect(groundHits[0].point, EFFECT_COLOR.nothing, 0.6);
    }
  }

  // Left click: move to a point on the ground.
  private handleLeftClick(): void {
    const groundHits = this.raycaster.intersectObject(this.world.ground, false);
    if (groundHits.length > 0) {
      const point = groundHits[0].point;
      this.player.moveTo(point);
      this.spawnEffect(point, EFFECT_COLOR.move, 1);
    }
  }

  // A ring on the ground that grows and fades out.
  private spawnEffect(position: THREE.Vector3, color: number, size: number): void {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(this.effectGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.03, position.z);
    mesh.scale.setScalar(size);
    this.scene.add(mesh);
    this.effects.push({ mesh, material, size, age: 0 });
  }

  private updateEffects(delta: number): void {
    for (const effect of this.effects) {
      effect.age += delta;
      const progress = Math.min(effect.age / CLICK_EFFECT_TIME, 1);
      effect.mesh.scale.setScalar(effect.size * (0.6 + 0.8 * progress));
      effect.material.opacity = 1 - progress;
      if (progress >= 1) {
        this.scene.remove(effect.mesh);
        effect.material.dispose();
      }
    }
    this.effects = this.effects.filter((effect) => effect.age < CLICK_EFFECT_TIME);
  }

  private removeDefeatedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        this.scene.remove(enemy.mesh);
        this.defeated += 1;
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.isDead);
  }

  private updateChests(delta: number): void {
    // Each opened chest leaves a timer; when it runs out a new chest appears.
    this.chestRespawnTimers = this.chestRespawnTimers.map((time) => time - delta);
    while (this.chestRespawnTimers.length > 0 && this.chestRespawnTimers[0] <= 0) {
      this.chestRespawnTimers.shift();
      this.spawnChest();
    }
  }

  private openChest(chest: Chest): void {
    addReward(chest.reward);
    this.scene.remove(chest.mesh);
    this.chests = this.chests.filter((item) => item !== chest);
    this.chestRespawnTimers.push(CHEST_RESPAWN_TIME);
    this.ui.refreshInventory();
    const healed = this.player.heal(POTION_HEAL);
    this.ui.showMessage(`Chest opened! ${formatReward(chest.reward)}, potion +${healed} HP`);
  }

  private spawnChest(): void {
    if (this.chests.length >= MAX_CHESTS) {
      return;
    }
    const position = this.world.randomFreePosition(this.player.position, CHEST_MIN_SPAWN_DISTANCE);
    const chest = new Chest(position);
    this.chests.push(chest);
    this.scene.add(chest.mesh);
  }

  // Neighbouring maps the player can travel to from the current one.
  private getExits(): MapExit[] {
    const exits: MapExit[] = [];
    for (const direction of Object.keys(DIRECTION_STEPS) as Direction[]) {
      const step = DIRECTION_STEPS[direction];
      const column = this.mapColumn + step.column;
      const row = this.mapRow + step.row;
      if (hasMap(column, row)) {
        exits.push({ direction, letter: mapLetter(column, row), name: mapName(column, row) });
      }
    }
    return exits;
  }

  // The border the player is standing at, if there is a map beyond it.
  private findBorderDirection(): Direction | null {
    const position = this.player.position;
    const edge = AREA_HALF_SIZE - BORDER_ZONE;
    const touching: Direction[] = [];
    if (position.z < -edge) touching.push('north');
    if (position.z > edge) touching.push('south');
    if (position.x > edge) touching.push('east');
    if (position.x < -edge) touching.push('west');

    const exitDirections = this.getExits().map((exit) => exit.direction);
    return touching.find((direction) => exitDirections.includes(direction)) ?? null;
  }

  private updateBorderPrompt(): void {
    const direction = this.findBorderDirection();
    if (direction !== this.borderDirection) {
      this.borderDirection = direction;
      this.promptDismissed = false;
    }

    if (!direction || this.promptDismissed) {
      this.ui.hideTravelPrompt();
      return;
    }

    const step = DIRECTION_STEPS[direction];
    const name = mapName(this.mapColumn + step.column, this.mapRow + step.row);
    if (this.mission) {
      this.ui.showTravelPrompt(`Finish your mission before traveling to ${name}`, false);
    } else {
      this.ui.showTravelPrompt(`Travel ${direction} to ${name}?`, true);
    }
  }

  private travel(): void {
    const direction = this.borderDirection;
    if (!direction || this.mission) {
      return;
    }

    // Leave the current map, keeping its chests for when the player comes back.
    for (const chest of this.chests) {
      this.scene.remove(chest.mesh);
    }
    this.savedMaps.set(mapLetter(this.mapColumn, this.mapRow), {
      chests: this.chests,
      respawnTimers: this.chestRespawnTimers,
    });

    const step = DIRECTION_STEPS[direction];
    this.mapColumn += step.column;
    this.mapRow += step.row;

    // Arrive on the opposite side of the new map.
    const arrival = AREA_HALF_SIZE - ARRIVAL_INSET;
    let x = this.player.position.x;
    let z = this.player.position.z;
    if (direction === 'north') z = arrival;
    if (direction === 'south') z = -arrival;
    if (direction === 'east') x = -arrival;
    if (direction === 'west') x = arrival;
    this.player.teleport(x, z);

    const letter = mapLetter(this.mapColumn, this.mapRow);
    const saved = this.savedMaps.get(letter);
    if (saved) {
      this.chests = saved.chests;
      this.chestRespawnTimers = saved.respawnTimers;
      for (const chest of this.chests) {
        this.scene.add(chest.mesh);
      }
    } else {
      this.chests = [];
      this.chestRespawnTimers = [];
      for (let i = 0; i < MAX_CHESTS; i++) {
        this.spawnChest();
      }
    }

    this.borderDirection = null;
    this.ui.hideTravelPrompt();
    this.ui.setCurrentMap(this.mapColumn, this.mapRow, this.getExits());
    this.ui.showMessage(mapName(this.mapColumn, this.mapRow));

    this.clearRemotePlayers();
    void this.joinCurrentMap();
  }

  private joinCurrentMap(): Promise<void> {
    const position = this.player.position;
    const map = mapLetter(this.mapColumn, this.mapRow);
    return this.network?.joinMap(map, position.x, position.z, this.player.facing) ?? Promise.resolve();
  }

  private upsertRemotePlayer(state: RemotePlayerState): void {
    // Ignore late messages from the map the player just left.
    if (state.map !== mapLetter(this.mapColumn, this.mapRow)) {
      return;
    }
    const existing = this.remotePlayers.get(state.connectionId);
    if (existing) {
      existing.setTarget(state);
      return;
    }
    const remote = new RemotePlayer(state);
    this.remotePlayers.set(state.connectionId, remote);
    this.scene.add(remote.root);
  }

  private removeRemotePlayer(connectionId: string): void {
    const remote = this.remotePlayers.get(connectionId);
    if (remote) {
      this.scene.remove(remote.root);
      this.remotePlayers.delete(connectionId);
    }
  }

  private clearRemotePlayers(): void {
    for (const remote of this.remotePlayers.values()) {
      this.scene.remove(remote.root);
    }
    this.remotePlayers.clear();
  }

  // Enemies spawn in a circle around the player.
  private startMission(mission: Mission): void {
    if (this.mission) {
      return;
    }

    for (let i = 0; i < mission.enemyCount; i++) {
      const angle = (i / mission.enemyCount) * Math.PI * 2;
      const x = this.player.position.x + Math.cos(angle) * ENEMY_SPAWN_DISTANCE;
      const z = this.player.position.z + Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
      const enemy = new Enemy(mission.enemyType, x, z);
      this.world.keepInside(enemy.position, enemy.radius);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }

    this.mission = mission;
    this.defeated = 0;
    this.ui.setActiveMission(mission);
    this.ui.showMessage(`Mission started: ${mission.objective}`);
  }

  private completeMission(mission: Mission): void {
    addReward(mission.reward);
    this.endMission();
    this.ui.showMessage(`Mission complete! Received ${formatReward(mission.reward)}`);
  }

  private handleDeath(): void {
    const hadMission = this.mission !== null;
    this.endMission();
    this.player.reset();
    this.ui.showMessage(hadMission ? 'You died. Mission failed.' : 'You died.');
  }

  private endMission(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
    }
    this.enemies = [];
    this.mission = null;
    this.defeated = 0;
    this.ui.setActiveMission(null);
  }

  private updateCamera(): void {
    this.camera.position.copy(this.player.position).add(CAMERA_OFFSET);
    this.camera.lookAt(this.player.position);
  }

  private updateTargetMarker(): void {
    const target = this.player.target;
    this.targetMarker.visible = target !== null && !target.isDead;
    if (target) {
      this.targetMarker.position.set(target.position.x, 0.02, target.position.z);
    }
  }

  private createLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);
  }

  private updateCameraFrustum(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (-VIEW_SIZE * aspect) / 2;
    this.camera.right = (VIEW_SIZE * aspect) / 2;
    this.camera.top = VIEW_SIZE / 2;
    this.camera.bottom = -VIEW_SIZE / 2;
    this.camera.updateProjectionMatrix();
  }

  private onResize(): void {
    this.updateCameraFrustum();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
