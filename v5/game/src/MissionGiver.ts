import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AnimatedModel } from './AnimatedModel';
import { createHitbox } from './Hitbox';
import { createNameLabel } from './Label';

const NAME = 'Capitão da Ordem';
// Same spot on every map, near the centre where the player starts and respawns.
export const MISSION_GIVER_POSITION = new THREE.Vector3(3, 0, -3);
export const MISSION_GIVER_RADIUS = 0.6;
const HEIGHT = 2.5;
// The Barbarian model carries several weapons; he keeps one axe and his shield. The bear-fur hood
// is removed so he looks like a bald, grey-bearded veteran.
const HIDDEN_PARTS = ['1H_Axe_Offhand', '2H_Axe', 'Mug', 'Barbarian_Hat'];
const BOB_SPEED = 3;
// The order's colours on specific parts: crimson tunic, sleeves and cape, gold shield.
const CRIMSON = 0xe07070;
const PART_TINTS = {
  Barbarian_Body: CRIMSON,
  Barbarian_ArmLeft: CRIMSON,
  Barbarian_ArmRight: CRIMSON,
  Barbarian_Cape: 0xc03030,
  Barbarian_Round_Shield: 0xf0d080,
};

// The NPC that gives out missions (KayKit Barbarian). Shows a floating "!" while he has work.
export class MissionGiver {
  readonly root = new THREE.Group();
  // Invisible, larger shape that catches clicks.
  readonly hitbox = createHitbox(1, HEIGHT + 0.5);
  private readonly model: AnimatedModel;
  private readonly overhead = new THREE.Group();
  private readonly marker: THREE.Mesh;

  constructor(barbarian: GLTF) {
    this.model = new AnimatedModel(barbarian, { height: HEIGHT, hide: HIDDEN_PARTS, partTints: PART_TINTS });
    this.model.setLoop('Idle');
    // Turn his front toward the isometric camera (which looks from +x, +z).
    this.root.rotation.y = Math.PI / 4;

    // "!" marker: a bar and a dot.
    const gold = new THREE.MeshBasicMaterial({ color: 0xe2c27a });
    this.marker = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), gold);
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), gold);
    dot.position.y = -0.42;
    this.marker.add(dot);
    this.marker.position.y = 0.75;

    this.overhead.add(createNameLabel(NAME), this.marker);
    this.overhead.position.y = HEIGHT + 0.4;

    this.root.add(this.model.object, this.overhead, this.hitbox);
    this.root.position.copy(MISSION_GIVER_POSITION);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  // Plays a short gesture when the player talks to him.
  greet(): void {
    this.model.playOnce('Interact');
  }

  update(delta: number, time: number, camera: THREE.Camera, hasWork: boolean): void {
    this.model.update(delta);
    this.marker.visible = hasWork;
    this.marker.position.y = 0.75 + Math.sin(time * BOB_SPEED) * 0.08;

    // The overhead group is a child of the rotated root, so undo that rotation to face the camera.
    this.overhead.quaternion.copy(this.root.quaternion).invert().multiply(camera.quaternion);
  }
}
