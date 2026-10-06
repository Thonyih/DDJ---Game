import { Game } from './Game';
import { register } from './Network';

const canvas = document.querySelector<HTMLCanvasElement>('#app');
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimap');

if (!canvas || !minimapCanvas) {
  throw new Error('Canvas elements #app and #minimap are required');
}

const game = new Game(canvas, minimapCanvas);
game.start();

// Login panel: register a name, then connect to the multiplayer server.
const loginPanel = document.getElementById('login') as HTMLElement;
const nameInput = document.getElementById('login-name') as HTMLInputElement;
const enterButton = document.getElementById('login-button') as HTMLButtonElement;
const offlineButton = document.getElementById('login-offline') as HTMLButtonElement;
const errorText = document.getElementById('login-error') as HTMLElement;

async function enter(): Promise<void> {
  const username = nameInput.value.trim();
  enterButton.disabled = true;
  errorText.textContent = 'Connecting...';
  try {
    const token = await register(username);
    await game.connect(token, username);
    loginPanel.hidden = true;
  } catch (error) {
    errorText.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    enterButton.disabled = false;
  }
}

enterButton.addEventListener('click', () => void enter());
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void enter();
  }
});
offlineButton.addEventListener('click', () => {
  loginPanel.hidden = true;
});
nameInput.focus();
