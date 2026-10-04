import * as THREE from 'three';

export const AREA_HALF_SIZE = 30;
const TREE_COUNT = 40;
const ROCK_COUNT = 20;
const CLEAR_CENTER_RADIUS = 5;

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
  kind: 'tree' | 'rock';
}

// Seeded random so the world layout is the same on every load.
let seed = 12345;
function random(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomPosition(): [number, number] {
  const limit = AREA_HALF_SIZE - 2;
  while (true) {
    const x = (random() * 2 - 1) * limit;
    const z = (random() * 2 - 1) * limit;
    if (Math.hypot(x, z) > CLEAR_CENTER_RADIUS) {
      return [x, z];
    }
  }
}

export class World {
  readonly ground: THREE.Mesh;
  readonly obstacles: Obstacle[] = [];

  constructor(scene: THREE.Scene) {
    this.ground = this.createGround();
    scene.add(this.ground);

    for (let i = 0; i < TREE_COUNT; i++) {
      const [x, z] = randomPosition();
      this.addTree(scene, x, z);
    }
    for (let i = 0; i < ROCK_COUNT; i++) {
      const [x, z] = randomPosition();
      this.addRock(scene, x, z, 0.6 + random() * 0.6);
    }
  }

  // A random spot that is clear of obstacles and at least minDistance from `awayFrom`.
  randomFreePosition(awayFrom: THREE.Vector3, minDistance: number): THREE.Vector3 {
    const limit = AREA_HALF_SIZE - 2;
    while (true) {
      const x = (Math.random() * 2 - 1) * limit;
      const z = (Math.random() * 2 - 1) * limit;
      const farEnough = Math.hypot(x - awayFrom.x, z - awayFrom.z) >= minDistance;
      const clear = this.obstacles.every(
        (obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) > obstacle.radius + 1,
      );
      if (farEnough && clear) {
        return new THREE.Vector3(x, 0, z);
      }
    }
  }

  // Keeps a character inside the area and outside obstacles.
  keepInside(position: THREE.Vector3, radius: number): void {
    const limit = AREA_HALF_SIZE - radius;
    position.x = THREE.MathUtils.clamp(position.x, -limit, limit);
    position.z = THREE.MathUtils.clamp(position.z, -limit, limit);

    for (const obstacle of this.obstacles) {
      const dx = position.x - obstacle.x;
      const dz = position.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      const minDistance = obstacle.radius + radius;

      if (distance > 0 && distance < minDistance) {
        position.x = obstacle.x + (dx / distance) * minDistance;
        position.z = obstacle.z + (dz / distance) * minDistance;
      }
    }
  }

  private createGround(): THREE.Mesh {
    const size = AREA_HALF_SIZE * 2;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({ map: this.createCheckerTexture(size / 2) });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    return ground;
  }

  private createCheckerTexture(repeat: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context not available');
    }

    context.fillStyle = '#6b8f52';
    context.fillRect(0, 0, 2, 2);
    context.fillStyle = '#4d6b3a';
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  private addRock(scene: THREE.Scene, x: number, z: number, radius: number): void {
    const geometry = new THREE.DodecahedronGeometry(radius);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true });
    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, radius * 0.6, z);
    scene.add(rock);
    this.obstacles.push({ x, z, radius, kind: 'rock' });
  }

  private addTree(scene: THREE.Scene, x: number, z: number): void {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 1),
      new THREE.MeshStandardMaterial({ color: 0x7a5230 }),
    );
    trunk.position.set(x, 0.5, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f6b2f, flatShading: true }),
    );
    leaves.position.set(x, 2, z);
    scene.add(leaves);

    this.obstacles.push({ x, z, radius: 0.6, kind: 'tree' });
  }
}
