import { Game } from './Game';

const canvas = document.querySelector<HTMLCanvasElement>('#app');

if (!canvas) {
  throw new Error('Canvas element with id "app" not found');
}

const game = new Game(canvas);
game.start();
