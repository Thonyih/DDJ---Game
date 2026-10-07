import { ADAMASTOR, GRUNT, MAPINGUARI, SPECTRE, TEMPLAR, WITCH, WOLF, type EnemyType } from './Enemy';
import { playerData } from './PlayerData';

export interface Reward {
  gold: number;
  spices: number;
}

// What a mission asks for: defeat enemies that spawn around the player, open chests on the map,
// or travel to a spot on a given map and pick up an item there.
export type MissionGoal =
  | { kind: 'defeat'; enemyType: EnemyType; count: number }
  | { kind: 'chests'; count: number }
  | { kind: 'fetch'; count: 1; map: string; x: number; z: number; item: string };

export interface Mission {
  name: string;
  objective: string;
  // 1-4: the row of maps whose Capitão gives this mission (1 = A B C ... 4 = J K L).
  tier: number;
  goal: MissionGoal;
  reward: Reward;
}

export const MISSIONS: Mission[] = [
  // Tier 1: Campos de Tomar, Bosque dos Templários, Ruínas do Convento
  {
    name: 'Find the Lost Chests',
    objective: 'Find and open 2 chests',
    tier: 1,
    goal: { kind: 'chests', count: 2 },
    reward: { gold: 1, spices: 30 },
  },
  {
    name: 'Clear the Field',
    objective: 'Defeat 3 enemies',
    tier: 1,
    goal: { kind: 'defeat', enemyType: GRUNT, count: 3 },
    reward: { gold: 2, spices: 50 },
  },
  {
    name: 'Wolves of Tomar',
    objective: 'Defeat a pack of 3 Lobisomem',
    tier: 1,
    goal: { kind: 'defeat', enemyType: WOLF, count: 3 },
    reward: { gold: 3, spices: 80 },
  },
  // Tier 2: Túneis de Tomar, Fronteira de Trancoso, Campos dos Cavaleiros Fantasma
  {
    name: 'Hold the Line',
    objective: 'Defeat 5 enemies',
    tier: 2,
    goal: { kind: 'defeat', enemyType: GRUNT, count: 5 },
    reward: { gold: 5, spices: 120 },
  },
  {
    name: 'The Restless Templars',
    objective: 'Defeat 4 Templário Perdido',
    tier: 2,
    goal: { kind: 'defeat', enemyType: TEMPLAR, count: 4 },
    reward: { gold: 6, spices: 150 },
  },
  {
    name: 'The Templar Relic',
    objective: 'Travel to Map F and recover the Templar Relic',
    tier: 2,
    goal: { kind: 'fetch', count: 1, map: 'F', x: 22, z: 20, item: 'Templar Relic' },
    reward: { gold: 8, spices: 200 },
  },
  // Tier 3: Serra das Sombras, Caminho de Lisboa, Costa dos Navios Negros
  {
    name: 'Witches of the Serra',
    objective: 'Defeat 3 Bruxa',
    tier: 3,
    goal: { kind: 'defeat', enemyType: WITCH, count: 3 },
    reward: { gold: 10, spices: 260 },
  },
  {
    name: 'The Spectral Crew',
    objective: 'Defeat 5 drowned spirits',
    tier: 3,
    goal: { kind: 'defeat', enemyType: SPECTRE, count: 5 },
    reward: { gold: 12, spices: 300 },
  },
  {
    name: 'The Lost Astrolabe',
    objective: 'Travel to Map I and recover the Lost Astrolabe',
    tier: 3,
    goal: { kind: 'fetch', count: 1, map: 'I', x: 23, z: -22, item: 'Lost Astrolabe' },
    reward: { gold: 14, spices: 350 },
  },
  // Tier 4: Cabo das Tormentas, Ilhas dos Corsários, Costa do Além-Mar
  {
    name: 'The Mapinguari',
    objective: 'Defeat the beast Mapinguari',
    tier: 4,
    goal: { kind: 'defeat', enemyType: MAPINGUARI, count: 1 },
    reward: { gold: 20, spices: 500 },
  },
  {
    name: 'Adamastor',
    objective: 'Defeat the giant Adamastor',
    tier: 4,
    goal: { kind: 'defeat', enemyType: ADAMASTOR, count: 1 },
    reward: { gold: 30, spices: 800 },
  },
];

export function missionsForTier(tier: number): Mission[] {
  return MISSIONS.filter((mission) => mission.tier === tier);
}

export function formatReward(reward: Reward): string {
  return `${reward.gold} gold, ${reward.spices} spices`;
}

export function isMissionCompleted(mission: Mission): boolean {
  return playerData.completedMissions.includes(mission.name);
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
