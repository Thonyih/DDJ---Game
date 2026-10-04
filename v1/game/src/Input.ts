export class Input {
  private readonly keys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (event) => this.keys.add(event.code));
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
  }

  get forward(): boolean {
    return this.keys.has('KeyW');
  }

  get backward(): boolean {
    return this.keys.has('KeyS');
  }

  get left(): boolean {
    return this.keys.has('KeyA');
  }

  get right(): boolean {
    return this.keys.has('KeyD');
  }

  get jump(): boolean {
    return this.keys.has('Space');
  }
}
