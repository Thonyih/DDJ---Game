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

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context not available');
    }
    this.context = context;
  }

  draw(world: World, player: Player, enemies: Enemy[], exits: Direction[]): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.save();
    ctx.translate(MAP_SIZE / 2, MAP_SIZE / 2);
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#3c4a30';
    ctx.fillRect(-AREA_HALF_SIZE, -AREA_HALF_SIZE, AREA_HALF_SIZE * 2, AREA_HALF_SIZE * 2);

    for (const obstacle of world.obstacles) {
      ctx.fillStyle = obstacle.kind === 'tree' ? '#1f3320' : '#7a7470';
      this.drawDot(obstacle.x, obstacle.z, Math.max(obstacle.radius, 0.6));
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
    for (const enemy of enemies) {
      this.drawDot(enemy.position.x, enemy.position.z, Math.max(1, enemy.radius * 1.6));
    }

    ctx.fillStyle = '#f2d58a';
    this.drawDot(player.position.x, player.position.z, 1.4);

    ctx.restore();
  }

  private drawDot(x: number, z: number, radius: number): void {
    this.context.beginPath();
    this.context.arc(x, z, radius, 0, Math.PI * 2);
    this.context.fill();
  }
}
