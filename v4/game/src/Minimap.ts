import type * as THREE from 'three';
import type { Enemy } from './Enemy';
import type { Direction } from './Maps';
import type { Player } from './Player';
import { AREA_HALF_SIZE, type World } from './World';

const MAP_SIZE = 220;
const SCALE = MAP_SIZE / (AREA_HALF_SIZE * 2);
const EXIT_LINE_WIDTH = 1.2;

// Top-down view: world -Z (north) is the top of the minimap, world +X (east) is the right.
export class Minimap {
  private readonly context: CanvasRenderingContext2D;
  private groundColor = '#3c4a30';

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context not available');
    }
    this.context = context;
  }

  // Darker for the northern rows of maps.
  setGroundColor(color: string): void {
    this.groundColor = color;
  }

  // `marker` is a travel mission's item on this map, drawn as a star.
  draw(world: World, player: Player, enemies: Enemy[], exits: Direction[], marker: THREE.Vector3 | null): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.save();
    ctx.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = this.groundColor;
    ctx.fillRect(-AREA_HALF_SIZE, -AREA_HALF_SIZE, AREA_HALF_SIZE * 2, AREA_HALF_SIZE * 2);

    for (const obstacle of world.obstacles) {
      if (obstacle.kind === 'npc') {
        continue; // drawn on top below
      }
      ctx.fillStyle = obstacle.kind === 'tree' ? '#1f3320' : '#7a7470';
      this.drawDot(obstacle.x, obstacle.z, Math.max(obstacle.radius, 0.6));
    }

    // NPCs (the mission-giver) as a gold dot with a dark ring.
    for (const obstacle of world.obstacles.filter((item) => item.kind === 'npc')) {
      ctx.fillStyle = '#000000';
      this.drawDot(obstacle.x, obstacle.z, 2);
      ctx.fillStyle = '#e2c27a';
      this.drawDot(obstacle.x, obstacle.z, 1.5);
    }

    // Borders that lead to another map are drawn in gold.
    ctx.fillStyle = '#c9a45c';
    const size = AREA_HALF_SIZE * 2;
    const far = AREA_HALF_SIZE - EXIT_LINE_WIDTH;
    for (const exit of exits) {
      if (exit === 'north') ctx.fillRect(-AREA_HALF_SIZE, -AREA_HALF_SIZE, size, EXIT_LINE_WIDTH);
      if (exit === 'south') ctx.fillRect(-AREA_HALF_SIZE, far, size, EXIT_LINE_WIDTH);
      if (exit === 'west') ctx.fillRect(-AREA_HALF_SIZE, -AREA_HALF_SIZE, EXIT_LINE_WIDTH, size);
      if (exit === 'east') ctx.fillRect(far, -AREA_HALF_SIZE, EXIT_LINE_WIDTH, size);
    }

    ctx.fillStyle = '#e03a3a';
    for (const enemy of enemies.filter((item) => !item.isDead)) {
      this.drawDot(enemy.position.x, enemy.position.z, Math.max(1, enemy.radius * 1.6));
    }

    if (marker) {
      this.drawStar(marker.x, marker.z);
    }

    // The player as an arrow pointing the way they face.
    const p = player.position;
    const d = player.facingDirection;
    ctx.fillStyle = '#f2d58a';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x + d.x * 2.4, p.z + d.z * 2.4);
    ctx.lineTo(p.x - d.x * 1.3 - d.z * 1.5, p.z - d.z * 1.3 + d.x * 1.5);
    ctx.lineTo(p.x - d.x * 0.6, p.z - d.z * 0.6);
    ctx.lineTo(p.x - d.x * 1.3 + d.z * 1.5, p.z - d.z * 1.3 - d.x * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Compass letters on the edges: north is the top of the minimap.
    ctx.font = 'bold 15px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    const edge = 11;
    const letters: [string, number, number][] = [
      ['N', MAP_SIZE / 2, edge],
      ['S', MAP_SIZE / 2, MAP_SIZE - edge],
      ['E', MAP_SIZE - edge, MAP_SIZE / 2],
      ['W', edge, MAP_SIZE / 2],
    ];
    for (const [letter, x, y] of letters) {
      ctx.strokeText(letter, x, y);
      ctx.fillStyle = letter === 'N' ? '#ff6b5a' : '#f2d58a';
      ctx.fillText(letter, x, y);
    }
  }

  private drawStar(x: number, z: number): void {
    const ctx = this.context;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? 2.8 : 1.2;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd34d';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.fill();
    ctx.stroke();
  }

  private drawDot(x: number, z: number, radius: number): void {
    this.context.beginPath();
    this.context.arc(x, z, radius, 0, Math.PI * 2);
    this.context.fill();
  }
}
