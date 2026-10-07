import * as THREE from 'three';
import type { Attackable } from './Attackable';
import { createNameLabel } from './Label';
import type { RemotePlayerState } from './Network';
import { Sword } from './Sword';

const GROUND_Y = 1;
// All knights share one color; players are told apart by their names.
export const KNIGHT_COLOR = 0x3388ff;
// How quickly the model catches up with the latest received position (higher = snappier).
const SMOOTHING = 12;
// Farther jumps than this (respawn, travel) snap instead of sliding across the map.
const SNAP_DISTANCE = 5;
// How close the player must be to hit another knight (the server allows a bit more for lag).
const PVP_RANGE = 2.5;
const HIT_FLASH_TIME = 0.15;
const HEALTH_BAR_WIDTH = 1;
const HEALTH_BAR_HEIGHT = 0.12;

// Another player seen over the network. Moves smoothly toward the last position the server sent.
export class RemotePlayer implements Attackable {
  readonly root = new THREE.Group();
  readonly connectionId: string;
  readonly name: string;
  readonly hitRange = PVP_RANGE;
  health: number;
  maxHealth: number;
  private readonly onHit: (amount: number) => void;
  private readonly body: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly sword = new Sword();
  private readonly overhead = new THREE.Group();
  private readonly healthFill: THREE.Mesh;
  private readonly targetPosition = new THREE.Vector3();
  private targetRotation = 0;
  private flashTimer = 0;

  // onHit is called when the local player's swing lands on this knight; the server decides the rest.
  constructor(state: RemotePlayerState, onHit: (amount: number) => void) {
    this.connectionId = state.connectionId;
    this.name = state.username;
    this.health = state.health;
    this.maxHealth = state.maxHealth;
    this.onHit = onHit;

    this.material = new THREE.MeshStandardMaterial({ color: KNIGHT_COLOR });
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), this.material);
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xeadfc4 }),
    );
    nose.position.set(0, 0.2, 0.6);
    this.body.add(nose, this.sword.pivot, this.sword.trail);
    this.sword.setLevel(state.weaponLevel);

    // Name and health bar float above the knight and always face the camera.
    const label = createNameLabel(state.username);
    label.position.y = 0.2;
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x330000 }),
    );
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0xff3333 }),
    );
    this.healthFill.position.z = 0.01;
    this.overhead.add(label, background, this.healthFill);
    this.overhead.position.y = 1.25;

    this.root.add(this.body, this.overhead);
    this.setTarget(state);
    this.root.position.copy(this.targetPosition);
    this.body.rotation.y = this.targetRotation;
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  // True if a raycast hit belongs to this knight.
  owns(object: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) {
      if (current === this.root) {
        return true;
      }
    }
    return false;
  }

  takeDamage(amount: number): void {
    this.onHit(amount);
  }

  setTarget(state: RemotePlayerState): void {
    this.targetPosition.set(state.x, GROUND_Y, state.z);
    this.targetRotation = state.rotation;
    if (this.root.position.distanceTo(this.targetPosition) > SNAP_DISTANCE) {
      this.root.position.copy(this.targetPosition);
    }
  }

  setStats(health: number, maxHealth: number, weaponLevel: number): void {
    this.health = health;
    this.maxHealth = maxHealth;
    this.sword.setLevel(weaponLevel);
  }

  // The server confirmed this knight swung its sword.
  playSwing(): void {
    this.sword.startSwing();
  }

  // The server confirmed this knight was hit.
  flash(): void {
    this.flashTimer = HIT_FLASH_TIME;
  }

  update(delta: number, camera: THREE.Camera): void {
    const t = 1 - Math.exp(-SMOOTHING * delta);
    this.root.position.lerp(this.targetPosition, t);

    // Turn the short way around.
    const turn = Math.atan2(
      Math.sin(this.targetRotation - this.body.rotation.y),
      Math.cos(this.targetRotation - this.body.rotation.y),
    );
    this.body.rotation.y += turn * t;

    this.sword.update(delta);
    this.flashTimer -= delta;
    this.material.emissive.setHex(this.flashTimer > 0 ? 0xff0000 : 0x000000);

    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    this.healthFill.scale.x = Math.max(ratio, 0.001);
    this.healthFill.position.x = (-(1 - ratio) * HEALTH_BAR_WIDTH) / 2;
    this.overhead.quaternion.copy(camera.quaternion);
  }
}
