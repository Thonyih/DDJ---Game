import * as THREE from 'three';
import type { GameModels } from './Assets';
import { createArrowMesh } from './Bow';
import { Chest } from './Chest';
import { Compass } from './Compass';
import { Enemy, TRAINING_ENEMY, type EnemyEvent, type EnemyType } from './Enemy';
import { ROAMING_COUNT, randomMapEnemy } from './MapEnemies';
import { Input } from './Input';
import { DIRECTION_STEPS, hasMap, mapLetter, mapName, type Direction } from './Maps';
import { Minimap } from './Minimap';
import { EdgeFog } from './EdgeFog';
import { Gestures } from './Gestures';
import { MouseTrail } from './MouseTrail';
import { Mist } from './Mist';
import { Sound } from './Sound';
import { MISSION_GIVER_RADIUS, MissionGiver } from './MissionGiver';
import {
  MISSIONS_TO_UNLOCK_NEXT_TIER,
  completedInTier,
  formatReward,
  isMissionCompleted,
  isMissionLocked,
  isRowUnlocked,
  markMissionCompleted,
  missionsForMap,
  type Mission,
} from './Missions';
import { flatDistance } from './Movement';
import { Pickup } from './Pickup';
import { Player, type SwordSwing } from './Player';
import { addArrows, addReward, playerData, type WeaponKind } from './PlayerData';
import { BOSS_STORY, ENDING, TIER_INTROS, storyState, takeCaptainLine } from './Story';
import { Tutorial } from './Tutorial';
import { UI, type MapExit } from './UI';
import { AREA_HALF_SIZE, TIER_LOOKS, World } from './World';

const VIEW_SIZE = 18;
// Performance: highest pixel density rendered, and the shadow texture's size.
const MAX_PIXEL_RATIO = 1.5;
const SHADOW_MAP_SIZE = 1024;
// The sun follows the player from this direction, so shadows stay sharp near the player.
const SUN_OFFSET = new THREE.Vector3(12, 12, 2);
// Half the size of the area around the player where shadows are drawn.
const SHADOW_AREA = 20;
const CAMERA_OFFSET = new THREE.Vector3(12, 12, 12);
const CLICK_EFFECT_TIME = 0.5;
const ENEMY_SPAWN_DISTANCE = 10;
// Roaming enemies: how long until a defeated one is replaced, and how far they appear from the
// map centre (start, respawn point and Capitão) and from the player.
const ROAMING_RESPAWN_TIME = 40;
const ROAMING_CLEAR_CENTER = 14;
const ROAMING_CLEAR_PLAYER = 12;
const MAX_CHESTS = 3;
const CHEST_RESPAWN_TIME = 30;
const CHEST_OPEN_RANGE = 5;
const LORE_READ_RANGE = 5;
// Mouse gestures: shake = Frenzy, circle = Dust Push, "+" = Heal.
const FRENZY_TIME = 0.5; // seconds of faster attacks after each shake
const FRENZY_ATTACK_SPEED = 1.5;
const PUSH_COOLDOWN = 10;
const PUSH_RADIUS = 5;
const PUSH_DISTANCE = 4;
const PUSH_TIME = 0.35;
const HEAL_COOLDOWN = 30;
const HEAL_AMOUNT = 20;
const DUST_TIME = 0.8;
// Sword slash arc: how long it shows, and its colour.
const SLASH_TIME = 0.2;
const SLASH_COLOR = 0xfff1c2;
// Dark smoke burst when an enemy dies.
const DEATH_SMOKE_COLOR = 0x2a2430;
const CHEST_MIN_SPAWN_DISTANCE = 8;
const TOO_FAR_MESSAGE_MS = 1200;
const POTION_HEAL = 30;
const TALK_RANGE = 6;
// The Missions panel closes when the player walks this far from the mission-giver.
const TALK_LEAVE_RANGE = 9;
const BORDER_ZONE = 3;
const ARRIVAL_INSET = 4;

const EFFECT_COLOR = {
  move: 0x00ff00,
  enemy: 0xff2a2a,
  chest: 0xffc65a,
  nothing: 0x9a9a9a,
  heal: 0x6dd68a,
  dust: 0xb89a6a,
};

// Chests of a map the player has left, restored when they come back.
interface SavedMap {
  chests: Chest[];
  respawnTimers: number[];
}

// An arrow in flight toward an enemy.
interface FlyingArrow {
  mesh: THREE.Group;
  target: Enemy;
  damage: number;
  done: boolean;
}

const ARROW_SPEED = 22;

// A puff of dust (Dust Push) or smoke (an enemy dying): drifts outward, grows and fades.
interface DustPuff {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  opacity: number;
}

