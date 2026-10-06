import * as THREE from 'three';

export interface Click {
  // Normalized device coordinates (-1 to 1).
  position: THREE.Vector2;
  button: 'left' | 'right';
}

export class Input {
  private click: Click | null = null;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      this.click = {
        position: new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        button: event.button === 0 ? 'left' : 'right',
      };
    });
  }

  // Returns the last click, then clears it.
  consumeClick(): Click | null {
    const click = this.click;
    this.click = null;
    return click;
  }
}
