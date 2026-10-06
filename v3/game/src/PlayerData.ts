import type { Reward } from './Missions';

// Progress kept in memory only; it resets when the page reloads.
export const playerData = {
  gold: 0,
  spices: 0,
  weaponLevel: 1,
  healthLevel: 1,
};

export const WEAPON_NAME = 'Iron Sword';

export function getWeaponDamage(level: number): number {
  return 10 + (level - 1) * 5;
}

export function getMaxHealth(level: number): number {
  return 100 + (level - 1) * 25;
}

// Same cost curve for weapon and health upgrades.
export function getUpgradeCost(level: number): Reward {
  return { gold: level, spices: 30 * level };
}

export function canAfford(cost: Reward): boolean {
  return playerData.gold >= cost.gold && playerData.spices >= cost.spices;
}

function pay(cost: Reward): boolean {
  if (!canAfford(cost)) {
    return false;
  }
  playerData.gold -= cost.gold;
  playerData.spices -= cost.spices;
  return true;
}

export function upgradeWeapon(): void {
  if (pay(getUpgradeCost(playerData.weaponLevel))) {
    playerData.weaponLevel += 1;
  }
}

export function upgradeHealth(): void {
  if (pay(getUpgradeCost(playerData.healthLevel))) {
    playerData.healthLevel += 1;
  }
}

export function addReward(reward: Reward): void {
  playerData.gold += reward.gold;
  playerData.spices += reward.spices;
}
