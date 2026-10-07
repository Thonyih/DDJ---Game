import * as THREE from 'three';
import { AnimatedModel } from './AnimatedModel';
import type { GameModels } from './Assets';
import { ENEMY_LOOKS, type EnemyLook } from './EnemyLooks';
import { createHitbox } from './Hitbox';
import { createNameLabel } from './Label';
import { faceToward, flatDistance, moveToward } from './Movement';
import type { Player } from './Player';
import type { World } from './World';

const HIT_FLASH_TIME = 0.15;
const HIT_FLASH_COLOR = 0xff0000;
// The player always reaches farther than the enemy it fights.
const PLAYER_RANGE_ADVANTAGE = 1.0;
const HEALTH_BAR_HEIGHT = 0.12;
// The attack animation lasts ATTACK_TIME; the player takes damage after ATTACK_HIT_DELAY.
const ATTACK_TIME = 0.7;
const ATTACK_HIT_DELAY = 0.35;
// A defeated enemy stays this long so its death animation can play.
const DEATH_REMOVE_TIME = 1.5;

export interface EnemyType {
  // Each enemy gets one of these names at random; the name decides its model (EnemyLooks.ts).
  names: string[];
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  detectRange: number;
  attackRange: number;
  attackCooldown: number;
  radius: number;
}

export const GRUNT: EnemyType = {
  names: [
    'Cavaleiro Fantasma',
    'Templário Perdido',
    'Corsário Espectral',
    'Marinheiro Naufragado',
    'Alma do Naufrágio',
    'Lobisomem',
    'Moura Encantada',
    'Bruxa',
    'Diabrete',
    'Mapinguari',
  ],
  maxHealth: 30,
  damage: 8,
  moveSpeed: 3,
  detectRange: 7,
  attackRange: 1.5,
  attackCooldown: 1.5,
  radius: 0.45,
};

// Weak enemy used once by the tutorial to teach combat.
export const TRAINING_ENEMY: EnemyType = {
  names: ['Diabrete'],
  maxHealth: 20,
  damage: 3,
  moveSpeed: 2,
  detectRange: 7,
  attackRange: 1.5,
  attackCooldown: 2,
  radius: 0.4,
};

// Fast but fragile; hunts in packs (Tier 1).
export const WOLF: EnemyType = {
  names: ['Lobisomem'],
  maxHealth: 25,
  damage: 6,
  moveSpeed: 4.5,
  detectRange: 9,
  attackRange: 1.6,
  attackCooldown: 1,
  radius: 0.5,
};

// Sturdy undead knights (Tier 2).
export const TEMPLAR: EnemyType = {
  names: ['Templário Perdido'],
  maxHealth: 45,
  damage: 9,
  moveSpeed: 2.8,
  detectRange: 8,
  attackRange: 1.5,
  attackCooldown: 1.4,
  radius: 0.45,
};

// Slow but hit hard (Tier 3).
export const WITCH: EnemyType = {
  names: ['Bruxa'],
  maxHealth: 50,
  damage: 14,
  moveSpeed: 2.6,
  detectRange: 9,
  attackRange: 1.6,
  attackCooldown: 1.8,
  radius: 0.45,
};

// Quick ghosts of drowned sailors and pirates (Tier 3).
export const SPECTRE: EnemyType = {
  names: ['Alma do Naufrágio', 'Corsário Espectral'],
  maxHealth: 40,
  damage: 11,
  moveSpeed: 3.8,
  detectRange: 9,
  attackRange: 1.5,
  attackCooldown: 1.3,
  radius: 0.45,
};

// Beast boss of the north (Tier 4).
export const MAPINGUARI: EnemyType = {
  names: ['Mapinguari'],
  maxHealth: 180,
  damage: 16,
  moveSpeed: 2.6,
  detectRange: 10,
  attackRange: 2,
  attackCooldown: 1.8,
  radius: 0.9,
};

export const ADAMASTOR: EnemyType = {
  names: ['Adamastor'],
  maxHealth: 250,
  damage: 15,
  moveSpeed: 2.2,
  detectRange: 10,
  attackRange: 2.4,
  attackCooldown: 2,
  radius: 1.2,
};

// Moments that make a sound: first noticing the player, attacking, dying.
export type EnemyEvent = 'alert' | 'attack' | 'death';

