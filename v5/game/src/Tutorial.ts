import * as THREE from 'three';
import type { Chest } from './Chest';
import type { Enemy } from './Enemy';
import { MISSIONS_TO_UNLOCK_NEXT_TIER, completedInTier } from './Missions';
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
  // How often each mouse gesture has been used.
  gestureUses: () => { frenzy: number; push: number; heal: number };
  onStepComplete: () => void;
}

// Where a tooltip points: above something in the 3D world, or beside an on-screen element.
type Anchor =
  | { kind: 'world'; position: () => THREE.Vector3 | null; height: number }
  | { kind: 'element'; id: string; side: 'right' | 'below' | 'above' };

// A function for text that changes while the step is shown (e.g. a progress count).
type TipText = string | (() => string);

interface Step {
  text: TipText;
  anchor: Anchor;
  // Different text and target while a condition holds (e.g. a panel is open over the target).
  alternative?: { when: () => boolean; text: TipText; anchor: Anchor };
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

// A small mouse picture with a short note, shown under tips where a mouse matters.
function mouseNote(text: string): string {
  return `<span class="tip-mouse"><svg viewBox="0 0 24 34" aria-hidden="true">
    <path d="M12 1 Q12 -2 16 -3" fill="none" stroke="#c9a45c" stroke-width="1.5"/>
    <rect x="2" y="1" width="20" height="31" rx="10" fill="#2b2430" stroke="#e2c27a" stroke-width="2"/>
    <path d="M2 13 H22 M12 1 V13" stroke="#e2c27a" stroke-width="1.5"/>
    <rect x="10.5" y="5" width="3" height="5" rx="1.5" fill="#e2c27a"/></svg>${text}</span>`;
}

const MOVE_DISTANCE = 3;
// Screen-up in the isometric view is world (-x, -z), so these offsets place things in view.
const CHEST_OFFSET: [number, number] = [-3, -3];
const ENEMY_OFFSET: [number, number] = [-4.5, -4.5];
// The bow lesson's enemy starts farther away, so it can be shot before it comes close.
const FAR_ENEMY_OFFSET: [number, number] = [-6.5, -6.5];

// e.g. "1/3": Tier 1 missions completed out of those needed to unlock the north.
function tierOneProgress(): string {
  return `${Math.min(completedInTier(1), MISSIONS_TO_UNLOCK_NEXT_TIER)}/${MISSIONS_TO_UNLOCK_NEXT_TIER}`;
}

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
    const text = typeof current.text === 'function' ? current.text() : current.text;
    if (this.tipText !== text) {
      this.tipText = text;
      this.tip.innerHTML = text;
    }
    this.positionTip(current.anchor);
  }

  private createSteps(): Step[] {
    this.missionStartStep = {
      text: 'Talk to the <strong>Capitão</strong>: <strong>right-click</strong> him.',
      anchor: { kind: 'world', position: () => this.host.missionGiverPosition(), height: 3.4 },
      // The Missions panel opens over the Capitão, so point at its Start button instead.
      alternative: {
        when: () => this.host.isMissionsPanelOpen(),
        text: 'Press <strong>Start Mission</strong>.',
        anchor: { kind: 'element', id: 'start-mission', side: 'right' },
      },
      onEnter: () => this.host.unlockMissions(),
      isDone: () => this.host.hasActiveMission(),
    };
    this.missionProgressStep = {
      text: 'Open <strong>2 chests</strong> on this map.',
      anchor: { kind: 'element', id: 'mission-tracker', side: 'right' },
      isDone: () => this.host.missionsCompleted() > 0,
    };

    return [
      {
        text: '<strong>Left-click</strong> to move. <strong>Hold</strong> to keep walking.',
        anchor: { kind: 'world', position: () => this.host.playerPosition(), height: 1.6 },
        onEnter: () => this.startPosition.copy(this.host.playerPosition()),
        isDone: () => this.host.playerPosition().distanceTo(this.startPosition) >= MOVE_DISTANCE,
      },
      {
        text: '<strong>Right-click</strong> the chest to open it.',
        anchor: { kind: 'world', position: () => this.chest?.position ?? null, height: 0.9 },
        onEnter: () => {
          this.chest = this.host.spawnChestNear(...CHEST_OFFSET);
        },
        isDone: () => this.chest !== null && !this.host.hasChest(this.chest),
      },
      {
        text: `<strong>Right-click</strong> the enemy to attack with your <strong>sword</strong>.${mouseNote('Recommended Mouse Use')}`,
        anchor: { kind: 'world', position: () => this.enemy?.position ?? null, height: 1.6 },
        reveal: ['resources', 'health-bar', 'slots'],
        onEnter: () => {
          playerData.selectedWeapon = 'sword';
          this.spawnTrainingEnemy(ENEMY_OFFSET);
        },
        isDone: () => this.enemy !== null && this.enemy.isDead,
      },
      {
        text: 'Click the <strong>bow</strong> slot.',
        anchor: { kind: 'element', id: 'slot-2', side: 'above' },
        onEnter: () => {
          playerData.arrows = MAX_ARROWS;
        },
        isDone: () => playerData.selectedWeapon === 'bow',
      },
      {
        text: '<strong>Right-click</strong> the enemy to shoot. Max <strong>5 arrows</strong>.',
        anchor: { kind: 'world', position: () => this.enemy?.position ?? null, height: 1.6 },
        onEnter: () => this.spawnTrainingEnemy(FAR_ENEMY_OFFSET),
        isDone: () => this.enemy !== null && this.enemy.isDead,
      },
      // Mouse gestures (free movement, no button).
      {
        text: `Shake the mouse <strong>side to side</strong>, very fast: <strong>Frenzy</strong>, faster attacks.${mouseNote('Recommended Mouse Use')}`,
        anchor: { kind: 'element', id: 'slot-5', side: 'above' },
        isDone: () => this.host.gestureUses().frenzy > 0,
      },
      {
        text: 'Draw a big <strong>circle</strong>, very fast: <strong>Dust Push</strong> knocks enemies back.',
        anchor: { kind: 'element', id: 'slot-3', side: 'above' },
        isDone: () => this.host.gestureUses().push > 0,
      },
      {
        text: 'Draw a big <strong>+</strong>, very fast (across, then down): <strong>Heal</strong> 20 HP.',
        anchor: { kind: 'element', id: 'slot-4', side: 'above' },
        isDone: () => this.host.gestureUses().heal > 0,
      },
      this.missionStartStep,
      this.missionProgressStep,
      {
        text: 'Open <strong>Inventory</strong> and upgrade a <strong>glowing</strong> item.',
        anchor: { kind: 'element', id: 'inventory-button', side: 'right' },
        reveal: ['inventory-button'],
        isDone: () => upgradesBought() > 0,
      },
      {
        text: 'Open the <strong>Map</strong>. Further <strong>north</strong> = harder missions.',
        anchor: { kind: 'element', id: 'map-button', side: 'below' },
        reveal: ['minimap', 'map-button', 'map-name', 'compass'],
        isDone: () => this.host.isWorldMapOpen(),
      },
      {
        // The north stays locked until 3 Tier 1 missions are done (the tutorial's chest mission is 1).
        text: () => `Complete <strong>${tierOneProgress()}</strong> missions to unlock the north. Talk to the <strong>Capitão</strong>.`,
        anchor: { kind: 'world', position: () => this.host.missionGiverPosition(), height: 3.4 },
        alternative: {
          when: () => this.host.hasActiveMission(),
          text: () => `Finish the mission. <strong>${tierOneProgress()}</strong> missions done.`,
          anchor: { kind: 'element', id: 'mission-tracker', side: 'right' },
        },
        isDone: () => completedInTier(1) >= MISSIONS_TO_UNLOCK_NEXT_TIER,
      },
      {
        text: 'North is open! Walk to the <strong>top gold border</strong> and <strong>Travel</strong>.',
        anchor: { kind: 'element', id: 'map-button', side: 'below' },
        onEnter: () => this.host.unlockTravel(),
        // Done on reaching any map of the second row (D E F).
        isDone: () => ['D', 'E', 'F'].includes(this.host.currentMap()),
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
      // Keep the whole tooltip (it sits above the point) on screen, even when what it points at is
      // off-screen.
      const halfWidth = this.tip.offsetWidth / 2 + 30;
      const height = this.tip.offsetHeight + 40;
      const x = ((screen.x + 1) / 2) * window.innerWidth;
      const y = ((1 - screen.y) / 2) * window.innerHeight;
      this.placeTip(
        Math.min(Math.max(x, halfWidth), window.innerWidth - halfWidth),
        Math.min(Math.max(y, height), window.innerHeight - 60),
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
