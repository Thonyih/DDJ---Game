import { GRID_COLUMNS, GRID_ROWS, mapLetter, mapName, type Direction } from './Maps';
import {
  MISSIONS,
  formatReward,
  isMissionCompleted,
  missionsForTier,
  progressWord,
  type Mission,
} from './Missions';
import { InventoryView } from './InventoryView';
import type { EffectName } from './Sound';
import type { Player } from './Player';
import { MAX_ARROWS, playerData, type WeaponKind } from './PlayerData';
import { TIER_LOOKS } from './World';

const SLOT_COUNT = 6;
// Which toolbar slots hold a weapon.
const SLOT_WEAPONS: (WeaponKind | undefined)[] = ['sword', 'bow'];
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
  private missionButtons: { mission: Mission; button: HTMLButtonElement }[] = [];
  private currentMap = 'A';
  private readonly slots: HTMLElement[] = [];
  private selectedMission: Mission = MISSIONS[0];
  private activeMission: Mission | null = null;
  private toastTimeout = 0;

  constructor(callbacks: UICallbacks) {
    this.playSound = callbacks.onSound;
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

    this.refreshInventory();
  }

  setCurrentMap(column: number, row: number, exits: MapExit[]): void {
    const letter = mapLetter(column, row);
    this.currentMap = letter;
    getElement('map-button').textContent = `Map ${letter}`;
    const name = mapName(column, row);
    getElement('map-name').textContent = `${letter} · ${name}`;
    getElement('map-current').textContent = `You are in ${name} (${letter})`;
    getElement('map-exits').textContent =
      'Exits: ' + exits.map((exit) => `${exit.direction} → ${exit.name} (${exit.letter})`).join(', ');

    const exitLetters = exits.map((exit) => exit.letter);
    for (const cell of this.mapCells) {
      const isCurrent = cell.column === column && cell.row === row;
      cell.element.classList.toggle('current', isCurrent);
      cell.element.classList.toggle('exit', exitLetters.includes(mapLetter(cell.column, cell.row)));
    }
    this.refreshMissionTarget();
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

  updateHud(player: Player, defeated: number): void {
    this.refreshSlots();
    getElement('resources').textContent = `Gold: ${playerData.gold}   Spices: ${playerData.spices}`;
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
    this.refreshMissionDetails();
    this.refreshSlots();
  }

  // The Missions panel is opened by talking to a Capitão; he offers his row's tier of missions.
  openMissions(tier: number): void {
    const missions = missionsForTier(tier);
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
      const number = document.createElement('span');
      number.className = 'slot-number';
      number.textContent = String(i + 1);
      const label = document.createElement('span');
      label.className = 'slot-label';
      slot.append(number, label);

      const weapon = SLOT_WEAPONS[i];
      if (weapon) {
        slot.classList.add('weapon-slot');
        slot.addEventListener('click', () => onSelectWeapon(weapon));
      }
      container.appendChild(slot);
      this.slots.push(slot);
    }
  }

  private refreshSlots(): void {
    const labels = [
      `Sword Lv ${playerData.weaponLevel}`,
      `Bow Lv ${playerData.bowLevel}\n${playerData.arrows}/${MAX_ARROWS} arrows`,
    ];
    this.slots.forEach((slot, index) => {
      const label = slot.querySelector('.slot-label')!;
      const text = labels[index] ?? '';
      if (label.textContent !== text) {
        label.textContent = text;
      }
      slot.classList.toggle('active', SLOT_WEAPONS[index] === playerData.selectedWeapon);
    });
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
    getElement('mission-name').textContent = mission.name;
    getElement('mission-objective').textContent = `Objective: ${mission.objective}`;
    getElement('mission-reward').textContent = `Reward: ${formatReward(mission.reward)}`;

    // Each button shows whether its mission is already done.
    for (const { mission: item, button } of this.missionButtons) {
      button.textContent = `${item.name}${isMissionCompleted(item) ? ' — done' : ''}`;
      button.classList.toggle('selected', item === mission);
    }

    this.startButton.disabled = this.activeMission !== null;
    if (this.activeMission) {
      this.startButton.textContent = 'Mission in progress';
    } else {
      this.startButton.textContent = isMissionCompleted(mission) ? 'Replay Mission' : 'Start Mission';
    }
  }
}
