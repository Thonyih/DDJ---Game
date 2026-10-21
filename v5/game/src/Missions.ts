import {
  ADAMASTOR,
  CABO_CAPTAIN,
  CASTAWAY,
  MAPINGUARI,
  PIRATE,
  RELIC_GUARDIAN,
  SENTINEL,
  SPECTRE,
  TEMPLAR,
  WITCH,
  WOLF,
  type EnemyType,
} from './Enemy';
import { playerData } from './PlayerData';

export interface Reward {
  gold: number;
  spices: number;
}

// What a mission asks for: defeat enemies that spawn around the player, open chests on the map,
// or travel to a spot on a given map and pick up an item there.
export type MissionGoal =
  // Without an enemyType, the enemies are a mix from the current map's list (MapEnemies.ts).
  | { kind: 'defeat'; enemyType?: EnemyType; count: number }
  | { kind: 'chests'; count: number }
  | {
      kind: 'fetch';
      count: 1;
      map: string;
      x: number;
      z: number;
      item: string;
      // Enemies that stand guard next to the item.
      guards?: { enemyType: EnemyType; count: number };
    };

export interface Mission {
  name: string;
  objective: string;
  // One line of story context, shown in the Missions panel.
  story: string;
  // 1-4: the row of maps whose Capitão gives this mission (1 = A B C ... 4 = J K L).
  tier: number;
  // Only offered by the Capitão on this map (the bosses); otherwise by every Capitão of the tier.
  map?: string;
  // Missions that must be completed before this one can start (Adamastor comes last).
  requires?: string[];
  goal: MissionGoal;
  reward: Reward;
}

