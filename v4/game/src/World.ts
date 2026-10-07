import * as THREE from 'three';
import type { GameModels } from './Assets';
import { TIER_PROPS } from './Decor';

export const AREA_HALF_SIZE = 30;
const TREE_COUNT = 40;
const ROCK_COUNT = 20;
const CLEAR_CENTER_RADIUS = 5;
// Props keep this far from the centre (start, respawn and the Capitão).
const PROP_CLEAR_CENTER = 7;
const GROUND_TEXTURE_SIZE = 256;
// How many times the ground texture repeats across the map.
const GROUND_REPEAT = 8;

// The look of each row of maps (tier): row 1 (A B C) is bright, each row north is darker.
export interface TierLook {
  groundLight: string;
  groundDark: string;
  dirt: string;
  leaves: number;
  rock: number;
  trunk: number;
  sky: number;
  ambient: number;
  sun: number;
  // Fog: how far in front of the camera everything fades into the sky colour (smaller = foggier).
  fogFar: number;
  // Opacity of the low ground mist (0 = none).
  mist: number;
  // Darkness of the screen edges (0 = none).
  vignette: number;
  // Opacity of the fog clouds along the map edges.
  edgeFog: number;
  minimapGround: string;
}

export const TIER_LOOKS: TierLook[] = [
  { groundLight: '#6b8f52', groundDark: '#4d6b3a', dirt: '#7a6a48', leaves: 0x2f6b2f, rock: 0x888888,
    trunk: 0x7a5230, sky: 0x87ceeb, ambient: 0.4, sun: 1.25, fogFar: 95, mist: 0, vignette: 0.25, edgeFog: 0.6,
    minimapGround: '#3c4a30' },
  { groundLight: '#5a7a46', groundDark: '#405a31', dirt: '#5f5238', leaves: 0x285a2a, rock: 0x777777,
    trunk: 0x684528, sky: 0x6c9cb8, ambient: 0.34, sun: 1.1, fogFar: 80, mist: 0.1, vignette: 0.4, edgeFog: 0.7,
    minimapGround: '#33402a' },
  { groundLight: '#4a5c3e', groundDark: '#34432b', dirt: '#4a4030', leaves: 0x1f4423, rock: 0x666468,
    trunk: 0x553a22, sky: 0x4f6478, ambient: 0.27, sun: 0.92, fogFar: 68, mist: 0.14, vignette: 0.55, edgeFog: 0.8,
    minimapGround: '#2b3424' },
  { groundLight: '#3b4234', groundDark: '#2a3025', dirt: '#3a3328', leaves: 0x18301b, rock: 0x55525a,
    trunk: 0x45301e, sky: 0x2e3442, ambient: 0.2, sun: 0.75, fogFar: 58, mist: 0.18, vignette: 0.7, edgeFog: 0.9,
    minimapGround: '#22281d' },
];

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
  kind: 'tree' | 'rock' | 'npc' | 'decor';
}

