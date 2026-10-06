import * as THREE from 'three';
import { createNameLabel } from './Label';
import type { RemotePlayerState } from './Network';

const GROUND_Y = 1;
// All knights share one color; players are told apart by their names.
export const KNIGHT_COLOR = 0x3388ff;
// How quickly the model catches up with the latest received position (higher = snappier).
const SMOOTHING = 12;
// Farther jumps than this (respawn, travel) snap instead of sliding across the map.
const SNAP_DISTANCE = 5;

// Another player seen over the network. Moves smoothly toward the last position the server sent.
export class RemotePlayer {
  readonly root = new THREE.Group();
  readonly username: string;
  private readonly body: THREE.Mesh;
  private readonly label: THREE.Mesh;
  private readonly targetPosition = new THREE.Vector3();
  private targetRotation = 0;

  constructor(state: RemotePlayerState) {
    this.username = state.username;

    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1, 4, 8),
      new THREE.MeshStandardMaterial({ color: KNIGHT_COLOR }),
    );
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xeadfc4 }),
    );
    nose.position.set(0, 0.2, 0.6);
    this.body.add(nose);

    this.label = createNameLabel(state.username);
    this.label.position.y = 1.4;

    this.root.add(this.body, this.label);
    this.setTarget(state);
    this.root.position.copy(this.targetPosition);
    this.body.rotation.y = this.targetRotation;
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  setTarget(state: RemotePlayerState): void {
    this.targetPosition.set(state.x, GROUND_Y, state.z);
    this.targetRotation = state.rotation;
    if (this.root.position.distanceTo(this.targetPosition) > SNAP_DISTANCE) {
      this.root.position.copy(this.targetPosition);
    }
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

    this.label.quaternion.copy(camera.quaternion);
  }
}
