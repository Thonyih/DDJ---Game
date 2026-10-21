import * as THREE from 'three';

const SIZE = 110;
const LABEL_SPACE = 22;
const RADIUS = 40;
const LETTERS = ['N', 'E', 'S', 'W'];
const HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// World directions (north is world -Z, east is +X).
const NORTH = new THREE.Vector3(0, 0, -1);

// Angle on screen, clockwise from straight up, of a world direction seen from `from`.
function screenAngle(camera: THREE.Camera, from: THREE.Vector3, direction: THREE.Vector3): number {
  const a = from.clone().project(camera);
  const b = from.clone().add(direction).project(camera);
  const dx = (b.x - a.x) * window.innerWidth;
  const dy = (b.y - a.y) * window.innerHeight;
  return Math.atan2(dx, dy);
}

// Compass under the minimap. Its N points to where north is on screen (the camera looks
// diagonally), and the gold needle shows where the player is heading.
export class Compass {
  private readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SIZE;
    canvas.height = SIZE + LABEL_SPACE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context not available');
    }
    this.context = context;
  }

  draw(camera: THREE.Camera, playerPosition: THREE.Vector3, facing: THREE.Vector3): void {
    const ctx = this.context;
    const c = SIZE / 2;
    ctx.clearRect(0, 0, SIZE, SIZE + LABEL_SPACE);

    // Ring
    ctx.beginPath();
    ctx.arc(c, c, RADIUS + 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 11, 15, 0.85)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6e5833';
    ctx.stroke();

    // Letters, placed around the ring and turned to match the screen.
    const north = screenAngle(camera, playerPosition, NORTH);
    ctx.font = 'bold 14px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    LETTERS.forEach((letter, i) => {
      const angle = north + (i * Math.PI) / 2;
      ctx.fillStyle = letter === 'N' ? '#ff6b5a' : '#eadfc4';
      ctx.fillText(letter, c + Math.sin(angle) * RADIUS, c - Math.cos(angle) * RADIUS);
    });

    // Needle: where the player is heading.
    const heading = screenAngle(camera, playerPosition, facing);
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(heading);
    // Classic needle: gold half points the way the player is heading, grey tail behind.
    const tip = RADIUS - 12;
    ctx.beginPath();
    ctx.moveTo(0, -tip);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#e2c27a';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, tip * 0.7);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#6b6670';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(c, c, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#e2c27a';
    ctx.fill();

    // Heading in words, from the world direction (0 = north, clockwise).
    const bearing = (Math.atan2(facing.x, -facing.z) + Math.PI * 2) % (Math.PI * 2);
    const label = HEADINGS[Math.round(bearing / (Math.PI / 4)) % 8];
    ctx.font = 'bold 13px Cinzel, Georgia, serif';
    ctx.fillStyle = '#e2c27a';
    ctx.fillText(`Heading ${label}`, c, SIZE + LABEL_SPACE / 2 - 2);
  }
}