// Seeded random so layouts are the same on every load.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export class World {
  readonly ground: THREE.Mesh;
  obstacles: Obstacle[] = [];
  private readonly scene: THREE.Scene;
  private readonly models: GameModels;
  // Shared by all trees and rocks so a tier change recolours them at once.
  private readonly groundCanvas = document.createElement('canvas');
  private readonly groundTexture: THREE.CanvasTexture;
  private readonly outerGroundMaterial = new THREE.MeshStandardMaterial();
  private readonly leavesMaterial = new THREE.MeshStandardMaterial({ flatShading: true });
  private readonly rockMaterial = new THREE.MeshStandardMaterial({ flatShading: true });
  private readonly trunkMaterial = new THREE.MeshStandardMaterial();
  private readonly trunkGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1);
  private readonly leavesGeometry = new THREE.ConeGeometry(0.9, 2, 8);
  // The current tier's props (graves, dead trees, ...), replaced when the tier changes.
  private decor = new THREE.Group();
  private tier = -1;

  constructor(scene: THREE.Scene, models: GameModels) {
    this.scene = scene;
    this.models = models;
    this.groundTexture = this.createGroundTexture();
    this.ground = this.createGround();
    scene.add(this.ground);
    this.createBorder();

    const random = seededRandom(12345);
    const randomPosition = (): [number, number] => {
      const limit = AREA_HALF_SIZE - 2;
      while (true) {
        const x = (random() * 2 - 1) * limit;
        const z = (random() * 2 - 1) * limit;
        if (Math.hypot(x, z) > CLEAR_CENTER_RADIUS) {
          return [x, z];
        }
      }
    };
    for (let i = 0; i < TREE_COUNT; i++) {
      const [x, z] = randomPosition();
      this.addTree(x, z, true);
    }
    for (let i = 0; i < ROCK_COUNT; i++) {
      const [x, z] = randomPosition();
      this.addRock(x, z, 0.6 + random() * 0.6);
    }

    scene.add(this.decor);
    this.setTier(0);
  }

  // Restyles the map for a row of maps (0 = bottom row): ground, trees, rocks and props.
  setTier(tier: number): void {
    if (tier === this.tier) {
      return;
    }
    this.tier = tier;
    const look = TIER_LOOKS[tier];
    this.drawGround(look);
    this.outerGroundMaterial.color.set(look.groundDark).multiplyScalar(0.7);
    this.leavesMaterial.color.setHex(look.leaves);
    this.rockMaterial.color.setHex(look.rock);
    this.trunkMaterial.color.setHex(look.trunk);
    this.placeProps(tier);
  }

  // Adds something solid that characters can't walk through (e.g. an NPC).
  addObstacle(obstacle: Obstacle): void {
    this.obstacles.push(obstacle);
  }

  // A random spot that is clear of obstacles and at least minDistance from `awayFrom`.
  randomFreePosition(awayFrom: THREE.Vector3, minDistance: number): THREE.Vector3 {
    const limit = AREA_HALF_SIZE - 2;
    while (true) {
      const x = (Math.random() * 2 - 1) * limit;
      const z = (Math.random() * 2 - 1) * limit;
      const farEnough = Math.hypot(x - awayFrom.x, z - awayFrom.z) >= minDistance;
      if (farEnough && this.isClear(x, z, 1)) {
        return new THREE.Vector3(x, 0, z);
      }
    }
  }

  // The spot nearest to (x, z) with no obstacle within `clearance`, searching outward in rings.
  nearestClearSpot(x: number, z: number, clearance: number): THREE.Vector3 {
    const limit = AREA_HALF_SIZE - 2;
    for (let ring = 0; ring <= 12; ring++) {
      for (let i = 0; i < Math.max(1, ring * 8); i++) {
        const angle = (i / Math.max(1, ring * 8)) * Math.PI * 2;
        const px = THREE.MathUtils.clamp(x + Math.cos(angle) * ring, -limit, limit);
        const pz = THREE.MathUtils.clamp(z + Math.sin(angle) * ring, -limit, limit);
        if (this.isClear(px, pz, clearance)) {
          return new THREE.Vector3(px, 0, pz);
        }
      }
    }
    return new THREE.Vector3(x, 0, z);
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

  private isClear(x: number, z: number, clearance: number): boolean {
    return this.obstacles.every((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) > obstacle.radius + clearance);
  }

  // Scatters the tier's props at seeded random spots, clear of obstacles and the centre.
  private placeProps(tier: number): void {
    this.scene.remove(this.decor);
    this.decor = new THREE.Group();
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.kind !== 'decor');

    const random = seededRandom(1000 + tier * 97);
    const limit = AREA_HALF_SIZE - 2;
    for (const rule of TIER_PROPS[tier]) {
      for (let i = 0; i < rule.count; i++) {
        // A few tries to find a free spot; skip the prop if the map is too crowded there.
        for (let attempt = 0; attempt < 20; attempt++) {
          const x = (random() * 2 - 1) * limit;
          const z = (random() * 2 - 1) * limit;
          const room = (rule.solid ?? 0.3) + 1;
          if (Math.hypot(x, z) < PROP_CLEAR_CENTER || !this.isClear(x, z, room)) {
            continue;
          }
          const prop = this.models[rule.model].scene.clone();
          prop.scale.setScalar(rule.scale);
          prop.position.set(x, 0, z);
          prop.rotation.y = random() * Math.PI * 2;
          prop.traverse((child) => {
            child.castShadow = true;
          });
          this.decor.add(prop);
          if (rule.solid) {
            this.obstacles.push({ x, z, radius: rule.solid, kind: 'decor' });
          }
          break;
        }
      }
    }
    this.scene.add(this.decor);
  }

  private createGround(): THREE.Mesh {
    const size = AREA_HALF_SIZE * 2;
    const material = new THREE.MeshStandardMaterial({ map: this.groundTexture });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    return ground;
  }

  private createGroundTexture(): THREE.CanvasTexture {
    this.groundCanvas.width = GROUND_TEXTURE_SIZE;
    this.groundCanvas.height = GROUND_TEXTURE_SIZE;
    const texture = new THREE.CanvasTexture(this.groundCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Mottled ground: soft patches of dark grass and dirt over the base colour. Patches near an
  // edge are also drawn on the opposite edge so the texture tiles without seams.
  private drawGround(look: TierLook): void {
    const size = GROUND_TEXTURE_SIZE;
    const ctx = this.groundCanvas.getContext('2d')!;
    ctx.fillStyle = look.groundLight;
    ctx.fillRect(0, 0, size, size);

    const random = seededRandom(777);
    const patch = (color: string, count: number, maxRadius: number, alpha: number): void => {
      for (let i = 0; i < count; i++) {
        const x = random() * size;
        const y = random() * size;
        const radius = 4 + random() * maxRadius;
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            const gradient = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, radius);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            ctx.globalAlpha = alpha;
            ctx.fillStyle = gradient;
            ctx.fillRect(x + ox - radius, y + oy - radius, radius * 2, radius * 2);
          }
        }
      }
    };
    patch(look.groundDark, 45, 40, 0.35);
    patch(look.dirt, 20, 28, 0.3);
    patch(look.groundDark, 70, 8, 0.25);
    ctx.globalAlpha = 1;
    this.groundTexture.needsUpdate = true;
  }

  // Past the walkable area: darker ground and a ring of trees, so the edge fades into the fog
  // instead of showing the sky.
  private createBorder(): void {
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), this.outerGroundMaterial);
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.05;
    outer.receiveShadow = true;
    this.scene.add(outer);

    const random = seededRandom(4242);
    for (let along = -AREA_HALF_SIZE - 8; along <= AREA_HALF_SIZE + 8; along += 2.6) {
      for (let row = 0; row < 2; row++) {
        const out = AREA_HALF_SIZE + 2 + row * 3 + random() * 2;
        const jitter = random() * 1.5;
        this.addTree(along + jitter, -out, false);
        this.addTree(along + jitter, out, false);
        this.addTree(-out, along + jitter, false);
        this.addTree(out, along + jitter, false);
      }
    }
  }

  private addRock(x: number, z: number, radius: number): void {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius), this.rockMaterial);
    rock.position.set(x, radius * 0.6, z);
    rock.castShadow = true;
    this.scene.add(rock);
    this.obstacles.push({ x, z, radius, kind: 'rock' });
  }

  // `solid` trees block movement; border trees are scenery only.
  private addTree(x: number, z: number, solid: boolean): void {
    const trunk = new THREE.Mesh(this.trunkGeometry, this.trunkMaterial);
    trunk.position.set(x, 0.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leaves = new THREE.Mesh(this.leavesGeometry, this.leavesMaterial);
    leaves.position.set(x, 2, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    if (solid) {
      this.obstacles.push({ x, z, radius: 0.6, kind: 'tree' });
    }
  }
}
