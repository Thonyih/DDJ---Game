import * as THREE from 'three';
import type { Reward } from './Missions';

const GLOW_COLOR = 0xffc65a;
const PULSE_SPEED = 2.5;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Soft round gradient used for the glow, created once and shared by all chests.
let glowTexture: THREE.CanvasTexture | null = null;
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) {
    return glowTexture;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context not available');
  }
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

function createGlowMaterial<T extends THREE.MeshBasicMaterial | THREE.SpriteMaterial>(material: T): T {
  material.map = getGlowTexture();
  material.color.setHex(GLOW_COLOR);
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;
  return material;
}

export class Chest {
  readonly mesh: THREE.Mesh;
  readonly reward: Reward;
  private readonly goldMaterial: THREE.MeshStandardMaterial;
  private readonly groundGlowMaterial: THREE.MeshBasicMaterial;
  private readonly haloMaterial: THREE.SpriteMaterial;
  private readonly pulseOffset = Math.random() * Math.PI * 2;

  constructor(position: THREE.Vector3) {
    this.reward = { gold: randomInt(1, 3), spices: randomInt(15, 35) };

    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a2e17 });
    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.6,
      roughness: 0.4,
      emissive: GLOW_COLOR,
    });

    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood);
    this.mesh.position.set(position.x, 0.25, position.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.65), darkWood);
    lid.position.y = 0.35;
    this.mesh.add(lid);

    const band = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.68), this.goldMaterial);
    band.position.y = 0.1;
    this.mesh.add(band);

    this.groundGlowMaterial = createGlowMaterial(new THREE.MeshBasicMaterial());
    const groundGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), this.groundGlowMaterial);
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = -0.22;
    this.mesh.add(groundGlow);

    this.haloMaterial = createGlowMaterial(new THREE.SpriteMaterial());
    const halo = new THREE.Sprite(this.haloMaterial);
    halo.scale.set(1.8, 1.8, 1);
    halo.position.y = 0.2;
    this.mesh.add(halo);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  // True if the hit object is this chest or one of its parts.
  owns(object: THREE.Object3D): boolean {
    return object === this.mesh || object.parent === this.mesh;
  }

  // Slow pulse between 0 and 1 that drives the glow.
  updateGlow(time: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(time * PULSE_SPEED + this.pulseOffset);
    this.goldMaterial.emissiveIntensity = 0.1 + 0.3 * pulse;
    this.groundGlowMaterial.opacity = 0.25 + 0.2 * pulse;
    this.haloMaterial.opacity = 0.12 + 0.12 * pulse;
  }
}
