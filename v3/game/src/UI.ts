import { GRID_COLUMNS, GRID_ROWS, mapLetter, mapName, type Direction } from './Maps';
import { MISSIONS, formatReward, type Mission } from './Missions';
import type { Player } from './Player';
import {
  WEAPON_NAME,
  canAfford,
  getMaxHealth,
  getUpgradeCost,
  getWeaponDamage,
  playerData,
  upgradeHealth,
  upgradeWeapon,
} from './PlayerData';

const SLOT_COUNT = 6;
const TOAST_TIME_MS = 3000;

export interface UICallbacks {
  onStartMission: (mission: Mission) => void;
  onTravel: () => void;
  onStayAtBorder: () => void;
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
  private readonly upgradeButton = getElement('upgrade-button') as HTMLButtonElement;
  private readonly healthUpgradeButton = getElement('health-upgrade-button') as HTMLButtonElement;
  private readonly missionButtons: HTMLButtonElement[] = [];
  private readonly slots: HTMLElement[] = [];
  private selectedMission: Mission = MISSIONS[0];
  private activeMission: Mission | null = null;
  private toastTimeout = 0;

  constructor(callbacks: UICallbacks) {
    this.createSlots();
    this.createMissionButtons();
    this.createMapGrid();

    getElement('inventory-button').addEventListener('click', () => this.togglePanel(this.inventory));
    getElement('missions-button').addEventListener('click', () => this.togglePanel(this.missions));
    getElement('map-button').addEventListener('click', () => this.togglePanel(this.worldMap));
    getElement('world-map-close').addEventListener('click', () => {
      this.worldMap.hidden = true;
    });
    this.travelYes.addEventListener('click', () => callbacks.onTravel());
    getElement('travel-no').addEventListener('click', () => callbacks.onStayAtBorder());
    getElement('inventory-close').addEventListener('click', () => {
      this.inventory.hidden = true;
    });
    getElement('missions-close').addEventListener('click', () => {
      this.missions.hidden = true;
    });
    this.upgradeButton.addEventListener('click', () => {
      upgradeWeapon();
      this.refreshInventory();
    });
    this.healthUpgradeButton.addEventListener('click', () => {
      upgradeHealth();
      this.refreshInventory();
    });
    this.startButton.addEventListener('click', () => callbacks.onStartMission(this.selectedMission));

    this.refreshInventory();
  }

  setCurrentMap(column: number, row: number, exits: MapExit[]): void {
    const letter = mapLetter(column, row);
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
    getElement('resources').textContent = `Gold: ${playerData.gold}   Spices: ${playerData.spices}`;
    getElement('health-text').textContent = `${player.health} / ${player.maxHealth}`;
    getElement('health-fill').style.width = `${(player.health / player.maxHealth) * 100}%`;

    const tracker = getElement('mission-tracker');
    tracker.hidden = this.activeMission === null;
    if (this.activeMission) {
      getElement('tracker-objective').textContent =
        `${this.activeMission.name}: ${defeated} / ${this.activeMission.enemyCount} defeated`;
      getElement('tracker-target').textContent = player.target
        ? `${player.target.name} HP ${player.target.health} / ${player.target.maxHealth}`
        : '';
    }
  }

  refreshInventory(): void {
    const level = playerData.weaponLevel;
    const cost = getUpgradeCost(level);

    getElement('inventory-resources').textContent =
      `Gold: ${playerData.gold}   Spices: ${playerData.spices}`;
    getElement('inventory-weapon').textContent = `${WEAPON_NAME} (Lv ${level})`;
    getElement('inventory-damage').textContent = `Damage: ${getWeaponDamage(level)}`;
    getElement('upgrade-cost').textContent =
      `Upgrade to Lv ${level + 1}: ${formatReward(cost)} (Damage → ${getWeaponDamage(level + 1)})`;
    this.upgradeButton.disabled = !canAfford(cost);

    const healthLevel = playerData.healthLevel;
    const healthCost = getUpgradeCost(healthLevel);
    getElement('inventory-health').textContent =
      `Vitality (Lv ${healthLevel}) — Max HP: ${getMaxHealth(healthLevel)}`;
    getElement('health-upgrade-cost').textContent =
      `Upgrade to Lv ${healthLevel + 1}: ${formatReward(healthCost)} (Max HP → ${getMaxHealth(healthLevel + 1)})`;
    this.healthUpgradeButton.disabled = !canAfford(healthCost);

    this.refreshMissionDetails();
    this.refreshSlots();
  }

  // Only one panel is open at a time.
  private togglePanel(panel: HTMLElement): void {
    const willOpen = panel.hidden;
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
        element.append(letter, name);

        grid.appendChild(element);
        this.mapCells.push({ element, column, row });
      }
    }
  }

  private createSlots(): void {
    const container = getElement('slots');
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      container.appendChild(slot);
      this.slots.push(slot);
    }
  }

  // Slot 1 holds the equipped weapon; the rest are empty for now.
  private refreshSlots(): void {
    this.slots.forEach((slot, index) => {
      slot.replaceChildren();

      const number = document.createElement('span');
      number.className = 'slot-number';
      number.textContent = String(index + 1);
      slot.appendChild(number);

      if (index === 0) {
        const label = document.createElement('span');
        label.textContent = `Sword Lv ${playerData.weaponLevel}`;
        slot.appendChild(label);
      }
    });
  }

  private createMissionButtons(): void {
    const list = getElement('mission-list');
    for (const mission of MISSIONS) {
      const button = document.createElement('button');
      button.className = 'full';
      button.textContent = mission.name;
      button.addEventListener('click', () => {
        this.selectedMission = mission;
        this.refreshMissionDetails();
      });
      list.appendChild(button);
      this.missionButtons.push(button);
    }
  }

  private refreshMissionDetails(): void {
    const mission = this.selectedMission;
    getElement('mission-name').textContent = mission.name;
    getElement('mission-objective').textContent = `Objective: ${mission.objective}`;
    getElement('mission-reward').textContent = `Reward: ${formatReward(mission.reward)}`;

    MISSIONS.forEach((item, index) => {
      this.missionButtons[index].classList.toggle('selected', item === mission);
    });

    this.startButton.disabled = this.activeMission !== null;
    this.startButton.textContent = this.activeMission ? 'Mission in progress' : 'Start Mission';
  }
}
