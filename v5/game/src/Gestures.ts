// Recognises three mouse gestures from free mouse movement over the game (no button needed):
//   shake side to side -> onShake (called again while the shaking goes on)
//   draw a circle      -> onCircle
//   draw a "+"         -> onPlus (a horizontal line and a vertical line that cross near their middles)
// All distances are in screen pixels, all times in seconds.

export interface GestureCallbacks {
  onShake: () => void;
  onCircle: () => void;
  onPlus: () => void;
}

interface Point {
  x: number;
  y: number;
  time: number;
}

// A straight stretch of movement in one direction (e.g. left to right).
interface Line {
  horizontal: boolean;
  start: Point;
  end: Point;
}

// Mouse moves shorter than this are joined together (filters out jitter).
const MIN_STEP = 6;

// Shake and "+" must be drawn within this time; slower movement does nothing.
const GESTURE_TIME = 0.4;

// Shake: this many left/right turns, each after at least SHAKE_MIN_SWING pixels, within SHAKE_TIME.
const SHAKE_TURNS = 4;
const SHAKE_MIN_SWING = 60;
const SHAKE_TIME = GESTURE_TIME;
// Up/down movement allowed during a swing, as a share of its sideways movement.
const SHAKE_MAX_DRIFT = 0.5;

// Circle: the movement direction turns a full lap within CIRCLE_TIME, around a roughly round shape.
const CIRCLE_TIME = 0.3; // the circle (Dust Push) has its own, shorter limit
const CIRCLE_TURN = Math.PI * 2 * 0.8; // most of a lap is enough
const CIRCLE_MIN_SIZE = 120; // diameter
const CIRCLE_STEP = 12; // the circle path uses points at least this far apart (smooths shaky hands)
const CIRCLE_MAX_WOBBLE = 2; // total turning may be at most 2x the net turning
const CIRCLE_MAX_CORNER = (45 * Math.PI) / 180; // a circle has no sharp corners
const CIRCLE_MAX_SPREAD = 0.35; // how much the distance from the centre may vary

// Plus: two straight lines at least PLUS_MIN_LENGTH long, within PLUS_TIME, crossing in their middle part.
const PLUS_MIN_LENGTH = 140;
const PLUS_TIME = GESTURE_TIME; // from the start of the first line to the end of the second
const PLUS_MIDDLE = 0.25; // the crossing must be at least 25% away from each line's ends
const PLUS_MAX_SLANT = 0.2; // a line may drift sideways at most 20% of its length
const PLUS_MAX_LENGTH_RATIO = 2; // the two lines are about the same length

export class Gestures {
  private readonly callbacks: GestureCallbacks;
  private last: Point | null = null;

  // Shake
  private shakeDirection = 0;
  private shakeSwing = 0;
  private shakeDrift = 0;
  private shakeTurns: number[] = [];

  // Circle: recent points along the path.
  private circlePoints: Point[] = [];

