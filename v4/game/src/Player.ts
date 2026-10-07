import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { Enemy } from './Enemy';
import { KnightModel } from './KnightModel';
import { faceToward, flatDistance, moveToward } from './Movement';
import { BOW_RANGE, getBowDamage, getMaxHealth, getWeaponDamage, playerData, type WeaponKind } from './PlayerData';
import type { World } from './World';

const MOVE_SPEED = 5;
// Per weapon: the attack animation lasts `time`; the sword hits / the arrow is released at `hit`.
const ATTACKS = {
  sword: { animation: '1H_Melee_Attack_Slice_Horizontal', time: 0.6, hit: 0.3, cooldown: 0.8 },
  bow: { animation: '1H_Ranged_Shoot', time: 0.6, hit: 0.35, cooldown: 1.0 },
};
// How long the death animation is shown before respawning.
const DEATH_TIME = 2;
const RADIUS = 0.5;
// The player's position is at body height; the model's feet are moved down to the ground.
const GROUND_Y = 1;
const HIT_FLASH_TIME = 0.15;
const HEAL_FLASH_TIME = 0.4;

export interface PlayerEvents {
  // An arrow leaves the bow toward the target.
  onShootArrow: (target: Enemy, damage: number) => void;
  onSwing: () => void;
  onSwordHit: () => void;
  onHurt: () => void;
  onDeath: () => void;
}

export class Player {
  readonly root = new THREE.Group();
  health = 0;
  target: Enemy | null = null;
  private readonly model: KnightModel;
  private readonly events: PlayerEvents;
  private attackWeapon: WeaponKind = 'sword';
  private knownMaxHealth = 0;
  private destination: THREE.Vector3 | null = null;
  private swingTarget: Enemy | null = null;
  private attackTime = -1; // negative when not attacking
  private cooldown = 0;
  private deathTime = 0;
  private flashTimer = 0;
  private flashColor = 0xff0000;

