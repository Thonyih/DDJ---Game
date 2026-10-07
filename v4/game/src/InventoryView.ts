import { BOW_LOOKS } from './Bow';
import { SWORD_LOOKS } from './KnightModel';
import { formatReward } from './Missions';
import {
  ARMOUR_NAME,
  BOW_NAME,
  BOW_RANGE,
  MAX_ARROWS,
  MAX_LEVEL,
  WEAPON_NAME,
  canAfford,
  canUpgrade,
  getBowDamage,
  getMaxHealth,
  getUpgradeCost,
  getWeaponDamage,
  playerData,
  upgradeBow,
  upgradeHealth,
  upgradeWeapon,
} from './PlayerData';

type ItemId = 'sword' | 'bow' | 'armour' | 'gold' | 'spices' | 'arrows';
type UpgradableId = 'sword' | 'bow' | 'armour';

// The 3x3 grid: equipment first, then resources, then empty slots for future items.
const GRID: (ItemId | null)[] = ['sword', 'bow', 'armour', 'gold', 'spices', 'arrows', null, null, null];

// Everything needed to show and upgrade one piece of equipment.
const UPGRADABLE: Record<UpgradableId, {
  name: string;
  level: () => number;
  statName: string;
  stat: (level: number) => number;
  upgrade: () => void;
}> = {
  sword: { name: WEAPON_NAME, level: () => playerData.weaponLevel, statName: 'Damage', stat: getWeaponDamage, upgrade: upgradeWeapon },
  bow: { name: BOW_NAME, level: () => playerData.bowLevel, statName: 'Damage', stat: getBowDamage, upgrade: upgradeBow },
  armour: { name: ARMOUR_NAME, level: () => playerData.healthLevel, statName: 'Max HP', stat: getMaxHealth, upgrade: upgradeHealth },
};

// Simple inline icons. The sword blade uses currentColor so it can take the upgrade colour.
const ICONS: Record<ItemId, string> = {
  sword: `<svg viewBox="0 0 64 64">
    <path d="M50 6 L58 6 L58 14 L28 44 L20 36 Z" fill="currentColor" stroke="#2a2a30" stroke-width="1.5"/>
    <path d="M14 34 L30 50 L26 54 L10 38 Z" fill="#c9a45c"/>
    <path d="M14 46 L18 50 L10 58 L6 54 Z" fill="#5a3a22"/>
    <circle cx="7" cy="57" r="3.5" fill="#c9a45c"/></svg>`,
  bow: `<svg viewBox="0 0 64 64">
    <path d="M18 6 Q54 32 18 58" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <line x1="18" y1="6" x2="18" y2="58" stroke="#eadfc4" stroke-width="1.5"/>
    <line x1="10" y1="32" x2="52" y2="32" stroke="#8b5a2b" stroke-width="2.5"/>
    <path d="M52 32 L45 28 L45 36 Z" fill="#b8bec6"/></svg>`,
  arrows: `<svg viewBox="0 0 64 64">
    <g stroke="#8b5a2b" stroke-width="2.5"><line x1="12" y1="52" x2="48" y2="16"/><line x1="18" y1="56" x2="54" y2="20"/></g>
    <g fill="#b8bec6"><path d="M48 16 L40 18 L46 24 Z"/><path d="M54 20 L46 22 L52 28 Z"/></g>
    <g fill="#a31d1d"><path d="M12 52 L8 50 L10 56 Z"/><path d="M18 56 L14 54 L16 60 Z"/></g></svg>`,
  armour: `<svg viewBox="0 0 64 64">
    <path d="M20 10 L28 14 L36 14 L44 10 L54 18 L50 30 L46 28 L46 54 L18 54 L18 28 L14 30 L10 18 Z"
      fill="#9aa3ad" stroke="#4b5059" stroke-width="2"/>
    <rect x="30" y="22" width="4" height="24" fill="#a31d1d"/>
    <rect x="23" y="29" width="18" height="4" fill="#a31d1d"/></svg>`,
  gold: `<svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="20" fill="#e2b84a" stroke="#9a7420" stroke-width="3"/>
    <circle cx="32" cy="32" r="12" fill="none" stroke="#9a7420" stroke-width="2"/></svg>`,
  spices: `<svg viewBox="0 0 64 64">
    <path d="M22 22 Q32 16 42 22 L48 50 Q32 58 16 50 Z" fill="#a0612b" stroke="#5e3514" stroke-width="2"/>
    <path d="M24 22 Q32 27 40 22" stroke="#d9a441" stroke-width="3" fill="none"/>
    <circle cx="26" cy="40" r="2.5" fill="#c0392b"/><circle cx="34" cy="44" r="2.5" fill="#e67e22"/>
    <circle cx="38" cy="36" r="2.5" fill="#c0392b"/></svg>`,
};

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// The Inventory panel's grid. Clicking an item opens a small card next to it;
// the sword and armour cards have the upgrade button.
export class InventoryView {
  private readonly grid = getElement('inventory-grid');
  private readonly card = getElement('item-card');
  private readonly slots = new Map<ItemId, HTMLElement>();
  private readonly onUpgraded: () => void;
  private readonly onSelect: () => void;
  private openItem: ItemId | null = null;

