import { loadModels } from './Assets';
import { Game } from './Game';
import { Intro } from './Intro';

const canvas = document.querySelector<HTMLCanvasElement>('#app');
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap');

if (!canvas || !minimapCanvas) {
  throw new Error('Canvas elements #app and #minimap are required');
}

// The title screen shows while the models load; Start appears once both the 2 seconds and the
// loading are done.
const intro = new Intro();
loadModels().then((models) => {
  const game = new Game(canvas, minimapCanvas, models);
  intro.ready({
    onStart: () => game.start(),
    onFinished: () => game.resume(),
  });
});
