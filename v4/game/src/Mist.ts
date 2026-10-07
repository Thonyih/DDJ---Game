import * as THREE from 'three';

const SIZE = 100; // covers the map and a bit beyond
const TEXTURE_SIZE = 256;

// Soft white blobs on transparent, tiling without seams.
function createMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * TEXTURE_SIZE;
    const y = Math.random() * TEXTURE_SIZE;
    const radius = 20 + Math.random() * 50;
    for (const ox of [-TEXTURE_SIZE, 0, TEXTURE_SIZE]) {
      for (const oy of [-TEXTURE_SIZE, 0, TEXTURE_SIZE]) {
        const gradient = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x + ox - radius, y + oy - radius, radius * 2, radius * 2);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Low ground mist: two soft layers drifting slowly in different directions.
export class Mist {
  private readonly layers: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; drift: THREE.Vector2 }[] = [];

  constructor(scene: THREE.Scene) {
    const settings: [number, THREE.Vector2][] = [
      [0.35, new THREE.Vector2(0.006, 0.003)],
      [0.9, new THREE.Vector2(-0.004, 0.005)],
    ];
    for (const [height, drift] of settings) {
      const texture = createMistTexture();
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = height;
      mesh.renderOrder = 1;
      scene.add(mesh);
      this.layers.push({ mesh, material, drift });
    }
  }

  // Opacity 0 hides the mist; the colour matches the tier's fog.
  setLook(opacity: number, color: number): void {
    for (const layer of this.layers) {
      layer.material.opacity = opacity;
      layer.material.color.setHex(color).lerp(new THREE.Color(0xffffff), 0.25);
      layer.mesh.visible = opacity > 0;
    }
  }

  update(delta: number): void {
    for (const layer of this.layers) {
      const map = layer.material.map!;
      map.offset.x += layer.drift.x * delta;
      map.offset.y += layer.drift.y * delta;
    }
  }
}