// The bright arc a sword swing leaves in the air for a moment.
interface SlashArc {
  pivot: THREE.Object3D;
  material: THREE.MeshBasicMaterial;
  age: number;
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
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  private readonly sunLight = new THREE.DirectionalLight(0xffffff, 1);
  private readonly mist: Mist;
  private readonly sound = new Sound();
  private stepTimer = 0;
  private readonly edgeFog: EdgeFog;
  private readonly vignette = document.getElementById('vignette') as HTMLElement;
  // The item to collect for an active travel mission, while on its map.
  private pickup: Pickup | null = null;
  // Enemies guarding the travel mission's item; removed when the player leaves that map.
  private guards: Enemy[] = [];
  // Enemies that live on the current map (from its list in MapEnemies.ts), outside missions.
  private roaming: Enemy[] = [];
  private roamingRespawnTimers: number[] = [];
  // Roaming starts once the tutorial reaches missions (or is skipped).
  private roamingEnabled = false;
  private readonly canvas: HTMLCanvasElement;
  private canvasCursor = '';
  // True until the opening narration is over.
  private paused = true;
  private readonly compass = new Compass(document.getElementById('compass') as HTMLCanvasElement);
  private readonly tutorial: Tutorial;
  private readonly missionGiver: MissionGiver;
  private readonly models: GameModels;
  private readonly targetMarker: THREE.Mesh;
  private readonly effectGeometry = new THREE.RingGeometry(0.5, 0.7, 32);

