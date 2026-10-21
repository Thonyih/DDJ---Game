// Sound effects and per-tier ambience (Web Audio). Credits: public/assets/audio/LICENSE.txt.
const FOLDER = 'assets/audio/';

const EFFECTS = [
  'swing_1', 'swing_2', 'bow_shot', 'arrow_hit', 'hit_1', 'hit_2', 'hurt', 'enemy_death', 'bell',
  'chest_creak', 'coins_1', 'coins_2', 'latch', 'mission_start',
  'step_0', 'step_1', 'step_2', 'step_3', 'step_4',
  'snarl_1', 'snarl_2', 'snarl_3', 'snarl_5', 'snarl_attack',
  'ui_click', 'ui_page_1', 'ui_page_2', 'ui_page_3', 'ui_close', 'ui_bag', 'ui_select',
  'npc_armour', 'cloth_1', 'cloth_2', 'equip_sword', 'equip_bow',
] as const;
const AMBIENCE = ['amb_forest', 'amb_wind', 'amb_dark', 'amb_dungeon'] as const;

export type EffectName = (typeof EFFECTS)[number];
type AmbienceName = (typeof AMBIENCE)[number];

// How loud each ambience layer is in each row of maps: calm forest in the south,
// wind, dark drones and a cavernous rumble further north.
const TIER_AMBIENCE: Record<AmbienceName, number>[] = [
  { amb_forest: 0.5, amb_wind: 0, amb_dark: 0, amb_dungeon: 0 },
  { amb_forest: 0.25, amb_wind: 0.35, amb_dark: 0, amb_dungeon: 0 },
  { amb_forest: 0, amb_wind: 0.3, amb_dark: 0.45, amb_dungeon: 0 },
  { amb_forest: 0, amb_wind: 0.2, amb_dark: 0.5, amb_dungeon: 0.45 },
];
const AMBIENCE_FADE_SECONDS = 2;
const SNARLS: EffectName[] = ['snarl_1', 'snarl_2', 'snarl_3', 'snarl_5'];
const STEPS: EffectName[] = ['step_0', 'step_1', 'step_2', 'step_3', 'step_4'];

export interface PlayOptions {
  volume?: number;
  // Playback speed (also changes pitch); a little variation keeps repeats from sounding identical.
  rate?: number;
  // Play only part of the file: start `offset` seconds in, for `duration` seconds.
  offset?: number;
  duration?: number;
}

export class Sound {
  private readonly context = new AudioContext();
  private readonly master = this.context.createGain();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly ambienceGains = new Map<AmbienceName, GainNode>();
  private tier = 0;
  private muted = false;

  constructor() {
    this.master.gain.value = 0.8;
    this.master.connect(this.context.destination);

    // Browsers only allow audio after the player interacts with the page.
    const unlock = (): void => {
      void this.context.resume();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    void this.loadAll();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.context.currentTime, 0.05);
  }

  // Crossfades the ambience to a row of maps (0 = bottom row).
  setTier(tier: number): void {
    this.tier = tier;
    const now = this.context.currentTime;
    for (const [name, gain] of this.ambienceGains) {
      gain.gain.setTargetAtTime(TIER_AMBIENCE[tier][name], now, AMBIENCE_FADE_SECONDS / 3);
    }
  }

  play(name: EffectName, options: PlayOptions = {}): void {
    const buffer = this.buffers.get(name);
    if (!buffer || this.muted) {
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.rate ?? 0.92 + Math.random() * 0.16;

    const gain = this.context.createGain();
    gain.gain.value = options.volume ?? 1;
    if (options.duration) {
      // Short fade at the end of a slice so it doesn't click.
      const end = this.context.currentTime + options.duration;
      gain.gain.setValueAtTime(options.volume ?? 1, end - 0.15);
      gain.gain.linearRampToValueAtTime(0, end);
    }
    source.connect(gain).connect(this.master);
    source.start(0, options.offset ?? 0, options.duration);
  }

  playRandom(names: EffectName[], options: PlayOptions = {}): void {
    this.play(names[Math.floor(Math.random() * names.length)], options);
  }

  // A short growl cut from one of the long snarl recordings.
  snarl(volume: number, attack = false): void {
    const name = attack ? 'snarl_attack' : SNARLS[Math.floor(Math.random() * SNARLS.length)];
    const buffer = this.buffers.get(name);
    if (!buffer) {
      return;
    }
    const duration = 1.2;
    const offset = Math.random() * Math.max(0, buffer.duration - duration);
    this.play(name, { volume, offset, duration });
  }

  // A page turning (menus, maps, tutorial steps).
  page(volume = 0.6): void {
    this.playRandom(['ui_page_1', 'ui_page_2', 'ui_page_3'], { volume });
  }

  footstep(): void {
    this.playRandom(STEPS, { volume: 0.25 });
  }

  private async loadAll(): Promise<void> {
    await Promise.all([...EFFECTS, ...AMBIENCE].map((name) => this.load(name)));

    // Ambience layers loop forever; their volumes follow the current tier.
    for (const name of AMBIENCE) {
      const buffer = this.buffers.get(name);
      if (!buffer) {
        continue;
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      source.connect(gain).connect(this.master);
      source.start();
      this.ambienceGains.set(name, gain);
    }
    this.setTier(this.tier);
  }

  private async load(name: string): Promise<void> {
    try {
      const response = await fetch(`${FOLDER}${name}.ogg`);
      this.buffers.set(name, await this.context.decodeAudioData(await response.arrayBuffer()));
    } catch {
      // A missing or undecodable sound just stays silent.
    }
  }
}
