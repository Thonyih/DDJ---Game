import { ADAMASTOR, GRUNT, type EnemyType } from './Enemy';

export interface Reward {
  gold: number;
  spices: number;
}

export interface Mission {
  name: string;
  objective: string;
  enemyType: EnemyType;
  enemyCount: number;
  reward: Reward;
}

export const MISSIONS: Mission[] = [
  {
    name: 'Clear the Field',
    objective: 'Defeat 3 enemies',
    enemyType: GRUNT,
    enemyCount: 3,
    reward: { gold: 2, spices: 50 },
  },
  {
    name: 'Hold the Line',
    objective: 'Defeat 5 enemies',
    enemyType: GRUNT,
    enemyCount: 5,
    reward: { gold: 5, spices: 120 },
  },
  {
    name: 'Adamastor',
    objective: 'Defeat the giant Adamastor',
    enemyType: ADAMASTOR,
    enemyCount: 1,
    reward: { gold: 12, spices: 300 },
  },
];

export function formatReward(reward: Reward): string {
  return `${reward.gold} gold, ${reward.spices} spices`;
}
