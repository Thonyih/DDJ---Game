import * as THREE from 'three';
import type { Chest } from './Chest';
import type { Enemy } from './Enemy';
import { MAX_ARROWS, playerData, upgradesBought } from './PlayerData';

// What the tutorial needs from the game.
export interface TutorialHost {
  camera: THREE.Camera;
  playerPosition: () => THREE.Vector3;
  spawnChestNear: (dx: number, dz: number) => Chest;
  hasChest: (chest: Chest) => boolean;
  spawnTrainingEnemyNear: (dx: number, dz: number) => Enemy;
  hasEnemy: (enemy: Enemy) => boolean;
  removeEnemy: (enemy: Enemy) => void;
  hasActiveMission: () => boolean;
  currentMap: () => string;
  missionGiverPosition: () => THREE.Vector3;
  isMissionsPanelOpen: () => boolean;
  isWorldMapOpen: () => boolean;
  unlockMissions: () => void;
  missionsCompleted: () => number;
  unlockTravel: () => void;
  showMessage: (text: string) => void;
  onStepComplete: () => void;
}

// Where a tooltip points: above something in the 3D world, or beside an on-screen element.
type Anchor =
  | { kind: 'world'; position: () => THREE.Vector3 | null; height: number }
  | { kind: 'element'; id: string; side: 'right' | 'below' | 'above' };

interface Step {
  text: string;
  anchor: Anchor;
  // Different text and target while a condition holds (e.g. a panel is open over the target).
  alternative?: { when: () => boolean; text: string; anchor: Anchor };
  reveal?: string[];
  onEnter?: () => void;
  // Each step starts only when the previous one is done.
  isDone: () => boolean;
}

// HUD elements hidden at the start and revealed when their step arrives.
const LOCKABLE_ELEMENTS = [
  'inventory-button',
  'resources',
  'health-bar',
  'slots',
  'minimap',
  'map-button',
  'map-name',
  'compass',
];

const MOVE_DISTANCE = 3;
// Screen-up in the isometric view is world (-x, -z), so these offsets place things in view.
const CHEST_OFFSET: [number, number] = [-3, -3];
const ENEMY_OFFSET: [number, number] = [-4.5, -4.5];
// The bow lesson's enemy starts farther away, so it can be shot before it comes close.
const FAR_ENEMY_OFFSET: [number, number] = [-6.5, -6.5];

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

// Progressive onboarding: one short tooltip at a time, pointing at what to use next.
export class Tutorial {
  private readonly host: TutorialHost;
  private readonly tip = getElement('tutorial-tip');
  private readonly skipButton = getElement('tutorial-skip');
  private readonly steps: Step[];
  private stepIndex = -1;
  private active = true;
  private startPosition = new THREE.Vector3();
  private chest: Chest | null = null;
  private enemy: Enemy | null = null;
  private enemyOffset: [number, number] = ENEMY_OFFSET;
  private startMap = '';
  private tipText = '';
  // Kept so a failed mission can send the player back to starting one.
  private missionStartStep!: Step;
  private missionProgressStep!: Step;

  constructor(host: TutorialHost) {
    this.host = host;
    this.steps = this.createSteps();

    for (const id of LOCKABLE_ELEMENTS) {
      getElement(id).classList.add('tutorial-hidden');
    }
    this.skipButton.hidden = false;
    this.skipButton.addEventListener('click', () => this.skip());

    this.goToStep(0);
  }

  update(): void {
    if (!this.active) {
      return;
    }

    const step = this.steps[this.stepIndex];

    // The training enemy disappears if the player dies; bring it back.
    if (this.enemy && !this.enemy.isDead && !this.host.hasEnemy(this.enemy)) {
      this.enemy = this.host.spawnTrainingEnemyNear(...this.enemyOffset);
    }

    // A failed mission (player died) sends the player back to starting one.
    if (step === this.missionProgressStep && !this.host.hasActiveMission() && this.host.missionsCompleted() === 0) {
      this.goToStep(this.steps.indexOf(this.missionStartStep));
      return;
    }

    if (step.isDone()) {
      this.host.onStepComplete();
      this.goToStep(this.stepIndex + 1);
      return;
    }

    this.showStep(step);
  }

  // Shows the step's text and positions the tooltip, using its alternative when that applies.
  private showStep(step: Step): void {
    const current = step.alternative?.when() ? step.alternative : step;
    if (this.tipText !== current.text) {
      this.tipText = current.text;
      this.tip.innerHTML = current.text;
    }
    this.positionTip(current.anchor);
  }