  constructor(onUpgraded: () => void, onSelect: () => void) {
    this.onUpgraded = onUpgraded;
    this.onSelect = onSelect;

    for (const item of GRID) {
      const slot = document.createElement('div');
      slot.className = item ? 'inv-slot' : 'inv-slot empty';
      if (item) {
        slot.addEventListener('click', (event) => {
          event.stopPropagation();
          this.onSelect();
          this.toggleCard(item);
        });
        this.slots.set(item, slot);
      }
      this.grid.appendChild(slot);
    }

    // Clicking anywhere else in the panel closes the card.
    getElement('inventory').addEventListener('click', (event) => {
      if (!this.card.contains(event.target as Node)) {
        this.closeCard();
      }
    });
  }

  closeCard(): void {
    this.openItem = null;
    this.card.hidden = true;
    this.refresh();
  }

  refresh(): void {
    const weaponLevel = playerData.weaponLevel;
    const swordLook = SWORD_LOOKS[weaponLevel - 1];

    this.fillSlot('sword', `Lv ${weaponLevel}`, '', canUpgrade(weaponLevel));
    // The sword icon grows and takes the blade colour of its level.
    const swordIcon = this.slots.get('sword')!.querySelector('svg')!;
    swordIcon.style.width = swordIcon.style.height = `${40 * swordLook.size}%`;
    swordIcon.style.color = hex(swordLook.color === 0xffffff ? 0xc8ccd2 : swordLook.color);

    const bowLook = BOW_LOOKS[playerData.bowLevel - 1];
    this.fillSlot('bow', `Lv ${playerData.bowLevel}`, '', canUpgrade(playerData.bowLevel));
    const bowIcon = this.slots.get('bow')!.querySelector('svg')!;
    bowIcon.style.width = bowIcon.style.height = `${40 * bowLook.size}%`;
    bowIcon.style.color = hex(bowLook.color);

    this.fillSlot('armour', `Lv ${playerData.healthLevel}`, '', canUpgrade(playerData.healthLevel));
    this.fillSlot('arrows', '', `${playerData.arrows}/${MAX_ARROWS}`, false);
    this.fillSlot('gold', '', String(playerData.gold), false);
    this.fillSlot('spices', '', String(playerData.spices), false);

    for (const [item, slot] of this.slots) {
      slot.classList.toggle('selected', item === this.openItem);
    }
    if (this.openItem) {
      this.renderCard(this.openItem);
    }
  }

  private fillSlot(item: ItemId, badge: string, amount: string, glowing: boolean): void {
    const slot = this.slots.get(item)!;
    if (!slot.querySelector('svg')) {
      slot.innerHTML = ICONS[item];
      for (const className of ['badge', 'amount']) {
        const label = document.createElement('span');
        label.className = className;
        slot.appendChild(label);
      }
    }
    slot.querySelector('.badge')!.textContent = badge;
    slot.querySelector('.amount')!.textContent = amount;
    slot.classList.toggle('can-upgrade', glowing);
  }

  private toggleCard(item: ItemId): void {
    if (this.openItem === item) {
      this.closeCard();
      return;
    }
    this.openItem = item;
    this.card.hidden = false;
    this.refresh();
  }

  private renderCard(item: ItemId): void {
    this.card.replaceChildren();
    const add = (tag: string, text: string, className = 'card-line'): HTMLElement => {
      const element = document.createElement(tag);
      element.className = className;
      element.textContent = text;
      this.card.appendChild(element);
      return element;
    };

    if (item === 'gold' || item === 'spices') {
      add('h4', item === 'gold' ? 'Gold' : 'Spices', '');
      add('div', `You have ${item === 'gold' ? playerData.gold : playerData.spices}.`);
      add('div', item === 'gold' ? 'Rare. Needed for every upgrade.' : 'Common. Needed for every upgrade.');
    } else if (item === 'arrows') {
      add('h4', 'Arrows', '');
      add('div', `You have ${playerData.arrows} / ${MAX_ARROWS}.`);
      add('div', 'Each bow shot uses one. Half of all chests hold 2 more.');
    } else {
      const { name, level: getLevel, statName, stat, upgrade } = UPGRADABLE[item];
      const level = getLevel();

      add('h4', name, '');
      add('div', `Level ${level} / ${MAX_LEVEL}`);
      if (item === 'bow') {
        add('div', `Range ${BOW_RANGE}`);
      }
      if (level >= MAX_LEVEL) {
        add('div', `${statName} ${stat(level)} (max level)`);
      } else {
        const cost = getUpgradeCost(level);
        add('div', `${statName} ${stat(level)} → ${stat(level + 1)}`);
        add('div', `Cost: ${formatReward(cost)}`, canAfford(cost) ? 'card-line card-cost' : 'card-line card-cost short');
      }

      const button = add('button', level >= MAX_LEVEL ? 'Max level' : 'Upgrade', '') as HTMLButtonElement;
      button.disabled = !canUpgrade(level);
      button.addEventListener('click', () => {
        upgrade();
        this.onUpgraded();
      });
    }

    this.positionCard(this.slots.get(item)!);
  }

  // Beside the grid, level with the clicked slot (kept inside the panel).
  private positionCard(slot: HTMLElement): void {
    const gridBottom = this.grid.offsetTop + this.grid.offsetHeight;
    this.card.style.left = `${this.grid.offsetLeft + this.grid.offsetWidth + 16}px`;
    this.card.style.top = `${Math.min(slot.offsetTop, gridBottom - this.card.offsetHeight)}px`;
  }
}