  constructor(knight: GLTF, events: PlayerEvents) {
    this.events = events;
    this.model = new KnightModel(knight);
    this.model.object.position.y = -GROUND_Y;
    this.root.add(this.model.object);
    this.reset();
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  // The way the player faces, on the ground plane (unit vector).
  get facingDirection(): THREE.Vector3 {
    const direction = this.root.getWorldDirection(new THREE.Vector3());
    direction.y = 0;
    return direction.normalize();
  }

  get maxHealth(): number {
    return getMaxHealth(playerData.healthLevel);
  }

  get isMoving(): boolean {
    return this.destination !== null && !this.isDead;
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  // True once the death animation has been shown long enough.
  get readyToRespawn(): boolean {
    return this.isDead && this.deathTime >= DEATH_TIME;
  }

  reset(): void {
    this.health = this.maxHealth;
    this.knownMaxHealth = this.maxHealth;
    this.target = null;
    this.destination = null;
    this.cooldown = 0;
    this.flashTimer = 0;
    this.swingTarget = null;
    this.attackTime = -1;
    this.deathTime = 0;
    this.root.position.set(0, GROUND_Y, 0);
    this.root.rotation.set(0, 0, 0);
    this.model.cancelOnce();
    this.model.setLoop('Idle');
  }

  // Instantly places the player, e.g. when arriving on a new map.
  teleport(x: number, z: number): void {
    this.root.position.set(x, GROUND_Y, z);
    this.destination = null;
    this.target = null;
  }

  moveTo(point: THREE.Vector3): void {
    if (!this.isDead) {
      this.destination = new THREE.Vector3(point.x, GROUND_Y, point.z);
    }
  }

  attack(target: Enemy): void {
    this.target = target;
  }

  // Stops attacking; a swing already in progress won't deal damage.
  stopAttacking(): void {
    this.target = null;
    this.swingTarget = null;
  }

  get weapon(): WeaponKind {
    return playerData.selectedWeapon;
  }

  selectWeapon(weapon: WeaponKind): void {
    playerData.selectedWeapon = weapon;
    this.model.showWeapon(weapon);
  }

  // The bow reaches much farther than the sword.
  isInAttackRange(target: Enemy): boolean {
    const range = this.weapon === 'bow' ? BOW_RANGE : target.hitRange;
    return flatDistance(this.position, target.position) <= range;
  }

  // Opening a chest or talking to someone.
  interact(): void {
    if (!this.isDead) {
      this.model.playOnce('Interact', 0.8);
    }
  }

  cheer(): void {
    if (!this.isDead) {
      this.model.playOnce('Cheer');
    }
  }

  takeDamage(amount: number): void {
    if (this.isDead) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.flashColor = 0xff0000;
    this.flashTimer = HIT_FLASH_TIME;

    if (this.isDead) {
      this.destination = null;
      this.stopAttacking();
      this.model.playOnce('Death_A', undefined, true);
      this.events.onDeath();
      return;
    }
    this.events.onHurt();
    if (!this.model.isPlayingOnce) {
      this.model.playOnce('Hit_A', 0.4);
    }
  }

  // Returns how much health was actually restored.
  heal(amount: number): number {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.flashColor = 0x33ff66;
    this.flashTimer = HEAL_FLASH_TIME;
    return this.health - before;
  }

  update(delta: number, world: World): void {
    this.flashTimer -= delta;
    this.model.setFlash(this.flashTimer > 0 ? this.flashColor : null);
    this.model.setSwordLevel(playerData.weaponLevel);
    this.model.setBowLevel(playerData.bowLevel);
    this.model.showWeapon(this.weapon);
    this.model.update(delta);

    if (this.isDead) {
      this.deathTime += delta;
      return;
    }

    // A health upgrade also adds the extra HP to current health.
    if (this.maxHealth > this.knownMaxHealth) {
      this.health += this.maxHealth - this.knownMaxHealth;
      this.knownMaxHealth = this.maxHealth;
    }

    this.cooldown -= delta;

    if (this.target && this.target.isDead) {
      this.target = null;
    }

    if (this.destination) {
      const arrived = moveToward(this.root, this.destination, MOVE_SPEED * delta);
      if (arrived) {
        this.destination = null;
      }
    }
    this.model.setLoop(this.destination ? 'Running_A' : 'Idle');

    world.keepInside(this.root.position, RADIUS);

    this.updateAttack(delta);
  }

  // Attacks the target whenever it is in range; never moves toward it.
  private updateAttack(delta: number): void {
    if (this.attackTime >= 0) {
      const attack = ATTACKS[this.attackWeapon];
      const before = this.attackTime;
      this.attackTime += delta;

      // Mid-attack the sword hits, or the bow releases an arrow, if the target is still valid.
      const swingTarget = this.swingTarget;
      if (before < attack.hit && this.attackTime >= attack.hit && swingTarget && !swingTarget.isDead
        && this.isInAttackRange(swingTarget)) {
        if (this.attackWeapon === 'sword') {
          swingTarget.takeDamage(getWeaponDamage(playerData.weaponLevel));
          this.events.onSwordHit();
        } else if (playerData.arrows > 0) {
          playerData.arrows -= 1;
          this.events.onShootArrow(swingTarget, getBowDamage(playerData.bowLevel));
        }
      }
      if (this.attackTime >= attack.time) {
        this.attackTime = -1;
      }
    }

    if (!this.target || !this.isInAttackRange(this.target)) {
      return;
    }

    if (!this.destination) {
      faceToward(this.root, this.target.position);
    }
    const outOfArrows = this.weapon === 'bow' && playerData.arrows <= 0;
    if (this.cooldown <= 0 && this.attackTime < 0 && !outOfArrows) {
      const attack = ATTACKS[this.weapon];
      this.model.playOnce(attack.animation, attack.time);
      if (this.weapon === 'sword') {
        this.events.onSwing();
      }
      this.attackWeapon = this.weapon;
      this.attackTime = 0;
      this.swingTarget = this.target;
      this.cooldown = attack.cooldown;
    }
  }
}
