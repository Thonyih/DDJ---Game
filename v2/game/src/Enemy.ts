import * as THREE from 'three';
import { faceToward, flatDistance, moveToward } from './Movement';
import type { Player } from './Player';
import type { World } from './World';

const HIT_FLASH_TIME = 0.15;
const HEALTH_BAR_HEIGHT = 0.12;
const LABEL_WIDTH = 2;

export interface EnemyType {
  // Each enemy gets one of these names at random.
  names: string[];
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  detectRange: number;
  attackRange: number;
  attackCooldown: number;
  size: [width: number, height: number, depth: number];
  color: number;
  hitFlashColor: number;
}

export const GRUNT: EnemyType = {
  names: [
    'Cavaleiro Fantasma',
    'Templário Perdido',
    'Corsário Espectral',
    'Marinheiro Naufragado',
    'Alma do Naufrágio',
    'Lobisomem',
    'Moura Encantada',
    'Bruxa',
    'Diabrete',
    'Mapinguari',
  ],
  maxHealth: 30,
  damage: 8,
  moveSpeed: 3,
  detectRange: 7,
  attackRange: 1.5,
  attackCooldown: 1.5,
  size: [0.9, 1.2, 0.9],
  color: 0xcc3333,
  hitFlashColor: 0xffffff,
};

export const ADAMASTOR: EnemyType = {
  names: ['Adamastor'],
  maxHealth: 250,
  damage: 15,
  moveSpeed: 2.2,
  detectRange: 10,
  attackRange: 2.4,
  attackCooldown: 2,
  size: [2.4, 3.2, 2.4],
  color: 0xf2f2f2,
  hitFlashColor: 0xff0000,
};

// Text drawn on a canvas and shown on a flat plane just above the health bar.
function createNameLabel(name: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context not available');
  }
  // Shrink the font until long names fit on the label.
  let fontSize = 56;
  context.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
  while (context.measureText(name).width > 490 && fontSize > 20) {
    fontSize -= 2;
    context.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = '#000000';
  context.strokeText(name, 256, 48);
  context.fillStyle = '#eadfc4';
  context.fillText(name, 256, 48);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(LABEL_WIDTH, LABEL_WIDTH * (96 / 512)),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  label.position.y = 0.28;
  return label;
}

export class Enemy {
  readonly type: EnemyType;
  readonly name: string;
  readonly mesh: THREE.Mesh;
  readonly maxHealth: number;
  readonly radius: number;
  health: number;
  private cooldown: number;
  private flashTimer = 0;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly healthBar = new THREE.Group();
  private readonly healthFill: THREE.Mesh;
  private readonly healthBarWidth: number;

  constructor(type: EnemyType, x: number, z: number) {
    this.type = type;
    this.name = type.names[Math.floor(Math.random() * type.names.length)];
    this.maxHealth = type.maxHealth;
    this.health = type.maxHealth;
    this.cooldown = type.attackCooldown;

    const [width, height, depth] = type.size;
    this.radius = width / 2;
    this.material = new THREE.MeshStandardMaterial({ color: type.color });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.material);
    this.mesh.position.set(x, height / 2, z);

    this.healthBarWidth = Math.max(1, width * 1.1);
    const background = new THREE.Mesh(
      new THREE.PlaneGeometry(this.healthBarWidth, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x330000 }),
    );
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(this.healthBarWidth, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0xff3333 }),
    );
    this.healthFill.position.z = 0.01;
    this.healthBar.add(background, this.healthFill, createNameLabel(this.name));
    this.healthBar.position.y = height / 2 + 0.5;
    this.mesh.add(this.healthBar);
  }

  // Shrinks the fill from the right and turns the bar to face the camera.
  updateHealthBar(camera: THREE.Camera): void {
    const ratio = this.health / this.maxHealth;
    this.healthFill.scale.x = Math.max(ratio, 0.001);
    this.healthFill.position.x = (-(1 - ratio) * this.healthBarWidth) / 2;

    // The bar is a child of the rotating body, so undo the body's rotation first.
    this.healthBar.quaternion.copy(this.mesh.quaternion).invert().multiply(camera.quaternion);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.flashTimer = HIT_FLASH_TIME;
  }

  update(delta: number, player: Player, world: World): void {
    this.cooldown -= delta;
    this.flashTimer -= delta;
    this.material.emissive.setHex(this.flashTimer > 0 ? this.type.hitFlashColor : 0x000000);

    if (player.isDead) {
      return;
    }

    const distance = flatDistance(this.position, player.position);

    if (distance <= this.type.attackRange) {
      faceToward(this.mesh, player.position);
      if (this.cooldown <= 0) {
        player.takeDamage(this.type.damage);
        this.cooldown = this.type.attackCooldown;
      }
    } else if (distance <= this.type.detectRange) {
      moveToward(this.mesh, player.position, this.type.moveSpeed * delta);
    }

    world.keepInside(this.mesh.position, this.radius);
  }
}
