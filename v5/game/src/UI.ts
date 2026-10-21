import { GRID_COLUMNS, GRID_ROWS, mapLetter, mapName, type Direction } from './Maps';
import {
  MISSIONS,
  formatReward,
  isMissionCompleted,
  isMissionLocked,
  isRowUnlocked,
  missionsForMap,
  progressWord,
  type Mission,
} from './Missions';
import { ICONS, InventoryView, styleWeaponIcon } from './InventoryView';
import type { EffectName } from './Sound';
import type { Player } from './Player';
import { MAX_ARROWS, playerData, type WeaponKind } from './PlayerData';
import type { StoryPage } from './Story';
import { TIER_LOOKS } from './World';

const SLOT_COUNT = 5;
// Which toolbar slots hold a weapon.
const SLOT_WEAPONS: (WeaponKind | undefined)[] = ['sword', 'bow'];

// Mouse-gesture abilities shown in slots 3-5, with a cooldown and a hint on hover. Frenzy has no
// cooldown: its slot lights up red and its sweep shows how long the Frenzy lasts.
export type AbilityName = 'push' | 'heal' | 'frenzy';
const SLOT_ABILITIES: (AbilityName | undefined)[] = [undefined, undefined, 'push', 'heal', 'frenzy'];
const ABILITY_HINTS: Record<AbilityName, string> = {
  push: 'Dust Push: draw a big circle with the mouse, very fast (in 0.3s), to knock nearby enemies back.',
  heal: 'Heal: draw a big + with the mouse (one line across, one down), very fast (in 0.4s), to heal 20 HP.',
  frenzy: 'Frenzy: shake the mouse wide side to side, very fast (in 0.4s), for faster attacks. Keep shaking to keep it going.',
};
const ABILITY_ICONS: Record<AbilityName, string> = {
  // A whirl of dust.
  push: `<svg viewBox="0 0 64 64" fill="none" stroke-linecap="round">
    <path d="M32 12 A20 20 0 1 1 13 26" stroke="#c9a97a" stroke-width="5"/>
    <path d="M32 22 A10 10 0 1 1 22.5 29" stroke="#e8d3a8" stroke-width="4"/>
    <path d="M13 26 L8 18 M13 26 L21 22" stroke="#c9a97a" stroke-width="4"/>
    <circle cx="50" cy="12" r="3" fill="#a88a5c" stroke="none"/><circle cx="56" cy="22" r="2" fill="#a88a5c" stroke="none"/></svg>`,
  // The Order's cross, as drawn with the mouse.
  heal: `<svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="24" fill="#1d3a22" stroke="#6dd68a" stroke-width="2.5"/>
    <path d="M27 14 H37 V27 H50 V37 H37 V50 H27 V37 H14 V27 H27 Z" fill="#6dd68a" stroke="#0e2a14" stroke-width="2"/></svg>`,
  // Three claw slashes.
  frenzy: `<svg viewBox="0 0 64 64" stroke-linecap="round" fill="none">
    <path d="M16 50 Q26 30 46 12" stroke="#ff5a3a" stroke-width="6"/>
    <path d="M26 54 Q36 34 54 20" stroke="#ff8a5a" stroke-width="5"/>
    <path d="M10 40 Q18 26 34 12" stroke="#d63a2a" stroke-width="4.5"/></svg>`,
};

// Cooldowns and the Frenzy state, for the toolbar.
export interface AbilityState {
  // Seconds left, and the full time, per ability (for Frenzy: how long it still lasts).
  cooldowns: Record<AbilityName, { left: number; total: number }>;
}
const TOAST_TIME_MS = 3000;

export interface UICallbacks {
  onStartMission: (mission: Mission) => void;
  onTravel: () => void;
  onStayAtBorder: () => void;
  onSelectWeapon: (weapon: WeaponKind) => void;
  onUpgraded: () => void;
  onSound: (name: EffectName) => void;
}

export interface MapExit {
  direction: Direction;
  letter: string;
  name: string;
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

export class UI {
  private readonly inventory = getElement('inventory');
  private readonly missions = getElement('missions');
  private readonly worldMap = getElement('world-map');
  private readonly travelPrompt = getElement('travel-prompt');
  private readonly travelYes = getElement('travel-yes');
  private readonly mapCells: { element: HTMLElement; column: number; row: number }[] = [];
  private readonly toast = getElement('toast');
  private readonly startButton = getElement('start-mission') as HTMLButtonElement;
  private readonly inventoryView: InventoryView;
  private readonly playSound: (name: EffectName) => void;
  private readonly goldAmount: HTMLElement;
  private readonly spicesAmount: HTMLElement;
  private missionButtons: { mission: Mission; button: HTMLButtonElement }[] = [];
  private currentMap = 'A';
  private readonly slots: HTMLElement[] = [];
  private selectedMission: Mission = MISSIONS[0];
  private activeMission: Mission | null = null;
  private toastTimeout = 0;
  private readonly storyBackdrop = getElement('story-backdrop');
  // Story pages waiting to be shown, each with what to do once it is dismissed.
  private storyQueue: { page: StoryPage; onClose?: () => void }[] = [];

