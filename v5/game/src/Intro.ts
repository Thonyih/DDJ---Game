// The opening: title art, a Start button after 2 seconds, a fog transition into the game, then the
// narrator. While the narrator speaks the game is paused and darkened behind a text box whose
// paragraphs appear as the narration reaches them. The box closes when the narration ends, or on Skip.

const START_DELAY_MS = 2000;
const FOG_IN_MS = 1200;
const NARRATION_URL = 'assets/audio/narrator-intro.mp3';
// Used to time the paragraphs if the browser can't tell the audio's length.
const NARRATION_SECONDS = 37.5;

const NARRATION = [
  'In the shadow of Tomar’s ancient walls, an old darkness begins to stir.',
  'Whispers of forgotten legends spread across the kingdom. Creatures once confined to stories now walk among the living.',
  'The Order of the Temple has endured centuries of war, but what approaches cannot be defeated by steel alone.',
  'And so, a young knight is summoned to Tomar, unaware that his journey will awaken secrets buried deeper than history itself.',
  'For some legends were never meant to be forgotten.',
];

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

export interface IntroCallbacks {
  // Start pressed: the game appears behind the fog (paused until the narration ends).
  onStart: () => void;
  // Narration finished or skipped: the game continues.
  onFinished: () => void;
}

export class Intro {
  private readonly title = getElement('title-screen');
  private readonly loadingText = getElement('title-loading');
  private readonly startButton = getElement('start-button') as HTMLButtonElement;
  private readonly fog = getElement('fog');
  private readonly narrator = getElement('narrator');
  private readonly audio = new Audio(NARRATION_URL);
  private readonly paragraphs: HTMLParagraphElement[];
  private callbacks: IntroCallbacks | null = null;
  private delayOver = false;
  private finished = false;

  constructor() {
    this.paragraphs = NARRATION.map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    });
    getElement('narrator-text').replaceChildren(...this.paragraphs);

    window.setTimeout(() => {
      this.delayOver = true;
      this.showStartIfReady();
    }, START_DELAY_MS);
    this.startButton.addEventListener('click', () => this.start());
    getElement('narrator-skip').addEventListener('click', () => this.finish());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.narrator.hidden) {
        this.finish();
      }
    });

    this.audio.addEventListener('timeupdate', () => this.revealParagraphs());
    this.audio.addEventListener('ended', () => this.finish());
  }

  // Called once the game has loaded; the Start button shows when this and the 2 seconds are done.
  ready(callbacks: IntroCallbacks): void {
    this.callbacks = callbacks;
    this.showStartIfReady();
  }

  private showStartIfReady(): void {
    if (this.delayOver && this.callbacks) {
      this.loadingText.hidden = true;
      this.startButton.hidden = false;
    }
  }

  private start(): void {
    this.startButton.disabled = true;
    // Some browsers (Safari) only allow audio to start inside the click; start and pause it here so
    // it can play later.
    this.audio.play().then(() => this.audio.pause()).catch(() => {});

    this.fog.hidden = false;
    this.fog.classList.add('rolling-in');
    window.setTimeout(() => {
      // Behind the thick fog: swap the title for the game, then let the fog clear.
      this.title.remove();
      this.callbacks?.onStart();
      this.narrator.hidden = false;
      this.fog.classList.replace('rolling-in', 'clearing');
      window.setTimeout(() => this.fog.remove(), 2000);
      this.playNarration();
    }, FOG_IN_MS);
  }

  private playNarration(): void {
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      // No sound allowed: show the whole text; the player closes it with Skip.
      for (const paragraph of this.paragraphs) {
        paragraph.classList.add('shown');
      }
    });
    this.revealParagraphs();
  }

  // Each paragraph appears when the narration reaches it, assuming the narrator reads at an even
  // pace (a paragraph's start is its share of the text so far).
  private revealParagraphs(): void {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : NARRATION_SECONDS;
    const totalLength = NARRATION.join('').length;
    let before = 0;
    NARRATION.forEach((line, index) => {
      const startsAt = (before / totalLength) * duration;
      if (this.audio.currentTime >= startsAt - 0.3) {
        this.paragraphs[index].classList.add('shown');
      }
      before += line.length;
    });
  }

  private finish(): void {
    if (this.finished || this.narrator.hidden) {
      return;
    }
    this.finished = true;
    this.audio.pause();
    this.narrator.hidden = true;
    this.callbacks?.onFinished();
  }
}
