import * as THREE from 'three';
import { AREA_HALF_SIZE } from './World';

const PUFF_SPACING = 3; // along each edge
const TEXTURE_SIZE = 128;

// A soft, slightly lumpy cloud: a few overlapping round blobs fading to transparent.
function createPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const c = TEXTURE_SIZE / 2;
  for (let i = 0; i < 6; i++) {
    const x = c + (Math.random() - 0.5) * 30;
    const y = c + (Math.random() - 0.5) * 20;
    const radius = 30 + Math.random() * 25;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
  return new THREE.CanvasTexture(canvas);
}

interface Puff {
  sprite: THREE.Sprite;
  base: THREE.Vector3;
  phase: number;
}

// Thick fog along the four edges of the map: billowing cloud puffs that drift and bob slowly.
export class EdgeFog {
  private readonly material: THREE.SpriteMaterial;
  private readonly puffs: Puff[] = [];

  constructor(scene: THREE.Scene) {
    this.material = new THREE.SpriteMaterial({
      map: createPuffTexture(),
      transparent: true,
      depthWrite: false,
    });

    const edge = AREA_HALF_SIZE;
    for (let along = -edge - 6; along <= edge + 6; along += PUFF_SPACING) {
      // Two rows per edge: one on the border, one just outside it.
      for (const out of [edge + 0.5, edge + 4]) {
        for (const [x, z] of [[along, -out], [along, out], [-out, along], [out, along]]) {
          const sprite = new THREE.Sprite(this.material);
          const size = 7 + Math.random() * 5;
          sprite.scale.set(size, size * 0.6, 1);
          const base = new THREE.Vector3(x + (Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, z + (Math.random() - 0.5) * 2);
          sprite.position.copy(base);
          scene.add(sprite);
          this.puffs.push({ sprite, base, phase: Math.random() * Math.PI * 2 });
        }
      }
    }
  }

  // Colour follows the tier's fog; thicker in the northern rows.
  setLook(color: number, opacity: number): void {
    this.material.color.setHex(color).lerp(new THREE.Color(0xffffff), 0.3);
    this.material.opacity = opacity;
  }

  update(time: number): void {
    for (const puff of this.puffs) {
      const t = time * 0.25 + puff.phase;
      puff.sprite.position.set(
        puff.base.x + Math.sin(t) * 0.8,
        puff.base.y + Math.sin(t * 1.3) * 0.3,
        puff.base.z + Math.cos(t * 0.8) * 0.8,
      );
    }
  }
}