  constructor(callbacks: UICallbacks) {
    this.playSound = callbacks.onSound;
    [this.goldAmount, this.spicesAmount] = this.createResources();
    this.inventoryView = new InventoryView(
      () => {
        this.refreshInventory();
        callbacks.onUpgraded();
      },
      () => this.playSound('ui_select'),
    );
    this.createSlots(callbacks.onSelectWeapon);
    this.createMapGrid();

    getElement('inventory-button').addEventListener('click', () => this.togglePanel(this.inventory));
    getElement('map-button').addEventListener('click', () => this.togglePanel(this.worldMap));
    getElement('world-map-close').addEventListener('click', () => {
      this.worldMap.hidden = true;
      this.playSound('ui_close');
    });
    this.travelYes.addEventListener('click', () => callbacks.onTravel());
    getElement('travel-no').addEventListener('click', () => callbacks.onStayAtBorder());
    getElement('inventory-close').addEventListener('click', () => {
      this.inventory.hidden = true;
      this.inventoryView.closeCard();
      this.playSound('ui_close');
    });
    getElement('missions-close').addEventListener('click', () => {
      this.missions.hidden = true;
      this.playSound('ui_close');
    });
    this.startButton.addEventListener('click', () => callbacks.onStartMission(this.selectedMission));
    getElement('story-continue').addEventListener('click', () => this.nextStoryPage());
    // Enter, Space or Escape also dismisses a story page.
    window.addEventListener('keydown', (event) => {
      if (this.isStoryOpen && ['Enter', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
        this.nextStoryPage();
      }
    });

    this.refreshInventory();
  }

  setCurrentMap(column: number, row: number, exits: MapExit[]): void {
    const letter = mapLetter(column, row);
    this.currentMap = letter;
    getElement('map-button').textContent = `Map ${letter}`;
    const name = mapName(column, row);
    getElement('map-name').textContent = `${letter} · ${name}`;

    const exitLetters = exits.map((exit) => exit.letter);
    for (const cell of this.mapCells) {
      const isCurrent = cell.column === column && cell.row === row;
      cell.element.classList.toggle('current', isCurrent);
      cell.element.classList.toggle('exit', exitLetters.includes(mapLetter(cell.column, cell.row)));
    }
    this.refreshMissionTarget();
  }

  // Rows the player can't travel to yet are marked locked on the World Map.
  private refreshMapLocks(): void {
    for (const cell of this.mapCells) {
      cell.element.classList.toggle('locked', !isRowUnlocked(cell.row));
    }
  }

  // Highlights a travel mission's target map on the World Map.
  private refreshMissionTarget(): void {
    const goal = this.activeMission?.goal;
    const target = goal?.kind === 'fetch' ? goal.map : null;
    for (const cell of this.mapCells) {
      cell.element.classList.toggle('target', mapLetter(cell.column, cell.row) === target);
    }
  }

  // Shown at the top of the screen while the player stands at a border with a map beyond it.
  showTravelPrompt(text: string, canTravel: boolean): void {
    getElement('travel-text').textContent = text;
    this.travelYes.hidden = !canTravel;
    this.travelPrompt.hidden = false;
  }

  hideTravelPrompt(): void {
    this.travelPrompt.hidden = true;
  }

  setActiveMission(mission: Mission | null): void {
    this.activeMission = mission;
    this.refreshInventory();
    this.refreshMissionTarget();
  }

  showMessage(text: string, durationMs = TOAST_TIME_MS): void {
    this.toast.textContent = text;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      this.toast.hidden = true;
    }, durationMs);
  }

  // Shows a story page in the centre of the screen (the game pauses meanwhile). If one is already
  // open, this page waits its turn.
  showStory(page: StoryPage, onClose?: () => void): void {
    this.storyQueue.push({ page, onClose });
    if (this.storyQueue.length === 1) {
      this.displayStoryPage();
    }
  }

  get isStoryOpen(): boolean {
    return this.storyQueue.length > 0;
  }

