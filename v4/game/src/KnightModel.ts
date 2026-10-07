import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AnimatedModel } from './AnimatedModel';
import { BOW_LOOKS, createBow } from './Bow';
import type { WeaponKind } from './PlayerData';

// The knight carries several weapons and shields; only one sword and the badge shield stay visible.
export const KNIGHT_SPARE_GEAR = ['1H_Sword_Offhand', '2H_Sword', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield'];
const SWORD = '1H_Sword';
const SHIELD = 'Badge_Shield';
// The glTF loader removes dots from node names, so 'handslot.r' becomes 'handslotr'.
const RIGHT_HAND = THREE.PropertyBinding.sanitizeNodeName('handslot.r');

// Sword size, tint and glow per weapon level (Lv 1-4). Also used for the inventory icon.
export const SWORD_LOOKS = [
  { size: 1, color: 0xffffff, glow: 0 }, // Lv 1 plain
  { size: 1.25, color: 0xd8e4f0, glow: 0.1 }, // Lv 2 steel
  { size: 1.5, color: 0xe8c46a, glow: 0.25 }, // Lv 3 gilded
  { size: 1.8, color: 0x3b6fd6, glow: 0.45 }, // Lv 4 azulejo
];

interface Look {
  size: number;
  color: number;
  glow: number;
}

// The player's knight: holds either the sword and shield or the bow; both show their upgrade level.
export class KnightModel extends AnimatedModel {
  private readonly sword: THREE.Mesh;
  private readonly shield: THREE.Object3D;
  private readonly swordMaterial: THREE.MeshStandardMaterial;
  private readonly swordBaseScale: THREE.Vector3;
  private readonly bow: THREE.Group;
  private readonly bowMaterial: THREE.MeshStandardMaterial;
  private swordLevel = 0;
  private bowLevel = 0;
  private swordLook: Look = SWORD_LOOKS[0];
  private bowLook: Look = BOW_LOOKS[0];
  private weapon: WeaponKind | null = null;

  constructor(gltf: GLTF) {
    super(gltf, { height: 2.1, hide: KNIGHT_SPARE_GEAR });
    this.sword = this.object.getObjectByName(SWORD) as THREE.Mesh;
    this.shield = this.object.getObjectByName(SHIELD) as THREE.Object3D;
    this.swordMaterial = this.sword.material as THREE.MeshStandardMaterial;
    this.swordBaseScale = this.sword.scale.clone();

    const { bow, woodMaterial } = createBow();
    this.bow = bow;
    this.bowMaterial = woodMaterial;
    this.object.getObjectByName(RIGHT_HAND)!.add(this.bow);
    this.bow.traverse((child) => {
      child.castShadow = true;
    });
    this.showWeapon('sword');
  }

  // Sword and shield, or the bow.
  showWeapon(weapon: WeaponKind): void {
    if (weapon === this.weapon) {
      return;
    }
    this.weapon = weapon;
    this.sword.visible = weapon === 'sword';
    this.shield.visible = weapon === 'sword';
    this.bow.visible = weapon === 'bow';
  }

  // Upgrades make the sword bigger and change its colour.
  setSwordLevel(level: number): void {
    if (level === this.swordLevel) {
      return;
    }
    this.swordLevel = level;
    this.swordLook = SWORD_LOOKS[Math.min(level, SWORD_LOOKS.length) - 1];
    this.sword.scale.copy(this.swordBaseScale).multiplyScalar(this.swordLook.size);
    this.swordMaterial.color.setHex(this.swordLook.color);
    this.applyGlow();
  }

  // Same for the bow.
  setBowLevel(level: number): void {
    if (level === this.bowLevel) {
      return;
    }
    this.bowLevel = level;
    this.bowLook = BOW_LOOKS[Math.min(level, BOW_LOOKS.length) - 1];
    this.bow.scale.setScalar(this.bowLook.size);
    this.bowMaterial.color.setHex(this.bowLook.color);
    this.applyGlow();
  }

  protected override onFlashEnded(): void {
    this.applyGlow();
  }

  private applyGlow(): void {
    if (this.isFlashing) {
      return;
    }
    this.swordMaterial.emissive.setHex(this.swordLook.color);
    this.swordMaterial.emissiveIntensity = this.swordLook.glow;
    this.bowMaterial.emissive.setHex(this.bowLook.color);
    this.bowMaterial.emissiveIntensity = this.bowLook.glow;
  }
}