  // Plus: the line being drawn now, and recently finished long lines.
  private line: Line | null = null;
  private lines: Line[] = [];

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.callbacks = callbacks;
    element.addEventListener('pointermove', (event) => {
      // The browser may bundle several mouse samples into one event; use them all, with their own
      // times, since a gesture only lasts a split second.
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of samples.length > 0 ? samples : [event]) {
        this.onMove(sample.clientX, sample.clientY, sample.timeStamp / 1000);
      }
    });
  }

  private onMove(x: number, y: number, time: number): void {
    const point = { x, y, time };
    if (!this.last) {
      this.last = point;
      return;
    }
    const dx = x - this.last.x;
    const dy = y - this.last.y;
    if (Math.hypot(dx, dy) < MIN_STEP) {
      return;
    }

    this.checkShake(dx, dy, point.time);
    this.checkCircle(point);
    this.checkPlus(dx, dy, point);
    this.last = point;
  }

  // Counts quick changes between moving left and moving right. A swing only counts if it was
  // mostly sideways (little up/down drift), so circles and diagonal moves are not shakes.
  private checkShake(dx: number, dy: number, time: number): void {
    const direction = Math.sign(dx);
    if (direction !== this.shakeDirection && Math.abs(dx) > Math.abs(dy)) {
      if (this.shakeSwing >= SHAKE_MIN_SWING && this.shakeDrift <= this.shakeSwing * SHAKE_MAX_DRIFT) {
        this.shakeTurns.push(time);
      }
      this.shakeDirection = direction;
      this.shakeSwing = 0;
      this.shakeDrift = 0;
    }
    if (direction === this.shakeDirection) {
      this.shakeSwing += Math.abs(dx);
    }
    this.shakeDrift += Math.abs(dy);

    this.shakeTurns = this.shakeTurns.filter((turn) => time - turn <= SHAKE_TIME);
    if (this.shakeTurns.length >= SHAKE_TURNS) {
      this.lines = []; // a shake's long sideways swings are not half of a "+"
      this.callbacks.onShake();
    }
  }

  // Walks back from the newest point adding up how much the movement direction turned. A full lap
  // in one smooth direction, around a round shape, is a circle.
  private checkCircle(point: Point): void {
    const previous = this.circlePoints[this.circlePoints.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < CIRCLE_STEP) {
      return;
    }
    this.circlePoints.push(point);
    this.circlePoints = this.circlePoints.filter((item) => point.time - item.time <= CIRCLE_TIME);
    const points = this.circlePoints;

    let turned = 0;
    let wobble = 0; // all turning, either way
    let first = -1;
    for (let i = points.length - 1; i >= 2; i--) {
      const turn = turnAt(points, i);
      if (Math.abs(turn) > CIRCLE_MAX_CORNER) {
        return; // a sharp corner: lines and zigzags, not a circle
      }
      turned += turn;
      wobble += Math.abs(turn);
      if (Math.abs(turned) >= CIRCLE_TURN) {
        first = i - 2;
        break;
      }
    }
    // No full lap yet, or a jittery path that turned back and forth.
    if (first < 0 || wobble > Math.abs(turned) * CIRCLE_MAX_WOBBLE) {
      return;
    }

    // Round: every point of the lap is about the same distance from its centre.
    const lap = points.slice(first);
    const centerX = lap.reduce((sum, item) => sum + item.x, 0) / lap.length;
    const centerY = lap.reduce((sum, item) => sum + item.y, 0) / lap.length;
    const radii = lap.map((item) => Math.hypot(item.x - centerX, item.y - centerY));
    const radius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
    const spread = Math.sqrt(radii.reduce((sum, value) => sum + (value - radius) ** 2, 0) / radii.length);
    if (radius * 2 >= CIRCLE_MIN_SIZE && spread <= radius * CIRCLE_MAX_SPREAD) {
      this.circlePoints = [];
      this.callbacks.onCircle();
    }
  }

  // Follows straight lines; a horizontal and a vertical line that cross near their middles is a "+".
  private checkPlus(dx: number, dy: number, point: Point): void {
    const horizontal = Math.abs(dx) > Math.abs(dy) * 3;
    const vertical = Math.abs(dy) > Math.abs(dx) * 3;
    const continues = this.line
      && ((this.line.horizontal && horizontal && Math.sign(dx) === Math.sign(this.line.end.x - this.line.start.x))
        || (!this.line.horizontal && vertical && Math.sign(dy) === Math.sign(this.line.end.y - this.line.start.y)));

    if (this.line && continues) {
      this.line.end = point;
    } else {
      // The current line ended: keep it if it was long and straight enough.
      if (this.line && isLongStraight(this.line)) {
        this.lines.push(this.line);
      }
      this.line = horizontal || vertical ? { horizontal, start: this.last!, end: point } : null;
    }

    // Both lines must have been drawn within the time limit. The line being drawn counts too, so
    // the "+" works even if the mouse stops right after it.
    this.lines = this.lines.filter((line) => point.time - line.start.time <= PLUS_TIME);
    const current = this.line && isLongStraight(this.line) && point.time - this.line.start.time <= PLUS_TIME
      ? [this.line] : [];
    if (hasCrossingLines([...this.lines, ...current])) {
      this.lines = [];
      this.line = null;
      this.callbacks.onPlus();
    }
  }
}

// How much the movement direction turned at point i (between -180° and 180°).
function turnAt(points: Point[], i: number): number {
  const before = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
  const after = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
  let turn = after - before;
  if (turn > Math.PI) turn -= Math.PI * 2;
  if (turn < -Math.PI) turn += Math.PI * 2;
  return turn;
}

function lineLength(line: Line): number {
  return Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
}

function hasCrossingLines(lines: Line[]): boolean {
  const across = lines.filter((line) => line.horizontal);
  const down = lines.filter((line) => !line.horizontal);
  return across.some((a) => down.some((d) => crossInMiddle(a, d)));
}

function isLongStraight(line: Line): boolean {
  return lineLength(line) >= PLUS_MIN_LENGTH && isStraight(line);
}

// A horizontal line barely moves up/down overall (and a vertical one barely sideways).
function isStraight(line: Line): boolean {
  const along = line.horizontal ? line.end.x - line.start.x : line.end.y - line.start.y;
  const across = line.horizontal ? line.end.y - line.start.y : line.end.x - line.start.x;
  return Math.abs(across) <= Math.abs(along) * PLUS_MAX_SLANT;
}

// True if the horizontal line `a` and the vertical line `d` are about the same length and cross,
// away from both lines' ends.
function crossInMiddle(a: Line, d: Line): boolean {
  const ratio = lineLength(a) / lineLength(d);
  if (ratio > PLUS_MAX_LENGTH_RATIO || ratio < 1 / PLUS_MAX_LENGTH_RATIO) {
    return false;
  }
  const crossX = (d.start.x + d.end.x) / 2;
  const crossY = (a.start.y + a.end.y) / 2;
  return isInMiddle(crossX, a.start.x, a.end.x) && isInMiddle(crossY, d.start.y, d.end.y);
}

function isInMiddle(value: number, from: number, to: number): boolean {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const margin = (high - low) * PLUS_MIDDLE;
  return value >= low + margin && value <= high - margin;
}
