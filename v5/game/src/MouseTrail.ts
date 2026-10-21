// A short gold trail that follows the mouse over the game and fades out behind it. When a gesture is
// recognised the trail flashes that gesture's colour, so the player sees what they drew.

const TRAIL_TIME = 0.35; // seconds a point stays visible
const TRAIL_WIDTH = 7;
const TRAIL_COLOR = '226, 194, 122'; // gold, as "r, g, b"
const FLASH_TIME = 0.5;

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

function now(): number {
  return performance.now() / 1000;
}

export class MouseTrail {
  // Drawn on its own canvas above the game (it ignores the mouse, so clicks go through).
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private points: TrailPoint[] = [];
  private flashColor = TRAIL_COLOR;
  private flashUntil = 0;

  constructor(gameCanvas: HTMLCanvasElement) {
    this.canvas.id = 'mouse-trail';
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    gameCanvas.addEventListener('pointermove', (event) => {
      this.points.push({ x: event.clientX, y: event.clientY, time: now() });
    });
    // Leaving the game (e.g. onto a panel) ends the trail there.
    gameCanvas.addEventListener('pointerleave', () => {
      this.points = [];
    });

    const loop = (): void => {
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Colours the trail for a moment, e.g. '230, 70, 50' for red.
  flash(color: string): void {
    this.flashColor = color;
    this.flashUntil = now() + FLASH_TIME;
  }

  private resize(): void {
    const ratio = window.devicePixelRatio;
    this.canvas.width = window.innerWidth * ratio;
    this.canvas.height = window.innerHeight * ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // Each piece of the trail gets thinner and more transparent the older it is.
  private draw(): void {
    const time = now();
    this.points = this.points.filter((point) => time - point.time <= TRAIL_TIME);
    const ctx = this.context;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const color = time < this.flashUntil ? this.flashColor : TRAIL_COLOR;
    ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(${color}, 0.8)`;
    ctx.shadowBlur = 10;
    for (let i = 1; i < this.points.length; i++) {
      const life = 1 - (time - this.points[i].time) / TRAIL_TIME;
      ctx.strokeStyle = `rgba(${color}, ${life * 0.85})`;
      ctx.lineWidth = TRAIL_WIDTH * life;
      ctx.beginPath();
      ctx.moveTo(this.points[i - 1].x, this.points[i - 1].y);
      ctx.lineTo(this.points[i].x, this.points[i].y);
      ctx.stroke();
    }
  }
}
