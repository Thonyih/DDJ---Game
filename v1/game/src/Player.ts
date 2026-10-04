import * as THREE from 'three';
import { Input } from './Input';

const MOVE_SPEED = 5; // units per second
const ROTATE_SPEED = 3; // radians per second
const GRAVITY = -20; // units per second squared
const JUMP_SPEED = 8; // units per second
const GROUND_Y = 1;

export class Player {
  readonly mesh: THREE.Mesh;
  private velocityY = 0;
  private grounded = true;

  constructor() {
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x3388ff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, GROUND_Y, 0);

    // Marks the front of the capsule so turning is visible.
    const noseGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.2, -0.6);
    this.mesh.add(nose);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get facing(): number {
    return this.mesh.rotation.y;
  }

  update(delta: number, input: Input): void {
    this.updateRotation(delta, input);
    this.updateMovement(delta, input);
    this.updateJump(delta, input);
  }

  private updateRotation(delta: number, input: Input): void {
    if (input.left) {
      this.mesh.rotation.y += ROTATE_SPEED * delta;
    }
    if (input.right) {
      this.mesh.rotation.y -= ROTATE_SPEED * delta;
    }
  }

  private updateMovement(delta: number, input: Input): void {
    const moveAmount = Number(input.forward) - Number(input.backward);
    if (moveAmount === 0) {
      return;
    }

    const forwardDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.mesh.rotation.y,
    );

    this.mesh.position.addScaledVector(forwardDirection, moveAmount * MOVE_SPEED * delta);
  }

  private updateJump(delta: number, input: Input): void {
    if (input.jump && this.grounded) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
    }

    this.velocityY += GRAVITY * delta;
    this.mesh.position.y += this.velocityY * delta;

    if (this.mesh.position.y <= GROUND_Y) {
      this.mesh.position.y = GROUND_Y;
      this.velocityY = 0;
      this.grounded = true;
    }
  }
}
