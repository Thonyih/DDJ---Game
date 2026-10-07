import * as THREE from 'three';
import { createHitbox } from './Hitbox';

const GOLD = 0xe2b84a;
const FLOAT_HEIGHT = 1.1;

// A mission item lying on the ground (travel missions): floats, spins and glows so it can be spotted.
export class Pickup {
  readonly root = new THREE.Group();
  readonly name: string;
  // Invisible, larger shape that catches clicks.
  readonly hitbox = createHitbox(1.2, 2.2);
  private readonly item = new THREE.Group();

  constructor(name: string, position: THREE.Vector3) {
    this.name = name;
    const gold = new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.5, metalness: 0.4 });

    if (name.includes('Relic')) {
      // A gold cross of the Order.
      this.item.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.12), gold));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), gold);
      arm.position.y = 0.15;
      this.item.add(arm);
    } else {
      // Astrolabe: two crossed gold rings.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 24), gold);
      const ring2 = ring.clone();
      ring2.rotation.y = Math.PI / 2;
      this.item.add(ring, ring2);
    }
    this.item.position.y = FLOAT_HEIGHT;
    this.item.traverse((child) => {
      child.castShadow = true;
    });

    // Soft gold light on the ground under it.
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 24),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;

    this.root.add(this.item, glow, this.hitbox);
    this.root.position.set(position.x, 0, position.z);
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  update(time: number): void {
    this.item.rotation.y = time * 1.5;
    this.item.position.y = FLOAT_HEIGHT + Math.sin(time * 2) * 0.12;
  }
}
