import * as THREE from 'three';
import type { Enemy } from './Enemy';
import { faceToward, flatDistance, moveToward } from './Movement';
import { getMaxHealth, getWeaponDamage, playerData } from './PlayerData';
import { Sword } from './Sword';
import type { World } from './World';

const MOVE_SPEED = 5;
// The player always reaches slightly farther than the enemy it fights.
const RANGE_ADVANTAGE = 1.0;
const ATTACK_COOLDOWN = 0.8;
const RADIUS = 0.5;
const GROUND_Y = 1;
const HIT_FLASH_TIME = 0.15;
const HEAL_FLASH_TIME = 0.4;

export class Player {
  readonly mesh: THREE.Mesh;
  health = 0;
  private knownMaxHealth = 0;
  target: Enemy | null = null;
  private destination: THREE.Vector3 | null = null;
  private readonly sword = new Sword();
  private swingTarget: Enemy | null = null;
  private cooldown = 0;
  private flashTimer = 0;
  private flashColor = 0xff0000;
  private readonly material: THREE.MeshStandardMaterial;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({ color: 0x3388ff });
    this.mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), this.material);

    // Green marker on the front (+Z, the direction lookAt faces).
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
    );
    nose.position.set(0, 0.2, 0.6);
    this.mesh.add(nose);

    this.mesh.add(this.sword.pivot, this.sword.trail);

    this.reset();
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get maxHealth(): number {
    return getMaxHealth(playerData.healthLevel);
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  reset(): void {
    this.health = this.maxHealth;
    this.knownMaxHealth = this.maxHealth;
    this.target = null;
    this.destination = null;
    this.cooldown = 0;
    this.flashTimer = 0;
    this.swingTarget = null;
    this.sword.reset();
    this.mesh.position.set(0, GROUND_Y, 0);
    this.mesh.rotation.set(0, 0, 0);
  }

  // Instantly places the player, e.g. when arriving on a new map.
  teleport(x: number, z: number): void {
    this.mesh.position.set(x, GROUND_Y, z);
    this.destination = null;
    this.target = null;
  }

  // Moving keeps the current target, so the player can walk into range and attack.
  moveTo(point: THREE.Vector3): void {
    this.destination = new THREE.Vector3(point.x, GROUND_Y, point.z);
  }

  attack(enemy: Enemy): void {
    this.target = enemy;
  }

  isInAttackRange(enemy: Enemy): boolean {
    return flatDistance(this.position, enemy.position) <= enemy.type.attackRange + RANGE_ADVANTAGE;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.flashColor = 0xff0000;
    this.flashTimer = HIT_FLASH_TIME;
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
    // A health upgrade also adds the extra HP to current health.
    if (this.maxHealth > this.knownMaxHealth) {
      this.health += this.maxHealth - this.knownMaxHealth;
      this.knownMaxHealth = this.maxHealth;
    }

    this.cooldown -= delta;
    this.flashTimer -= delta;
    this.material.emissive.setHex(this.flashTimer > 0 ? this.flashColor : 0x000000);

    if (this.target && this.target.isDead) {
      this.target = null;
    }

    if (this.destination) {
      const arrived = moveToward(this.mesh, this.destination, MOVE_SPEED * delta);
      if (arrived) {
        this.destination = null;
      }
    }

    world.keepInside(this.mesh.position, RADIUS);

    this.sword.setLevel(playerData.weaponLevel);
    this.updateAttack();

    // Damage lands mid-swing, if the enemy is still alive and in range.
    const hit = this.sword.update(delta);
    const swingTarget = this.swingTarget;
    if (hit && swingTarget && !swingTarget.isDead && this.isInAttackRange(swingTarget)) {
      swingTarget.takeDamage(getWeaponDamage(playerData.weaponLevel));
    }
  }

  // Attacks the target whenever it is in range; never moves toward it.
  private updateAttack(): void {
    if (!this.target || !this.isInAttackRange(this.target)) {
      return;
    }

    if (!this.destination) {
      faceToward(this.mesh, this.target.position);
    }
    if (this.cooldown <= 0 && !this.sword.isSwinging) {
      this.sword.startSwing();
      this.swingTarget = this.target;
      this.cooldown = ATTACK_COOLDOWN;
    }
  }
}