  private createSteps(): Step[] {
    this.missionStartStep = {
      text: 'Go to the <strong>Capitão da Ordem</strong> and <strong>right-click</strong> him for your first mission.',
      anchor: { kind: 'world', position: () => this.host.missionGiverPosition(), height: 3.4 },
      // The Missions panel opens over the Capitão, so point at its Start button instead.
      alternative: {
        when: () => this.host.isMissionsPanelOpen(),
        text: 'Pick <strong>Find the Lost Chests</strong> and press <strong>Start Mission</strong>.',
        anchor: { kind: 'element', id: 'start-mission', side: 'right' },
      },
      onEnter: () => this.host.unlockMissions(),
      isDone: () => this.host.hasActiveMission(),
    };
    this.missionProgressStep = {
      text: 'Find and open <strong>2 chests</strong> on this map. Your progress is shown here.',
      anchor: { kind: 'element', id: 'mission-tracker', side: 'right' },
      isDone: () => this.host.missionsCompleted() > 0,
    };

    return [
      {
        text: '<strong>Left-click</strong> the ground to move.',
        anchor: { kind: 'world', position: () => this.host.playerPosition(), height: 1.6 },
        onEnter: () => this.startPosition.copy(this.host.playerPosition()),
        isDone: () => this.host.playerPosition().distanceTo(this.startPosition) >= MOVE_DISTANCE,
      },
      {
        text: '<strong>Right-click</strong> the chest to open it. Get close first.',
        anchor: { kind: 'world', position: () => this.chest?.position ?? null, height: 0.9 },
        onEnter: () => {
          this.chest = this.host.spawnChestNear(...CHEST_OFFSET);
        },
        isDone: () => this.chest !== null && !this.host.hasChest(this.chest),
      },
      {
        text: 'Your <strong>sword</strong> (slot 1) is ready. <strong>Right-click</strong> the enemy to attack. Any other click stops the attack.',
        anchor: { kind: 'world', position: () => this.enemy?.position ?? null, height: 1.6 },
        reveal: ['resources', 'health-bar', 'slots'],
        onEnter: () => {
          playerData.selectedWeapon = 'sword';
          this.spawnTrainingEnemy(ENEMY_OFFSET);
        },
        isDone: () => this.enemy !== null && this.enemy.isDead,
      },
      {
        text: 'Now click <strong>slot 2</strong> to take your <strong>bow</strong>.',
        anchor: { kind: 'element', id: 'slot-2', side: 'above' },
        onEnter: () => {
          playerData.arrows = MAX_ARROWS;
        },
        isDone: () => playerData.selectedWeapon === 'bow',
      },
      {
        text: '<strong>Right-click</strong> the enemy to shoot it from afar. Each shot uses an arrow; you carry up to 5.',
        anchor: { kind: 'world', position: () => this.enemy?.position ?? null, height: 1.6 },
        onEnter: () => this.spawnTrainingEnemy(FAR_ENEMY_OFFSET),
        isDone: () => this.enemy !== null && this.enemy.isDead,
      },
      this.missionStartStep,
      this.missionProgressStep,
      {
        text: 'Open the <strong>Inventory</strong>, click a <strong>glowing</strong> item (sword, bow or armour) and upgrade it.',
        anchor: { kind: 'element', id: 'inventory-button', side: 'right' },
        reveal: ['inventory-button'],
        isDone: () => upgradesBought() > 0,
      },
      {
        text: 'Click <strong>Map</strong>: maps further <strong>north</strong> have <strong>harder missions</strong> and better rewards.',
        anchor: { kind: 'element', id: 'map-button', side: 'below' },
        reveal: ['minimap', 'map-button', 'map-name', 'compass'],
        isDone: () => this.host.isWorldMapOpen(),
      },
      {
        text: 'Head <strong>north</strong> for harder work: walk to a <strong>gold border</strong> on the minimap, then choose <strong>Travel</strong>.',
        anchor: { kind: 'element', id: 'map-button', side: 'below' },
        onEnter: () => {
          this.host.unlockTravel();
          this.startMap = this.host.currentMap();
        },
        isDone: () => this.host.currentMap() !== this.startMap,
      },
    ];
  }

  private spawnTrainingEnemy(offset: [number, number]): void {
    this.enemyOffset = offset;
    this.enemy = this.host.spawnTrainingEnemyNear(...offset);
  }

  private goToStep(index: number): void {
    if (index >= this.steps.length) {
      this.finish('Tutorial complete. The realm is yours to explore!');
      return;
    }

    this.stepIndex = index;
    const step = this.steps[index];
    for (const id of step.reveal ?? []) {
      getElement(id).classList.remove('tutorial-hidden');
    }
    step.onEnter?.();
    this.tip.hidden = false;
    this.showStep(step);
  }

  private skip(): void {
    if (this.enemy && !this.enemy.isDead) {
      this.host.removeEnemy(this.enemy);
    }
    this.finish('Tutorial skipped.');
  }

  private finish(message: string): void {
    this.active = false;
    for (const id of LOCKABLE_ELEMENTS) {
      getElement(id).classList.remove('tutorial-hidden');
    }
    this.host.unlockTravel();
    this.host.unlockMissions();
    this.tip.hidden = true;
    this.skipButton.hidden = true;
    this.host.showMessage(message);
  }

  private positionTip(anchor: Anchor): void {
    if (anchor.kind === 'world') {
      const position = anchor.position();
      if (!position) {
        this.tip.style.visibility = 'hidden';
        return;
      }
      const screen = position.clone();
      screen.y += anchor.height;
      screen.project(this.host.camera);
      // Keep the tooltip on screen even when what it points at is off-screen.
      const margin = 120;
      const x = ((screen.x + 1) / 2) * window.innerWidth;
      const y = ((1 - screen.y) / 2) * window.innerHeight;
      this.placeTip(
        Math.min(Math.max(x, margin), window.innerWidth - margin),
        Math.min(Math.max(y, margin), window.innerHeight - margin / 2),
        'above',
      );
      return;
    }

    const rect = getElement(anchor.id).getBoundingClientRect();
    if (rect.width === 0) {
      this.tip.style.visibility = 'hidden';
      return;
    }
    if (anchor.side === 'right') {
      this.placeTip(rect.right, rect.top + rect.height / 2, 'right');
    } else if (anchor.side === 'above') {
      this.placeTip(rect.left + rect.width / 2, rect.top, 'above');
    } else {
      this.placeTip(rect.left + rect.width / 2, rect.bottom, 'below');
    }
  }

  private placeTip(x: number, y: number, side: 'above' | 'right' | 'below'): void {
    this.tip.style.visibility = 'visible';
    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${y}px`;
    this.tip.dataset.side = side;
  }
}
