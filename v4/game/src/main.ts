import { loadModels } from './Assets';
import { Game } from './Game';

const canvas = document.querySelector<HTMLCanvasElement>('#app');
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap');
const loading = document.getElementById('loading');

if (!canvas || !minimapCanvas) {
  throw new Error('Canvas elements #app and #minimap are required');
}

// All character models are loaded before the game starts.
loadModels().then((models) => {
  loading?.remove();
  const game = new Game(canvas, minimapCanvas, models);
  game.start();
});
