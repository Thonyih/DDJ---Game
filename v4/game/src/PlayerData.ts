import type { Reward } from './Missions';

// Progress kept in memory only; it resets when the page reloads.
export const playerData = {
  gold: 0,
  spices: 0,
  weaponLevel: 1,
  bowLevel: 1,
  healthLevel: 1,
  arrows: 5,
  selectedWeapon: 'sword' as WeaponKind,
  // Names of missions completed at least once (they unlock the next mission).
  completedMissions: [] as string[],
};

export type WeaponKind = 'sword' | 'bow';

export const WEAPON_NAME = 'Iron Sword';
export const BOW_NAME = 'Hunting Bow';
export const MAX_ARROWS = 5;
// How far the bow can shoot (the sword only reaches about 2.5).
export const BOW_RANGE = 10;
export const ARMOUR_NAME = "Knight's Armour";
// Sword and health both go from level 1 to MAX_LEVEL.
export const MAX_LEVEL = 4;

export function getWeaponDamage(level: number): number {
  return 10 + (level - 1) * 5;
}

export function getBowDamage(level: number): number {
  return 8 + (level - 1) * 4;
}

export function getMaxHealth(level: number): number {
  return 100 + (level - 1) * 25;
}

// Cost to go from `level` to the next one; each level costs 5x the previous
// (Lv2: 1 gold + 30 spices, Lv3: 5 + 150, Lv4: 25 + 750). Same for sword, bow and health.
export function getUpgradeCost(level: number): Reward {
  const factor = 5 ** (level - 1);
  return { gold: factor, spices: 30 * factor };
}

// True if the item at this level can be upgraded right now (not maxed and affordable).
export function canUpgrade(level: number): boolean {
  return level < MAX_LEVEL && canAfford(getUpgradeCost(level));
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
  if (playerData.weaponLevel < MAX_LEVEL && pay(getUpgradeCost(playerData.weaponLevel))) {
    playerData.weaponLevel += 1;
  }
}

export function upgradeBow(): void {
  if (playerData.bowLevel < MAX_LEVEL && pay(getUpgradeCost(playerData.bowLevel))) {
    playerData.bowLevel += 1;
  }
}

// Adds arrows up to the quiver's limit; returns how many were actually added.
export function addArrows(count: number): number {
  const before = playerData.arrows;
  playerData.arrows = Math.min(MAX_ARROWS, playerData.arrows + count);
  return playerData.arrows - before;
}

export function upgradeHealth(): void {
  if (playerData.healthLevel < MAX_LEVEL && pay(getUpgradeCost(playerData.healthLevel))) {
    playerData.healthLevel += 1;
  }
}

// Total sword, bow and health upgrades bought so far.
export function upgradesBought(): number {
  return playerData.weaponLevel - 1 + (playerData.bowLevel - 1) + (playerData.healthLevel - 1);
}

export function addReward(reward: Reward): void {
  playerData.gold += reward.gold;
  playerData.spices += reward.spices;
}