  private displayStoryPage(): void {
    const { page } = this.storyQueue[0];
    getElement('story-title').textContent = page.title;
    const text = getElement('story-text');
    text.replaceChildren(...page.lines.map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    }));
    this.storyBackdrop.hidden = false;
    this.playSound('ui_page_1');
  }

  private nextStoryPage(): void {
    const current = this.storyQueue.shift();
    current?.onClose?.();
    if (this.storyQueue.length > 0) {
      this.displayStoryPage();
    } else {
      this.storyBackdrop.hidden = true;
    }
  }

  updateHud(player: Player, defeated: number, abilities: AbilityState): void {
    this.refreshSlots();
    this.refreshAbilitySlots(abilities);
    this.setText(this.goldAmount, String(playerData.gold));
    this.setText(this.spicesAmount, String(playerData.spices));
    getElement('health-text').textContent = `${player.health} / ${player.maxHealth}`;
    getElement('health-fill').style.width = `${(player.health / player.maxHealth) * 100}%`;

    const tracker = getElement('mission-tracker');
    tracker.hidden = this.activeMission === null;
    if (this.activeMission) {
      const goal = this.activeMission.goal;
      let text = `${this.activeMission.name}: ${defeated} / ${goal.count} ${progressWord(goal)}`;
      if (goal.kind === 'fetch') {
        const index = goal.map.charCodeAt(0) - 65;
        text = goal.map === this.currentMap
          ? `${this.activeMission.name}: find the ${goal.item} (★ on the minimap)`
          : `${this.activeMission.name}: travel to Map ${goal.map} · ${mapName(index % GRID_COLUMNS, Math.floor(index / GRID_COLUMNS))}`;
      }
      getElement('tracker-objective').textContent = text;
      getElement('tracker-target').textContent = player.target
        ? `${player.target.name} HP ${player.target.health} / ${player.target.maxHealth}`
        : '';
    }
  }

  // Refreshes everything that depends on gold, spices, upgrades or missions.
  refreshInventory(): void {
    this.inventoryView.refresh();
    this.refreshMapLocks();
    this.refreshMissionDetails();
    this.refreshSlots();
  }

  // The Missions panel is opened by talking to a Capitão; he offers his row's tier of missions,
  // plus the boss mission on that boss's own map.
  openMissions(tier: number): void {
    const missions = missionsForMap(tier, this.currentMap);
    this.createMissionButtons(missions);
    getElement('missions-tier').textContent = `Tier ${tier} missions`;
    // Start on the first mission not yet completed.
    this.selectedMission = missions.find((mission) => !isMissionCompleted(mission)) ?? missions[0];
    if (this.missions.hidden) {
      this.togglePanel(this.missions);
    }
    this.refreshMissionDetails();
  }

  closeMissions(): void {
    this.missions.hidden = true;
  }

  get isMissionsOpen(): boolean {
    return !this.missions.hidden;
  }

  get isWorldMapOpen(): boolean {
    return !this.worldMap.hidden;
  }

  // Only one panel is open at a time.
  private togglePanel(panel: HTMLElement): void {
    const willOpen = panel.hidden;
    // Opening: a bag for the inventory, a page for books and maps. Closing: a book shutting.
    this.playSound(!willOpen ? 'ui_close' : panel === this.inventory ? 'ui_bag' : 'ui_page_1');
    this.inventoryView.closeCard();
    this.inventory.hidden = true;
    this.missions.hidden = true;
    this.worldMap.hidden = true;
    panel.hidden = !willOpen;
    this.refreshInventory();
  }

  // Rows are added top to bottom, so Map A ends up in the bottom-left corner.
  private createMapGrid(): void {
    const grid = getElement('map-grid');
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      for (let column = 0; column < GRID_COLUMNS; column++) {
        const element = document.createElement('div');
        element.className = 'map-cell';

        const letter = document.createElement('div');
        letter.className = 'map-cell-letter';
        letter.textContent = mapLetter(column, row);
        const name = document.createElement('div');
        name.className = 'map-cell-name';
        name.textContent = mapName(column, row);
        const tier = document.createElement('div');
        tier.className = 'map-cell-tier';
        tier.textContent = `Tier ${row + 1}`;
        element.append(letter, name, tier);

        // Same colours as that row's ground, so the northern rows look darker here too.
        const look = TIER_LOOKS[row];
        element.style.setProperty('--tier-bg', `linear-gradient(160deg, ${look.groundLight}, ${look.groundDark})`);

        grid.appendChild(element);
        this.mapCells.push({ element, column, row });
      }
    }
  }

  // Slots 1 and 2 are the sword and the bow; clicking one selects that weapon.
  private createSlots(onSelectWeapon: (weapon: WeaponKind) => void): void {
    const container = getElement('slots');
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.id = `slot-${i + 1}`;
      const weapon = SLOT_WEAPONS[i];
      if (weapon) {
        // Weapon picture, with its level and (for the bow) arrows left in the corners.
        slot.innerHTML = ICONS[weapon];
        for (const className of ['slot-badge', 'slot-amount']) {
          const label = document.createElement('span');
          label.className = className;
          slot.appendChild(label);
        }
        slot.classList.add('weapon-slot');
        slot.addEventListener('click', () => onSelectWeapon(weapon));
      }
      const ability = SLOT_ABILITIES[i];
      if (ability) {
        // Icon, a dark sweep that shrinks as the cooldown runs out, and the seconds left.
        slot.innerHTML = ABILITY_ICONS[ability];
        slot.classList.add('ability-slot');
        slot.dataset.hint = ABILITY_HINTS[ability];
        const sweep = document.createElement('div');
        sweep.className = 'slot-cooldown';
        const seconds = document.createElement('span');
        seconds.className = 'slot-seconds';
        slot.append(sweep, seconds);
      }
      container.appendChild(slot);
      this.slots.push(slot);
    }
  }

  private refreshAbilitySlots(abilities: AbilityState): void {
    this.slots.forEach((slot, index) => {
      const ability = SLOT_ABILITIES[index];
      if (!ability) {
        return;
      }
      const { left, total } = abilities.cooldowns[ability];
      const sweep = slot.querySelector<HTMLElement>('.slot-cooldown')!;
      sweep.style.setProperty('--cooldown', String(Math.max(0, left) / total));
      if (ability === 'frenzy') {
        slot.classList.toggle('frenzy', left > 0);
        return;
      }
      this.setText(slot.querySelector('.slot-seconds')!, left > 0 ? String(Math.ceil(left)) : '');
      slot.classList.toggle('ready', left <= 0);
    });
  }

  private refreshSlots(): void {
    this.slots.forEach((slot, index) => {
      const weapon = SLOT_WEAPONS[index];
      if (!weapon) {
        return;
      }
      const level = weapon === 'sword' ? playerData.weaponLevel : playerData.bowLevel;
      const amount = weapon === 'bow' ? `${playerData.arrows}/${MAX_ARROWS}` : '';
      this.setText(slot.querySelector('.slot-badge')!, `Lv ${level}`);
      this.setText(slot.querySelector('.slot-amount')!, amount);
      styleWeaponIcon(slot.querySelector('svg')!, weapon);
      slot.classList.toggle('active', weapon === playerData.selectedWeapon);
    });
  }

  // Top-left gold and spices: an icon and a number each (hover shows the name).
  private createResources(): [HTMLElement, HTMLElement] {
    const container = getElement('resources');
    const amounts = (['gold', 'spices'] as const).map((item) => {
      const resource = document.createElement('div');
      resource.className = `resource ${item}`;
      resource.title = item === 'gold' ? 'Gold' : 'Spices';
      resource.innerHTML = ICONS[item];
      const amount = document.createElement('span');
      amount.className = 'resource-amount';
      resource.appendChild(amount);
      container.appendChild(resource);
      return amount;
    });
    return [amounts[0], amounts[1]];
  }

  // Only touch the page when the text actually changes (this runs every frame).
  private setText(element: Element, text: string): void {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  private createMissionButtons(missions: Mission[]): void {
    const list = getElement('mission-list');
    list.replaceChildren();
    this.missionButtons = missions.map((mission) => {
      const button = document.createElement('button');
      button.className = 'full';
      button.addEventListener('click', () => {
        this.selectedMission = mission;
        this.playSound('ui_page_2');
        this.refreshMissionDetails();
      });
      list.appendChild(button);
      return { mission, button };
    });
  }

  private refreshMissionDetails(): void {
    const mission = this.selectedMission;
    const locked = isMissionLocked(mission);
    getElement('mission-name').textContent = mission.name;
    getElement('mission-story').textContent = mission.story;
    getElement('mission-objective').textContent = locked
      ? `Locked: first complete ${(mission.requires ?? []).join(' and ')}`
      : `Objective: ${mission.objective}`;
    getElement('mission-reward').textContent = `Reward: ${formatReward(mission.reward)}`;

    // Each button shows whether its mission is already done.
    for (const { mission: item, button } of this.missionButtons) {
      const done = isMissionCompleted(item);
      const status = done ? ' — done' : isMissionLocked(item) ? ' — locked' : '';
      button.textContent = `${item.name}${status}`;
      button.classList.toggle('selected', item === mission);
    }

    // Every mission can only be completed once.
    const finished = isMissionCompleted(mission);
    this.startButton.disabled = this.activeMission !== null || finished || locked;
    if (this.activeMission) {
      this.startButton.textContent = 'Mission in progress';
    } else if (finished) {
      this.startButton.textContent = 'Completed';
    } else if (locked) {
      this.startButton.textContent = 'Locked';
    } else {
      this.startButton.textContent = 'Start Mission';
    }
  }
}
