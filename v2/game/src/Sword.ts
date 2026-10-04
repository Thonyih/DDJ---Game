import * as THREE from 'three';

const SWING_TIME = 0.35;
// Point in the swing (0 to 1) where the blade passes in front and damage lands.
const HIT_MOMENT = 0.45;

// Poses as [pitch, yaw]. Yaw: negative = player's right side, positive = left side.
const REST_POSE: [number, number] = [-1.1, -0.4];
const WINDUP_POSE: [number, number] = [-0.6, -1.7];
const SLASH_END_POSE: [number, number] = [-0.2, 1.4];

const SIZE_PER_LEVEL = 0.08;
const MAX_SIZE = 1.4;

// Blade color and glow per weapon level; levels above the list use the last entry.
const BLADE_LOOKS = [
  { color: 0x8f969c, glow: 0 }, // Lv 1 iron
  { color: 0xd8dde3, glow: 0 }, // Lv 2 steel
  { color: 0xe8c46a, glow: 0.1 }, // Lv 3 gilded
  { color: 0xc23b3b, glow: 0.25 }, // Lv 4 blood
  { color: 0x3b6fd6, glow: 0.35 }, // Lv 5 azulejo
  { color: 0x9a5cf0, glow: 0.45 }, // Lv 6+ enchanted
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export class Sword {
  readonly pivot = new THREE.Group();
  readonly trail: THREE.Mesh;
  private readonly trailMaterial: THREE.MeshBasicMaterial;
  private readonly bladeMaterial: THREE.MeshStandardMaterial;
  private swingTime = -1; // negative when not swinging
  private level = 0;

  constructor() {
    // Tilt first, then turn around the vertical axis.
    this.pivot.rotation.order = 'YXZ';
    this.pivot.position.set(-0.55, 0.1, 0.15);

    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 0.3, roughness: 0.4 });
    this.bladeMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.35 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x3b2416 });

    // The sword points along local +Z from the hand.
    this.addPart(new THREE.BoxGeometry(0.08, 0.08, 0.25), leather, 0.05);
    this.addPart(new THREE.BoxGeometry(0.36, 0.06, 0.06), gold, 0.2);
    this.addPart(new THREE.BoxGeometry(0.1, 0.03, 1.0), this.bladeMaterial, 0.73);
    this.addPart(new THREE.SphereGeometry(0.06, 8, 8), gold, -0.1);

    // Half-ring in front of the player, from the right side to the left side.
    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.trail = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.7, 24, 1, Math.PI - 0.2, Math.PI + 0.4),
      this.trailMaterial,
    );
    this.trail.rotation.x = -Math.PI / 2;
    this.trail.position.y = 0.1;

    this.setLevel(1);
    this.reset();
  }

  // Bigger and a different color for each weapon level.
  setLevel(level: number): void {
    if (level === this.level) {
      return;
    }
    this.level = level;

    const size = Math.min(1 + (level - 1) * SIZE_PER_LEVEL, MAX_SIZE);
    this.pivot.scale.setScalar(size);
    this.trail.scale.setScalar(size);

    const look = BLADE_LOOKS[Math.min(level, BLADE_LOOKS.length) - 1];
    this.bladeMaterial.color.setHex(look.color);
    this.bladeMaterial.emissive.setHex(look.color);
    this.bladeMaterial.emissiveIntensity = look.glow;
    this.trailMaterial.color.setHex(look.color).lerp(new THREE.Color(0xffffff), 0.5);
  }

  get isSwinging(): boolean {
    return this.swingTime >= 0;
  }

  startSwing(): void {
    this.swingTime = 0;
  }

  reset(): void {
    this.swingTime = -1;
    this.applyPose(1);
  }

  // Advances the swing. Returns true on the frame the blade should hit.
  update(delta: number): boolean {
    if (!this.isSwinging) {
      return false;
    }

    const before = this.swingTime / SWING_TIME;
    this.swingTime += delta;
    const progress = Math.min(this.swingTime / SWING_TIME, 1);
    this.applyPose(progress);

    if (progress >= 1) {
      this.swingTime = -1;
    }
    return before < HIT_MOMENT && progress >= HIT_MOMENT;
  }

  // 0-0.25 wind up to the right, 0.25-0.7 slash to the left, 0.7-1 back to rest.
  private applyPose(progress: number): void {
    let from = REST_POSE;
    let to = WINDUP_POSE;
    let t = progress / 0.25;
    if (progress >= 0.7) {
      from = SLASH_END_POSE;
      to = REST_POSE;
      t = (progress - 0.7) / 0.3;
    } else if (progress >= 0.25) {
      from = WINDUP_POSE;
      to = SLASH_END_POSE;
      t = (progress - 0.25) / 0.45;
    }
    t = smooth(Math.min(t, 1));
    this.pivot.rotation.set(lerp(from[0], to[0], t), lerp(from[1], to[1], t), 0);

    const trailVisible = progress >= 0.25 && progress < 0.85;
    this.trail.visible = trailVisible;
    this.trailMaterial.opacity = trailVisible ? 0.45 * (1 - (progress - 0.25) / 0.6) : 0;
  }

  private addPart(geometry: THREE.BufferGeometry, material: THREE.Material, z: number): void {
    const part = new THREE.Mesh(geometry, material);
    part.position.z = z;
    this.pivot.add(part);
  }
}