export class Enemy {
  readonly root = new THREE.Group();
  readonly type: EnemyType;
  readonly name: string;
  readonly maxHealth: number;
  readonly radius: number;
  health: number;
  // Set by the game once this defeat has counted toward the mission.
  defeatCounted = false;
  // Invisible, larger shape that catches clicks.
  readonly hitbox: THREE.Mesh;
  private readonly look: EnemyLook;
  private readonly model: AnimatedModel;
  private readonly healthBar = new THREE.Group();
  private readonly healthFill: THREE.Mesh;
  private readonly healthBarWidth: number;
  private cooldown: number;
  private flashTimer = 0;
  private pendingHit = -1; // seconds until the current attack lands; negative when none
  private deathTime = 0;
  private chasing = false;
  private readonly onEvent: (event: EnemyEvent, enemy: Enemy) => void;

  constructor(
    type: EnemyType,
    x: number,
    z: number,
    models: GameModels,
    onEvent: (event: EnemyEvent, enemy: Enemy) => void,
  ) {
    this.type = type;
    this.onEvent = onEvent;
    this.name = type.names[Math.floor(Math.random() * type.names.length)];
    this.maxHealth = type.maxHealth;
    this.health = type.maxHealth;
    this.radius = type.radius;
    this.cooldown = type.attackCooldown;

    this.look = ENEMY_LOOKS[this.name];
    this.model = new AnimatedModel(models[this.look.model], this.look);
    this.model.setLoop(this.look.clips.idle);
    this.root.add(this.model.object);
    this.root.position.set(x, 0, z);
    this.hitbox = createHitbox(Math.max(this.radius * 1.8, 0.9), this.look.height + 0.4);
    this.root.add(this.hitbox);

    // Name and health bar float above the head.
    this.healthBarWidth = Math.max(1, this.radius * 2.2);
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(this.healthBarWidth, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x330000 }),
    );
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(this.healthBarWidth, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0xff3333 }),
    );
    this.healthFill.position.z = 0.01;
    const label = createNameLabel(this.name);
    label.position.y = 0.28;
    this.healthBar.add(background, this.healthFill, label);
    this.healthBar.position.y = this.look.height + 0.35;
    this.root.add(this.healthBar);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  get hitRange(): number {
    return this.type.attackRange + PLAYER_RANGE_ADVANTAGE;
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  // True once the death animation has played and the enemy can be removed.
  get isGone(): boolean {
    return this.isDead && this.deathTime >= DEATH_REMOVE_TIME;
  }

  takeDamage(amount: number): void {
    if (this.isDead) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.flashTimer = HIT_FLASH_TIME;

    if (this.isDead) {
      this.pendingHit = -1;
      this.healthBar.visible = false;
      this.model.playOnce(this.look.clips.death, undefined, true);
      this.onEvent('death', this);
    } else if (!this.model.isPlayingOnce) {
      this.model.playOnce(this.look.clips.hit, 0.4);
    }
  }

  // Shrinks the fill from the right and turns the bar to face the camera.
  updateHealthBar(camera: THREE.Camera): void {
    const ratio = this.health / this.maxHealth;
    this.healthFill.scale.x = Math.max(ratio, 0.001);
    this.healthFill.position.x = (-(1 - ratio) * this.healthBarWidth) / 2;

    // The bar is a child of the turning body, so undo the body's rotation first.
    this.healthBar.quaternion.copy(this.root.quaternion).invert().multiply(camera.quaternion);
  }

  update(delta: number, player: Player, world: World): void {
    this.flashTimer -= delta;
    this.model.setFlash(this.flashTimer > 0 ? HIT_FLASH_COLOR : null);
    this.model.update(delta);

    if (this.isDead) {
      this.deathTime += delta;
      return;
    }

    this.cooldown -= delta;
    const distance = flatDistance(this.position, player.position);

    // The hit lands partway through the attack animation, if the player is still close.
    if (this.pendingHit >= 0) {
      this.pendingHit -= delta;
      if (this.pendingHit < 0 && !player.isDead && distance <= this.type.attackRange + 0.5) {
        player.takeDamage(this.type.damage);
      }
    }

    if (player.isDead) {
      this.model.setLoop(this.look.clips.idle);
      return;
    }

    if (distance <= this.type.attackRange) {
      faceToward(this.root, player.position);
      this.model.setLoop(this.look.clips.idle);
      if (this.cooldown <= 0) {
        this.model.playOnce(this.look.clips.attack, ATTACK_TIME);
        this.onEvent('attack', this);
        this.pendingHit = ATTACK_HIT_DELAY;
        this.cooldown = this.type.attackCooldown;
      }
    } else if (distance <= this.type.detectRange) {
      if (!this.chasing) {
        this.chasing = true;
        this.onEvent('alert', this);
      }
      moveToward(this.root, player.position, this.type.moveSpeed * delta);
      this.model.setLoop(this.look.clips.move);
    } else {
      this.chasing = false;
      this.model.setLoop(this.look.clips.idle);
    }

    world.keepInside(this.root.position, this.radius);
  }
}
