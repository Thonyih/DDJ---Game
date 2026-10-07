import * as THREE from 'three';

export interface Click {
  // Normalized device coordinates (-1 to 1).
  position: THREE.Vector2;
  button: 'left' | 'right';
}

export class Input {
  // Where the mouse is over the game, in normalized device coordinates; null when it is outside.
  pointer: THREE.Vector2 | null = null;
  private click: Click | null = null;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    const toDeviceCoordinates = (event: PointerEvent): THREE.Vector2 => {
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) {
        return;
      }
      this.click = {
        position: toDeviceCoordinates(event),
        button: event.button === 0 ? 'left' : 'right',
      };
    });
    canvas.addEventListener('pointermove', (event) => {
      this.pointer = toDeviceCoordinates(event);
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer = null;
    });
  }

  // Returns the last click, then clears it.
  consumeClick(): Click | null {
    const click = this.click;
    this.click = null;
    return click;
  }
}
