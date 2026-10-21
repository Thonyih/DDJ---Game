import * as THREE from 'three';

// Bow size, colour and glow per bow level (Lv 1-4), like the sword. Also used for the inventory icon.
// It grows less than the sword because it is held in front of the knight's body.
export const BOW_LOOKS = [
  { size: 1, color: 0x8b5a2b, glow: 0 }, // Lv 1 plain wood
  { size: 1.15, color: 0x4e3018, glow: 0.05 }, // Lv 2 dark oak
  { size: 1.3, color: 0xe8c46a, glow: 0.25 }, // Lv 3 gilded
  { size: 1.45, color: 0x3b6fd6, glow: 0.45 }, // Lv 4 azulejo
];

const RADIUS = 0.85; // curve of the limbs, in the hand's units (the sword is about 1.8 long)
const ARC = 2; // radians of the curve covered by the bow

// A simple bow built from basic shapes. Held at the grip (the origin); the limbs run along ±Y.
export function createBow(): { bow: THREE.Group; woodMaterial: THREE.MeshStandardMaterial } {
  const woodMaterial = new THREE.MeshStandardMaterial({ color: BOW_LOOKS[0].color, roughness: 0.7 });
  const bow = new THREE.Group();

  // The limbs: part of a ring, centred on the grip and curving back toward the string.
  const limbs = new THREE.Mesh(new THREE.TorusGeometry(RADIUS, 0.06, 6, 24, ARC), woodMaterial);
  limbs.rotation.z = -ARC / 2;
  limbs.position.x = -RADIUS;
  bow.add(limbs);

  // The string between the two tips.
  const tipX = -RADIUS * (1 - Math.cos(ARC / 2));
  const tipY = RADIUS * Math.sin(ARC / 2);
  const string = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, tipY * 2, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xeadfc4 }),
  );
  string.position.x = tipX;
  bow.add(string);

  // Leather grip where the hand holds it.
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b2416 }),
  );
  bow.add(grip);

  return { bow, woodMaterial };
}

// An arrow flying toward its target. Built pointing along +Z, so lookAt aims it.
export function createArrowMesh(): THREE.Group {
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
  );
  shaft.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.5 }),
  );
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.48;
  const feather = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.1, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xa31d1d }),
  );
  feather.position.z = -0.35;
  arrow.add(shaft, head, feather);
  return arrow;
}
