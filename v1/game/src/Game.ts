import * as THREE from 'three';
import { Input } from './Input';
import { Player } from './Player';

const CAMERA_OFFSET = new THREE.Vector3(0, 7, 8);
const CAMERA_LERP = 0.1;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly input: Input;
  private readonly player: Player;
  private readonly clock: THREE.Clock;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.input = new Input();
    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.createLights();
    this.createGround();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.onResize());
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick(): void {
    const delta = this.clock.getDelta();
    this.player.update(delta, this.input);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(): void {
    const offset = CAMERA_OFFSET.clone().applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.player.facing,
    );
    const targetPosition = this.player.position.clone().add(offset);
    this.camera.position.lerp(targetPosition, CAMERA_LERP);
    this.camera.lookAt(this.player.position);
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({ map: this.createCheckerTexture() });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  private createCheckerTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D canvas context not available');
    }

    context.fillStyle = '#6b8f52';
    context.fillRect(0, 0, 2, 2);
    context.fillStyle = '#4d6b3a';
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