  private mission: Mission | null = null;
  private enemies: Enemy[] = [];
  private chests: Chest[] = [];
  private chestRespawnTimers: number[] = [];
  // Enemies defeated or chests opened for the active mission.
  private progress = 0;
  private effects: ClickEffect[] = [];
  private dustPuffs: DustPuff[] = [];
  private slashes: SlashArc[] = [];
  // A wide curved band (about 130°) for slices and chops, and a narrow wedge for stabs. Both lie
  // flat and point along +Z (the way the knight faces once turned).
  private readonly slashGeometry = new THREE.RingGeometry(0.9, 1.6, 20, 1, Math.PI / 2 - 1.15, 2.3);
  private readonly stabGeometry = new THREE.RingGeometry(0.5, 2.1, 4, 1, Math.PI / 2 - 0.12, 0.24);
  private readonly dustGeometry = new THREE.SphereGeometry(0.35, 8, 6);
  private frenzyTimer = 0;
  private pushCooldown = 0;
  private healCooldown = 0;
  // How often each gesture was used (the tutorial waits for these).
  private readonly gesturesUsed = { frenzy: 0, push: 0, heal: 0 };
  private readonly mouseTrail: MouseTrail;
  private arrows: FlyingArrow[] = [];
  private mapColumn = 0;
  private mapRow = 0;
  private readonly savedMaps = new Map<string, SavedMap>();
  private borderDirection: Direction | null = null;
  private promptDismissed = false;
  // Travelling to other maps is unlocked by the tutorial (or by skipping it).
  private travelUnlocked = false;
  // The mission-giver has work once the tutorial reaches missions (or is skipped).
  private missionsUnlocked = false;
  private missionsCompleted = 0;

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement, models: GameModels) {
    this.models = models;
    this.missionGiver = new MissionGiver(models.Barbarian);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    // Retina screens report 2x; 1.5x looks almost the same and draws ~45% fewer pixels.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    // Isometric view: orthographic camera at a fixed angle that follows the player.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.updateCameraFrustum();

    this.createLights();
    this.world = new World(this.scene, models);
    this.mist = new Mist(this.scene);
    this.edgeFog = new EdgeFog(this.scene);

    this.player = new Player(models.Knight, {
      onShootArrow: (target, damage) => this.shootArrow(target, damage),
      onSwing: () => this.sound.playRandom(['swing_1', 'swing_2'], { volume: 0.6 }),
      onSlash: (swing) => this.spawnSlash(swing),
      onSwordHit: () => this.sound.playRandom(['hit_1', 'hit_2'], { volume: 0.7 }),
      onHurt: () => this.sound.play('hurt', { volume: 0.55 }),
      onDeath: () => this.sound.play('bell', { volume: 0.7, rate: 0.6 }),
    });
    this.scene.add(this.player.root);

    // Same NPC at the same spot on every map (all maps share the terrain).
    this.scene.add(this.missionGiver.root);
    this.world.addObstacle({
      x: this.missionGiver.position.x,
      z: this.missionGiver.position.z,
      radius: MISSION_GIVER_RADIUS,
      kind: 'npc',
    });

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

    this.canvas = canvas;
    this.input = new Input(canvas);
    this.minimap = new Minimap(minimapCanvas, (x, z) => this.moveFromMinimap(x, z));
    this.mouseTrail = new MouseTrail(canvas);
    new Gestures(canvas, {
      onShake: () => this.startFrenzy(),
      onCircle: () => this.dustPush(),
      onPlus: () => this.gestureHeal(),
    });
    this.ui = new UI({
      onStartMission: (mission) => this.startMission(mission),
      onSelectWeapon: (weapon) => this.selectWeapon(weapon),
      onUpgraded: () => this.sound.play('coins_2', { volume: 0.8 }),
      onSound: (name) => this.sound.play(name, { volume: 0.6 }),
      onTravel: () => this.travel(),
      onStayAtBorder: () => {
        this.promptDismissed = true;
        this.ui.hideTravelPrompt();
      },
    });
    this.ui.setCurrentMap(this.mapColumn, this.mapRow, this.getExits());
    this.applyTierLook();

    this.tutorial = new Tutorial({
      camera: this.camera,
      playerPosition: () => this.player.position,
      spawnChestNear: (dx, dz) => this.spawnChestNear(dx, dz),
      hasChest: (chest) => this.chests.includes(chest),
      spawnTrainingEnemyNear: (dx, dz) => this.spawnEnemy(TRAINING_ENEMY, dx, dz),
      hasEnemy: (enemy) => this.enemies.includes(enemy),
      removeEnemy: (enemy) => this.removeEnemy(enemy),
      hasActiveMission: () => this.mission !== null,
      currentMap: () => mapLetter(this.mapColumn, this.mapRow),
      missionGiverPosition: () => this.missionGiver.position,
      isMissionsPanelOpen: () => this.ui.isMissionsOpen,
      isWorldMapOpen: () => this.ui.isWorldMapOpen,
      unlockMissions: () => {
        this.missionsUnlocked = true;
        if (!this.roamingEnabled) {
          this.roamingEnabled = true;
          this.populateRoaming();
        }
      },
      missionsCompleted: () => this.missionsCompleted,
      unlockTravel: () => {
        this.travelUnlocked = true;
      },
      showMessage: (text) => this.ui.showMessage(text),
      gestureUses: () => this.gesturesUsed,
      onStepComplete: () => this.sound.page(0.5),
    });

    // Every enabled menu button gives a soft click.
    document.addEventListener('click', (event) => {
      const button = (event.target as Element).closest('button');
      if (button && !button.disabled) {
        this.sound.play('ui_click', { volume: 0.35 });
      }
    });

    const soundButton = document.getElementById('sound-button') as HTMLButtonElement;
    soundButton.addEventListener('click', () => {
      this.sound.toggleMute();
      soundButton.textContent = this.sound.isMuted ? 'Sound Off' : 'Sound On';
    });

    window.addEventListener('resize', () => this.onResize());
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // After the opening narration: the game runs and the first tier's introduction is shown.
  resume(): void {
    this.paused = false;
    this.showTierIntro();
  }

  private tick(): void {
    // Clamped so a long pause (e.g. switching tabs) doesn't cause a huge jump.
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // The game waits during the opening narration and while a story page is open.
    if (this.paused || this.ui.isStoryOpen) {
      this.input.consumeClick();
      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.handleClick();
    this.followHeldMouse();
    this.updateGestureTimers(delta);
    this.player.update(delta, this.world);
    this.updateFootsteps(delta);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player, this.world);
    }
    this.removeDefeatedEnemies();
    this.updateChests(delta);
    this.updateRoaming(delta);
    this.updateBorderPrompt();

    // The death animation plays first; then the player respawns.
    if (this.player.readyToRespawn) {
      this.handleDeath();
    } else if (!this.player.isDead && this.mission && this.progress >= this.mission.goal.count) {
      this.completeMission(this.mission);
    }

    this.updateCamera();
    this.updateCursor();
    for (const enemy of this.enemies) {
      enemy.updateHealthBar(this.camera);
    }
    for (const chest of this.chests) {
      chest.updateGlow(this.clock.elapsedTime);
    }
    this.pickup?.update(this.clock.elapsedTime);
    this.world.updateLoreMarkers(this.clock.elapsedTime);
    this.mist.update(delta);
    this.edgeFog.update(this.clock.elapsedTime);
    this.missionGiver.update(delta, this.clock.elapsedTime, this.camera, this.missionsUnlocked && !this.mission && this.hasMissionsLeft());
    if (this.ui.isMissionsOpen && flatDistance(this.player.position, this.missionGiver.position) > TALK_LEAVE_RANGE) {
      this.ui.closeMissions();
    }
    this.updateTargetMarker();
    this.updateEffects(delta);
    this.updateDust(delta);
    this.updateSlashes(delta);
    this.updateArrows(delta);
    this.tutorial.update();
    this.ui.updateHud(this.player, this.progress, {
      cooldowns: {
        push: { left: this.pushCooldown, total: PUSH_COOLDOWN },
        heal: { left: this.healCooldown, total: HEAL_COOLDOWN },
        frenzy: { left: this.frenzyTimer, total: FRENZY_TIME },
      },
    });
    const exitDirections = this.getExits().map((exit) => exit.direction);
    this.minimap.draw(this.world, this.player, this.enemies, exitDirections, this.pickup?.position ?? null);
    this.compass.draw(this.camera, this.player.position, this.player.facingDirection);
    this.renderer.render(this.scene, this.camera);
  }

  // Cursor over the game: a sword over an enemy, the gold arrow over something to interact with
  // (chest, Capitão, lore, pickup), otherwise the normal iron arrow.
  private updateCursor(): void {
    let cursor = '';
    const pointer = this.input.pointer;
    if (pointer && !this.player.isDead) {
      this.raycaster.setFromCamera(pointer, this.camera);
      const enemyHitboxes = this.enemies.filter((enemy) => !enemy.isDead).map((enemy) => enemy.hitbox);
      const targets = [
        ...enemyHitboxes,
        ...this.chests.map((chest) => chest.hitbox),
        this.missionGiver.hitbox,
        ...(this.pickup ? [this.pickup.hitbox] : []),
        ...this.world.loreSpots.map((spot) => spot.hitbox),
      ];
      const hit = this.raycaster.intersectObjects(targets, false)[0];
      if (hit) {
        cursor = enemyHitboxes.includes(hit.object as THREE.Mesh) ? 'var(--cursor-attack)' : 'var(--cursor-interact)';
      }
    }
    if (cursor !== this.canvasCursor) {
      this.canvasCursor = cursor;
      this.canvas.style.cursor = cursor;
    }
  }

  private handleClick(): void {
    const click = this.input.consumeClick();
    if (!click) {
      return;
    }

    this.raycaster.setFromCamera(click.position, this.camera);

    let startedAttack = false;
    if (click.button === 'right') {
      startedAttack = this.handleRightClick();
    } else {
      this.handleLeftClick();
    }

    // Any click that doesn't pick an enemy cancels the current attack.
    if (!startedAttack) {
      this.player.stopAttacking();
    }
  }

  // Right click: target an enemy or open a chest. Never moves the player.
  // Returns true if it started an attack.
  private handleRightClick(): boolean {
    const living = this.enemies.filter((item) => !item.isDead);
    const enemyHits = this.raycaster.intersectObjects(living.map((item) => item.hitbox), false);
    const enemy = living.find((item) => item.hitbox === enemyHits[0]?.object);
    if (enemy) {
      this.player.attack(enemy);
      this.spawnEffect(enemy.position, EFFECT_COLOR.enemy, 1.3);
      if (!this.player.isInAttackRange(enemy)) {
        this.warn('Too far away');
      }
      return true;
    }

    if (this.pickup && this.raycaster.intersectObject(this.pickup.hitbox, false).length > 0) {
      this.collectPickup(this.pickup);
      return false;
    }

    const npcHits = this.raycaster.intersectObject(this.missionGiver.hitbox, false);
    if (npcHits.length > 0) {
      this.talkToMissionGiver();
      return false;
    }

    const loreHits = this.raycaster.intersectObjects(this.world.loreSpots.map((spot) => spot.hitbox), false);
    const loreSpot = this.world.loreSpots.find((spot) => spot.hitbox === loreHits[0]?.object);
    if (loreSpot) {
      this.spawnEffect(loreSpot.position, EFFECT_COLOR.chest, 1.3);
      if (flatDistance(this.player.position, loreSpot.position) <= LORE_READ_RANGE) {
        this.ui.showStory({ title: loreSpot.entry.title, lines: [loreSpot.entry.text] });
      } else {
        this.warn('Too far away');
      }
      return false;
    }

    const chestHits = this.raycaster.intersectObjects(this.chests.map((item) => item.hitbox), false);
    const chest = this.chests.find((item) => item.hitbox === chestHits[0]?.object);
    if (chest) {
      this.spawnEffect(chest.position, EFFECT_COLOR.chest, 1.3);
      if (flatDistance(this.player.position, chest.position) <= CHEST_OPEN_RANGE) {
        this.openChest(chest);
      } else {
        this.warn('Too far away');
      }
      return false;
    }

    const groundHits = this.raycaster.intersectObject(this.world.ground, false);
    if (groundHits.length > 0) {
      this.spawnEffect(groundHits[0].point, EFFECT_COLOR.nothing, 0.6);
    }
    return false;
  }

  // Left click: move to a point on the ground.
  // Holding the left button: the knight keeps walking toward the cursor.
  private followHeldMouse(): void {
    const pointer = this.input.pointer;
    if (!this.input.leftHeld || !pointer) {
      return;
    }
    this.raycaster.setFromCamera(pointer, this.camera);
    const groundHits = this.raycaster.intersectObject(this.world.ground, false);
    if (groundHits.length > 0) {
      this.player.moveTo(groundHits[0].point);
    }
  }

  // Left-click on the minimap: walk to that spot (like a left-click on the ground).
  private moveFromMinimap(x: number, z: number): void {
    if (this.player.isDead) {
      return;
    }
    const point = new THREE.Vector3(x, 0, z);
    this.world.keepInside(point, 0.5);
    this.player.stopAttacking();
    this.player.moveTo(point);
    this.spawnEffect(point, EFFECT_COLOR.move, 1);
    this.sound.play('ui_click', { volume: 0.3 });
  }

  private handleLeftClick(): void {
    const groundHits = this.raycaster.intersectObject(this.world.ground, false);
    if (groundHits.length > 0) {
      const point = groundHits[0].point;
      this.player.moveTo(point);
      this.spawnEffect(point, EFFECT_COLOR.move, 1);
    }
  }

  private talkToMissionGiver(): void {
    this.spawnEffect(this.missionGiver.position, EFFECT_COLOR.chest, 1.4);
    if (flatDistance(this.player.position, this.missionGiver.position) > TALK_RANGE) {
      this.warn('Too far away');
    } else if (!this.missionsUnlocked) {
      this.playCapitaoGreeting();
      this.ui.showMessage('Capitão da Ordem: "Prove yourself first, knight."');
    } else {
      this.playCapitaoGreeting();
      this.player.interact();
      this.missionGiver.greet();
      // Each row's Capitão offers that row's tier of missions, after any new story line.
      const tier = this.mapRow + 1;
      const storyLine = takeCaptainLine();
      if (storyLine) {
        this.ui.showStory(storyLine, () => this.ui.openMissions(tier));
      } else {
        this.ui.openMissions(tier);
      }
    }
  }

  // Armour and cloth rustle as the Capitão turns to the player.
  private playCapitaoGreeting(): void {
    this.sound.play('npc_armour', { volume: 0.8 });
    this.sound.play('cloth_1', { volume: 0.6 });
  }

  private selectWeapon(weapon: WeaponKind): void {
    if (weapon === 'bow' && playerData.arrows <= 0) {
      this.warn('No arrows. Find more in chests.');
      return;
    }
    if (weapon !== playerData.selectedWeapon) {
      this.sound.play(weapon === 'sword' ? 'equip_sword' : 'equip_bow', { volume: 0.7 });
    }
    this.player.selectWeapon(weapon);
  }

  // Short message for something the player can't do right now, with a dull click.
  private warn(text: string): void {
    this.ui.showMessage(text, TOO_FAR_MESSAGE_MS);
    this.sound.play('ui_click', { volume: 0.5, rate: 0.6 });
  }

  // Growls get quieter the further away the enemy is.
  private onEnemyEvent(event: EnemyEvent, enemy: Enemy): void {
    const volume = Math.max(0.15, 1 - flatDistance(enemy.position, this.player.position) / 18);
    if (event === 'alert') {
      this.sound.snarl(0.45 * volume);
    } else if (event === 'attack') {
      this.sound.snarl(0.6 * volume, true);
    } else {
      this.sound.play('enemy_death', { volume: 0.7 });
      this.sound.snarl(0.35 * volume);
      // A puff of dark smoke bursts from the body, rising slowly.
      this.spawnPuffs(enemy.position, DEATH_SMOKE_COLOR, 12, 1.6, 1.4, 0.75, 1.1);
    }
  }

  private updateFootsteps(delta: number): void {
    this.stepTimer -= delta;
    if (this.player.isMoving && this.stepTimer <= 0) {
      this.sound.footstep();
      this.stepTimer = 0.32;
    }
  }

  private shootArrow(target: Enemy, damage: number): void {
    this.sound.play('bow_shot', { volume: 0.7 });
    const mesh = createArrowMesh();
    mesh.position.copy(this.player.position).add(new THREE.Vector3(0, 0.4, 0));
    this.scene.add(mesh);
    this.arrows.push({ mesh, target, damage, done: false });

    if (playerData.arrows <= 0) {
      this.player.selectWeapon('sword');
      this.ui.showMessage('Out of arrows. Switched to the sword.');
    }
  }

  // Arrows fly to the enemy's chest height and hit when they arrive.
  private updateArrows(delta: number): void {
    for (const arrow of this.arrows) {
      const aim = arrow.target.position.clone().add(new THREE.Vector3(0, 1, 0));
      const toTarget = aim.clone().sub(arrow.mesh.position);
      const step = ARROW_SPEED * delta;
      arrow.mesh.lookAt(aim);
      if (toTarget.length() <= step) {
        arrow.target.takeDamage(arrow.damage);
        this.sound.play('arrow_hit', { volume: 0.7 });
        arrow.done = true;
      } else {
        arrow.mesh.position.addScaledVector(toTarget.normalize(), step);
      }
      // An arrow whose target died or disappeared just vanishes.
      if (arrow.target.isDead || !this.enemies.includes(arrow.target)) {
        arrow.done = true;
      }
      if (arrow.done) {
        this.scene.remove(arrow.mesh);
      }
    }
    this.arrows = this.arrows.filter((arrow) => !arrow.done);
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

  private updateGestureTimers(delta: number): void {
    this.frenzyTimer -= delta;
    this.pushCooldown -= delta;
    this.healCooldown -= delta;
    this.player.attackSpeed = this.frenzyTimer > 0 ? FRENZY_ATTACK_SPEED : 1;
  }

  // Shaking the mouse side to side: faster attacks while it lasts.
  private startFrenzy(): void {
    if (this.player.isDead || this.ui.isStoryOpen) {
      return;
    }
    if (this.frenzyTimer <= 0) {
      this.ui.showMessage('Frenzy! Faster attacks', 1200);
      this.sound.play('swing_1', { volume: 0.7, rate: 1.3 });
      this.gesturesUsed.frenzy += 1;
    }
    this.frenzyTimer = FRENZY_TIME;
    this.mouseTrail.flash('255, 80, 50');
  }

  // Drawing a circle: a burst of dust knocks nearby enemies back.
  private dustPush(): void {
    if (this.player.isDead || this.ui.isStoryOpen) {
      return;
    }
    if (this.pushCooldown > 0) {
      this.warn(`Dust Push ready in ${Math.ceil(this.pushCooldown)}s`);
      return;
    }
    this.pushCooldown = PUSH_COOLDOWN;
    this.gesturesUsed.push += 1;
    this.mouseTrail.flash('200, 165, 110');
    const center = this.player.position;
    for (const enemy of this.enemies) {
      if (!enemy.isDead && flatDistance(enemy.position, center) <= PUSH_RADIUS) {
        enemy.pushAway(center, PUSH_DISTANCE, PUSH_TIME);
      }
    }
    this.player.interact();
    this.spawnDust(center);
    this.sound.play('swing_2', { volume: 0.8, rate: 0.55 });
  }

  // Drawing a "+": heals the knight.
  private gestureHeal(): void {
    if (this.player.isDead || this.ui.isStoryOpen) {
      return;
    }
    if (this.healCooldown > 0) {
      this.warn(`Heal ready in ${Math.ceil(this.healCooldown)}s`);
      return;
    }
    this.healCooldown = HEAL_COOLDOWN;
    this.gesturesUsed.heal += 1;
    this.mouseTrail.flash('109, 214, 138');
    const healed = this.player.heal(HEAL_AMOUNT);
    this.ui.showMessage(`Healed +${healed} HP`);
    this.spawnEffect(this.player.position, EFFECT_COLOR.heal, 1.4);
    this.spawnEffect(this.player.position, EFFECT_COLOR.heal, 2.2);
    this.sound.play('bell', { volume: 0.4, rate: 1.5 });
  }

  // A ring of dust puffs bursting out from the knight, plus a wide ring on the ground.
  private spawnDust(center: THREE.Vector3): void {
    this.spawnEffect(center, EFFECT_COLOR.dust, PUSH_RADIUS / 0.7);
    this.spawnPuffs(center, EFFECT_COLOR.dust, 16, 6.5, 0.6, 0.7, DUST_TIME);
  }

  // Puffs bursting outward in a ring from `center`: `speed` outward, `rise` upward, fading over
  // `life` seconds.
  private spawnPuffs(center: THREE.Vector3, color: number, count: number, speed: number, rise: number,
    opacity: number, life: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const puffSpeed = speed * (0.75 + Math.random() * 0.5);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(this.dustGeometry, material);
      mesh.position.set(center.x + Math.cos(angle) * 0.5, 0.3 + Math.random() * 0.6, center.z + Math.sin(angle) * 0.5);
      this.scene.add(mesh);
      this.dustPuffs.push({
        mesh,
        material,
        velocity: new THREE.Vector3(Math.cos(angle) * puffSpeed, rise * (0.7 + Math.random() * 0.6), Math.sin(angle) * puffSpeed),
        age: 0,
        life,
        opacity,
      });
    }
  }

  // A bright arc in front of the knight, tilted to match the swing, that flares and fades.
  private spawnSlash(swing: SwordSwing): void {
    const facing = this.player.facingDirection;
    const pivot = new THREE.Object3D();
    pivot.position.set(this.player.position.x, 1.1, this.player.position.z);
    pivot.rotation.y = Math.atan2(facing.x, facing.z); // local +Z = the way the knight faces
    const roller = new THREE.Object3D();
    roller.rotation.z = THREE.MathUtils.degToRad(swing.roll); // tilt around the facing direction
    const material = new THREE.MeshBasicMaterial({
      color: SLASH_COLOR,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const arc = new THREE.Mesh(swing.stab ? this.stabGeometry : this.slashGeometry, material);
    arc.rotation.x = Math.PI / 2; // from upright to flat
    roller.add(arc);
    pivot.add(roller);
    this.scene.add(pivot);
    this.slashes.push({ pivot, material, age: 0 });
  }

  private updateSlashes(delta: number): void {
    for (const slash of this.slashes) {
      slash.age += delta;
      const progress = Math.min(slash.age / SLASH_TIME, 1);
      slash.material.opacity = 0.9 * (1 - progress);
      slash.pivot.scale.setScalar(0.85 + progress * 0.3);
      if (progress >= 1) {
        this.scene.remove(slash.pivot);
        slash.material.dispose();
      }
    }
    this.slashes = this.slashes.filter((slash) => slash.age < SLASH_TIME);
  }

  private updateDust(delta: number): void {
    for (const puff of this.dustPuffs) {
      puff.age += delta;
      const progress = Math.min(puff.age / puff.life, 1);
      puff.mesh.position.addScaledVector(puff.velocity, delta * (1 - progress));
      puff.mesh.scale.setScalar(1 + progress * 2.5);
      puff.material.opacity = puff.opacity * (1 - progress);
      if (progress >= 1) {
        this.scene.remove(puff.mesh);
        puff.material.dispose();
      }
    }
    this.dustPuffs = this.dustPuffs.filter((puff) => puff.age < puff.life);
  }

  // A defeat counts straight away; the body stays until its death animation has played.
  private removeDefeatedEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.isDead && !enemy.defeatCounted) {
        enemy.defeatCounted = true;
        if (enemy.forMission && this.mission?.goal.kind === 'defeat') {
          this.progress += 1;
        }
      }
      if (enemy.isGone) {
        this.scene.remove(enemy.root);
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.isGone);
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
    const arrowsFound = addArrows(chest.arrows);
    this.sound.play('chest_creak', { volume: 0.7 });
    this.sound.play('coins_1', { volume: 0.7 });
    if (this.mission?.goal.kind === 'chests') {
      this.progress += 1;
    }
    this.player.interact();
    this.scene.remove(chest.mesh);
    this.chests = this.chests.filter((item) => item !== chest);
    this.chestRespawnTimers.push(CHEST_RESPAWN_TIME);
    this.ui.refreshInventory();
    const healed = this.player.heal(POTION_HEAL);
    const arrowText = arrowsFound > 0 ? `, +${arrowsFound} arrows` : '';
    this.ui.showMessage(`Chest opened! ${formatReward(chest.reward)}, potion +${healed} HP${arrowText}`);
  }

  // Places a chest at an offset from the player (used by the tutorial).
  private spawnChestNear(dx: number, dz: number): Chest {
    const position = this.player.position.clone().add(new THREE.Vector3(dx, 0, dz));
    this.world.keepInside(position, 1);
    const chest = new Chest(position);
    this.chests.push(chest);
    this.scene.add(chest.mesh);
    return chest;
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
    const direction = this.travelUnlocked ? this.findBorderDirection() : null;
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
    if (!isRowUnlocked(this.mapRow + step.row)) {
      const done = completedInTier(this.mapRow + 1);
      this.ui.showTravelPrompt(
        `${name} is locked: complete ${MISSIONS_TO_UNLOCK_NEXT_TIER} Tier ${this.mapRow + 1} missions (${done} / ${MISSIONS_TO_UNLOCK_NEXT_TIER})`,
        false,
      );
    } else if (this.blocksTravel()) {
      this.ui.showTravelPrompt(`Finish your mission before traveling to ${name}`, false);
    } else {
      this.ui.showTravelPrompt(`Travel ${direction} to ${name}?`, true);
    }
  }

  private travel(): void {
    const direction = this.borderDirection;
    if (!direction || this.blocksTravel() || !isRowUnlocked(this.mapRow + DIRECTION_STEPS[direction].row)) {
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
    this.applyTierLook();
    this.clearRoaming();

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
    this.sound.play('cloth_2', { volume: 0.7 });
    this.showTierIntro();
    if (this.roamingEnabled) {
      this.populateRoaming();
    }
    this.updatePickup();
  }

  // Enemy and chest missions keep the player on their map; travel missions need travelling.
  private blocksTravel(): boolean {
    return this.mission !== null && this.mission.goal.kind !== 'fetch';
  }

  private startMission(mission: Mission): void {
    // Each mission can only be completed once.
    if (this.mission || isMissionCompleted(mission) || isMissionLocked(mission)) {
      return;
    }

    const goal = mission.goal;
    if (goal.kind === 'defeat') {
      // Enemies spawn in a circle around the player: the mission's own enemy, or a mix from
      // this map's list.
      const map = mapLetter(this.mapColumn, this.mapRow);
      for (let i = 0; i < goal.count; i++) {
        const angle = (i / goal.count) * Math.PI * 2;
        const dx = Math.cos(angle) * ENEMY_SPAWN_DISTANCE;
        const dz = Math.sin(angle) * ENEMY_SPAWN_DISTANCE;
        const enemy = this.spawnEnemy(goal.enemyType ?? randomMapEnemy(map), dx, dz);
        enemy.forMission = true;
      }
    } else if (goal.kind === 'chests') {
      // Make sure there are enough chests on this map to find.
      while (this.chests.length < Math.min(goal.count, MAX_CHESTS)) {
        this.spawnChest();
      }
    }

    this.mission = mission;
    this.progress = 0;
    this.updatePickup();
    this.ui.setActiveMission(mission);
    this.ui.closeMissions();
    this.ui.showMessage(`Mission started: ${mission.objective}`);
    this.sound.play('mission_start', { volume: 0.8 });
    const boss = BOSS_STORY[mission.name];
    if (boss) {
      this.ui.showStory({ title: boss.title, lines: [boss.encounter] });
    }
  }

  // True while this map's Capitão still has a mission that can be started.
  private hasMissionsLeft(): boolean {
    return missionsForMap(this.mapRow + 1, mapLetter(this.mapColumn, this.mapRow)).some(
      (mission) => !isMissionCompleted(mission) && !isMissionLocked(mission),
    );
  }

  // The first time the player is on a row of maps, that tier's introduction is shown.
  private showTierIntro(): void {
    const row = this.mapRow;
    if (!storyState.seenTierIntros.includes(row)) {
      // Marked as seen only when dismissed.
      this.ui.showStory(TIER_INTROS[row], () => {
        if (!storyState.seenTierIntros.includes(row)) {
          storyState.seenTierIntros.push(row);
        }
      });
    }
  }

  // Fills the current map with its roaming enemies.
  private populateRoaming(): void {
    const count = ROAMING_COUNT[this.mapRow];
    while (this.roaming.length + this.roamingRespawnTimers.length < count) {
      this.spawnRoamingEnemy();
    }
  }

  private spawnRoamingEnemy(): void {
    // A free spot away from the map centre and from the player.
    let spot = this.world.randomFreePosition(this.player.position, ROAMING_CLEAR_PLAYER);
    for (let attempt = 0; attempt < 30 && Math.hypot(spot.x, spot.z) < ROAMING_CLEAR_CENTER; attempt++) {
      spot = this.world.randomFreePosition(this.player.position, ROAMING_CLEAR_PLAYER);
    }
    const enemy = this.spawnEnemyAt(randomMapEnemy(mapLetter(this.mapColumn, this.mapRow)), spot.x, spot.z);
    this.roaming.push(enemy);
  }

  private clearRoaming(): void {
    for (const enemy of this.roaming) {
      this.removeEnemy(enemy);
    }
    this.roaming = [];
    this.roamingRespawnTimers = [];
  }

  // Defeated roaming enemies are replaced after a while.
  private updateRoaming(delta: number): void {
    if (!this.roamingEnabled) {
      return;
    }
    const alive = this.roaming.filter((enemy) => !enemy.isDead);
    for (let i = alive.length; i < this.roaming.length; i++) {
      this.roamingRespawnTimers.push(ROAMING_RESPAWN_TIME);
    }
    this.roaming = alive;

    this.roamingRespawnTimers = this.roamingRespawnTimers.map((time) => time - delta);
    while (this.roamingRespawnTimers.length > 0 && this.roamingRespawnTimers[0] <= 0) {
      this.roamingRespawnTimers.shift();
      this.spawnRoamingEnemy();
    }
  }

  // Spawns an enemy at an offset from the player.
  private spawnEnemy(type: EnemyType, dx: number, dz: number): Enemy {
    return this.spawnEnemyAt(type, this.player.position.x + dx, this.player.position.z + dz);
  }

  private spawnEnemyAt(type: EnemyType, x: number, z: number): Enemy {
    const enemy = new Enemy(type, x, z, this.models, (event, source) => this.onEnemyEvent(event, source));
    this.world.keepInside(enemy.position, enemy.radius);
    this.enemies.push(enemy);
    this.scene.add(enemy.root);
    return enemy;
  }

  private removeEnemy(enemy: Enemy): void {
    this.scene.remove(enemy.root);
    this.enemies = this.enemies.filter((item) => item !== enemy);
    if (this.player.target === enemy) {
      this.player.stopAttacking();
    }
  }

  private completeMission(mission: Mission): void {
    this.missionsCompleted += 1;
    markMissionCompleted(mission);
    addReward(mission.reward);
    this.endMission();
    this.player.cheer();
    this.sound.play('bell', { volume: 0.6 });
    this.sound.play('coins_1', { volume: 0.8 });
    this.ui.showMessage(`Mission complete! Received ${formatReward(mission.reward)}`);

    // Boss victories get a line of story; Adamastor's is the ending.
    const boss = BOSS_STORY[mission.name];
    if (mission.name === 'Adamastor') {
      for (const page of ENDING) {
        this.ui.showStory(page);
      }
    } else if (boss?.victory) {
      this.ui.showStory({ title: boss.title, lines: [boss.victory] });
    }
  }

  private handleDeath(): void {
    const hadMission = this.mission !== null;
    this.endMission();
    this.player.reset();
    this.ui.showMessage(hadMission ? 'You died. Mission failed.' : 'You died.');
  }

  // Removes the mission's enemies; roaming enemies stay on the map.
  private endMission(): void {
    for (const enemy of this.enemies.filter((item) => item.forMission)) {
      this.removeEnemy(enemy);
    }
    for (const guard of this.guards) {
      this.removeEnemy(guard);
    }
    this.guards = [];
    this.mission = null;
    this.progress = 0;
    this.updatePickup();
    this.ui.setActiveMission(null);
  }

  private updateCamera(): void {
    this.camera.position.copy(this.player.position).add(CAMERA_OFFSET);
    this.camera.lookAt(this.player.position);
    this.sunLight.position.copy(this.player.position).add(SUN_OFFSET);
    this.sunLight.target.position.copy(this.player.position);
  }

  private updateTargetMarker(): void {
    const target = this.player.target;
    this.targetMarker.visible = target !== null && !target.isDead;
    if (target) {
      this.targetMarker.position.set(target.position.x, 0.02, target.position.z);
    }
  }

  private createLights(): void {
    this.scene.add(this.ambientLight);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    const shadowCamera = this.sunLight.shadow.camera;
    shadowCamera.left = -SHADOW_AREA;
    shadowCamera.right = SHADOW_AREA;
    shadowCamera.top = SHADOW_AREA;
    shadowCamera.bottom = -SHADOW_AREA;
    shadowCamera.near = 1;
    shadowCamera.far = 60;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight, this.sunLight.target);
  }

  // Each row of maps is darker than the one south of it: ground, trees, light, sky and fog.
  private applyTierLook(): void {
    const look = TIER_LOOKS[this.mapRow];
    this.world.setTier(this.mapRow);
    this.minimap.setGroundColor(look.minimapGround);
    this.scene.background = new THREE.Color(look.sky);
    this.scene.fog = new THREE.Fog(look.sky, 20, look.fogFar);
    this.ambientLight.intensity = look.ambient;
    this.sunLight.intensity = look.sun;
    this.mist.setLook(look.mist, look.sky);
    this.sound.setTier(this.mapRow);
    this.edgeFog.setLook(look.sky, look.edgeFog);
    this.vignette.style.opacity = String(look.vignette);
  }

  // Shows the travel mission's item when the player is on its map, and hides it elsewhere.
  private updatePickup(): void {
    const goal = this.mission?.goal;
    const onTargetMap = goal?.kind === 'fetch' && goal.map === mapLetter(this.mapColumn, this.mapRow);
    if (onTargetMap && !this.pickup) {
      // Nearest spot to the mission's point with no tree or rock hiding the item.
      const position = this.world.nearestClearSpot(goal.x, goal.z, 3);
      this.pickup = new Pickup(goal.item, position);
      this.scene.add(this.pickup.root);
      // Guards stand on either side of the item.
      const guardCount = goal.guards?.count ?? 0;
      for (let i = 0; i < guardCount; i++) {
        const angle = (i / guardCount) * Math.PI * 2;
        const guard = this.spawnEnemyAt(goal.guards!.enemyType, position.x + Math.cos(angle) * 2.5, position.z + Math.sin(angle) * 2.5);
        this.guards.push(guard);
      }
    } else if (!onTargetMap && this.pickup) {
      this.scene.remove(this.pickup.root);
      this.pickup = null;
      for (const guard of this.guards) {
        this.removeEnemy(guard);
      }
      this.guards = [];
    }
  }

  private collectPickup(pickup: Pickup): void {
    this.spawnEffect(pickup.position, EFFECT_COLOR.chest, 1.4);
    if (flatDistance(this.player.position, pickup.position) > CHEST_OPEN_RANGE) {
      this.warn('Too far away');
      return;
    }
    this.player.interact();
    this.sound.play('coins_2', { volume: 0.8 });
    this.sound.play('latch', { volume: 0.6 });
    this.scene.remove(pickup.root);
    this.pickup = null;
    this.progress = 1; // completes the travel mission this frame
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