export const MISSIONS: Mission[] = [
  // Tier 1: Campos de Tomar, Bosque dos Templários, Ruínas do Convento
  {
    name: 'Find the Lost Chests',
    objective: 'Find and open 2 chests',
    story: 'Supplies have vanished near Tomar. Find them before the darkness claims the roads.',
    tier: 1,
    goal: { kind: 'chests', count: 2 },
    reward: { gold: 1, spices: 30 },
  },
  {
    name: 'Clear the Field',
    objective: 'Defeat 3 enemies of this land',
    story: 'Creatures gather where the fields were once safe. Drive them back.',
    tier: 1,
    goal: { kind: 'defeat', count: 3 },
    reward: { gold: 2, spices: 50 },
  },
  {
    name: 'Wolves of Tomar',
    objective: 'Defeat a pack of 3 Lobisomem',
    story: 'The wolves have grown unusually bold. Discover what has driven them from the woods.',
    tier: 1,
    goal: { kind: 'defeat', enemyType: WOLF, count: 3 },
    reward: { gold: 3, spices: 80 },
  },
  // Tier 2: Túneis de Tomar, Fronteira de Trancoso, Campos dos Cavaleiros Fantasma
  {
    name: 'Hold the Line',
    objective: 'Defeat 5 enemies of this land',
    story: 'The frontier is failing. Hold the path against the restless dead.',
    tier: 2,
    goal: { kind: 'defeat', count: 5 },
    reward: { gold: 5, spices: 120 },
  },
  {
    name: 'The Restless Templars',
    objective: 'Defeat 4 Templário Perdido',
    story: 'The fallen Templars walk again. Give them rest.',
    tier: 2,
    goal: { kind: 'defeat', enemyType: TEMPLAR, count: 4 },
    reward: { gold: 6, spices: 150 },
  },
  {
    name: 'The Templar Relic',
    objective: 'Travel to Map F and recover the Templar Relic',
    story: 'A relic lies among the haunted fields. Recover it and continue the investigation.',
    tier: 2,
    goal: {
      kind: 'fetch',
      count: 1,
      map: 'F',
      x: 22,
      z: 20,
      item: 'Templar Relic',
      guards: { enemyType: RELIC_GUARDIAN, count: 2 },
    },
    reward: { gold: 8, spices: 200 },
  },
  {
    name: 'Sentinels of Trancoso',
    objective: 'Defeat 4 Sentinela de Trancoso',
    story: 'Spectral sentinels still guard Trancoso, but no longer know friend from foe.',
    tier: 2,
    goal: { kind: 'defeat', enemyType: SENTINEL, count: 4 },
    reward: { gold: 7, spices: 170 },
  },
  // Tier 3: Serra das Sombras, Caminho de Lisboa, Costa dos Navios Negros
  {
    name: 'Witches of the Serra',
    objective: 'Defeat 3 Bruxa',
    story: 'Strange rites have appeared in the mountains. End them.',
    tier: 3,
    goal: { kind: 'defeat', enemyType: WITCH, count: 3 },
    reward: { gold: 10, spices: 260 },
  },
  {
    name: 'The Spectral Crew',
    objective: 'Defeat 5 drowned spirits',
    story: 'The dead have returned from the sea. Find what drew them ashore.',
    tier: 3,
    goal: { kind: 'defeat', enemyType: SPECTRE, count: 5 },
    reward: { gold: 12, spices: 300 },
  },
  {
    name: 'The Lost Astrolabe',
    objective: 'Travel to Map I and recover the Lost Astrolabe',
    story: 'Recover the lost astrolabe; its route may point toward the source of the storms.',
    tier: 3,
    goal: { kind: 'fetch', count: 1, map: 'I', x: 23, z: -22, item: 'Lost Astrolabe' },
    reward: { gold: 14, spices: 350 },
  },
  {
    name: 'Pirates of the Berlengas',
    objective: 'Defeat 4 Pirata das Berlengas',
    story: 'Corsairs haunt the islands and coastal routes. Break their hold.',
    tier: 3,
    goal: { kind: 'defeat', enemyType: PIRATE, count: 4 },
    reward: { gold: 11, spices: 280 },
  },
  {
    name: 'The Black Ship',
    objective: 'Defeat 4 Náufrago do Navio Negro',
    story: 'A black ship appears where no vessel should sail. Investigate its wake.',
    tier: 3,
    goal: { kind: 'defeat', enemyType: CASTAWAY, count: 4 },
    reward: { gold: 13, spices: 320 },
  },
  // Tier 4: Cabo das Tormentas, Ilhas dos Corsários, Costa do Além-Mar
  {
    name: 'The Captain of Cabo da Roca',
    objective: 'Defeat the ghostly Capitão do Cabo da Roca',
    story: 'The ghostly captain commands the cursed shore. End his reign.',
    tier: 4,
    map: 'K',
    goal: { kind: 'defeat', enemyType: CABO_CAPTAIN, count: 1 },
    reward: { gold: 25, spices: 650 },
  },
  {
    name: 'The Mapinguari',
    objective: 'Defeat the beast Mapinguari',
    story: 'A monstrous beast blocks the way. Defeat it to continue your journey.',
    tier: 4,
    map: 'L',
    goal: { kind: 'defeat', enemyType: MAPINGUARI, count: 1 },
    reward: { gold: 20, spices: 500 },
  },
  {
    name: 'Adamastor',
    objective: 'Defeat the giant Adamastor',
    story: 'The giant has awakened. Face him before Portugal is lost.',
    tier: 4,
    map: 'J',
    requires: ['The Captain of Cabo da Roca', 'The Mapinguari'],
    goal: { kind: 'defeat', enemyType: ADAMASTOR, count: 1 },
    reward: { gold: 30, spices: 800 },
  },
];

// Missions a Capitão offers: his tier's missions, plus a boss mission only on that boss's map.
export function missionsForMap(tier: number, map: string): Mission[] {
  return MISSIONS.filter((mission) => mission.tier === tier && (!mission.map || mission.map === map));
}

export function formatReward(reward: Reward): string {
  return `${reward.gold} gold, ${reward.spices} spices`;
}

export function isMissionCompleted(mission: Mission): boolean {
  return playerData.completedMissions.includes(mission.name);
}

// Completing this many different missions of a tier opens the next row of maps (north).
export const MISSIONS_TO_UNLOCK_NEXT_TIER = 3;

export function completedInTier(tier: number): number {
  return MISSIONS.filter((mission) => mission.tier === tier && isMissionCompleted(mission)).length;
}

// Row 0 (tier 1) is always open; each row above needs enough missions done in the row below.
export function isRowUnlocked(row: number): boolean {
  return row === 0 || completedInTier(row) >= MISSIONS_TO_UNLOCK_NEXT_TIER;
}

// True while a mission's required missions are not all completed.
export function isMissionLocked(mission: Mission): boolean {
  return (mission.requires ?? []).some((name) => !playerData.completedMissions.includes(name));
}

export function markMissionCompleted(mission: Mission): void {
  if (!isMissionCompleted(mission)) {
    playerData.completedMissions.push(mission.name);
  }
}

// Verb for the mission tracker, e.g. "2 / 3 defeated".
export function progressWord(goal: MissionGoal): string {
  return goal.kind === 'defeat' ? 'defeated' : 'found';
}
