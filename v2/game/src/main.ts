import { Game } from './Game';

const canvas = document.querySelector<HTMLCanvasElement>('#app');
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap');

if (!canvas || !minimapCanvas) {
  throw new Error('Canvas elements #app and #minimap are required');
}

const game = new Game(canvas, minimapCanvas);
game.start();
