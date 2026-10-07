import type { ModelOptions } from './AnimatedModel';
import type { ModelName } from './Assets';
import { KNIGHT_SPARE_GEAR } from './KnightModel';

// Which animation each model plays for each action.
export interface EnemyClips {
  idle: string;
  move: string;
  attack: string;
  hit: string;
  death: string;
}

export interface EnemyLook extends ModelOptions {
  model: ModelName;
  clips: EnemyClips;
}

const KAYKIT_ARMED: EnemyClips = {
  idle: 'Idle',
  move: 'Walking_A',
  attack: '1H_Melee_Attack_Chop',
  hit: 'Hit_A',
  death: 'Death_A',
};
// The KayKit skeletons come without weapons, so they punch.
const KAYKIT_UNARMED: EnemyClips = { ...KAYKIT_ARMED, attack: 'Unarmed_Melee_Attack_Punch_A' };
const FLYING: EnemyClips = {
  idle: 'Flying_Idle',
  move: 'Fast_Flying',
  attack: 'Punch',
  hit: 'HitReact',
  death: 'Death',
};

const ROGUE_SPARE_GEAR = ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable'];

// The look of each enemy, by name (see the enemy name lists in Enemy.ts).
export const ENEMY_LOOKS: Record<string, EnemyLook> = {
  'Cavaleiro Fantasma': { model: 'Knight', height: 2.1, clips: KAYKIT_ARMED, hide: KNIGHT_SPARE_GEAR, ghost: true },
  'Templário Perdido': { model: 'Skeleton_Warrior', height: 2, clips: KAYKIT_UNARMED },
  'Corsário Espectral': { model: 'Skeleton_Rogue', height: 2, clips: KAYKIT_UNARMED, ghost: true },
  'Marinheiro Naufragado': { model: 'Skeleton_Minion', height: 1.9, clips: KAYKIT_UNARMED },
  'Alma do Naufrágio': { model: 'Ghost', height: 1.8, clips: FLYING },
  'Lobisomem': {
    model: 'Wolf',
    height: 1.8,
    clips: { idle: 'Idle', move: 'Walk', attack: 'Attack', hit: 'Idle_HitReact_Left', death: 'Death' },
  },
  'Moura Encantada': { model: 'Rogue_Hooded', height: 2, clips: KAYKIT_ARMED, hide: ROGUE_SPARE_GEAR, ghost: true },
  'Bruxa': { model: 'Skeleton_Mage', height: 2, clips: KAYKIT_UNARMED },
  'Diabrete': { model: 'Demon_Small', height: 1.5, clips: FLYING },
  'Mapinguari': {
    model: 'Yeti',
    height: 2.6,
    clips: { idle: 'Idle', move: 'Walk', attack: 'Attack', hit: 'HitRecieve', death: 'Death' },
  },
  'Adamastor': {
    model: 'Demon_Large',
    height: 4.5,
    // White giant; horns, trident and eyes keep their own colours.
    colors: { Demon_Main: 0xf2f2f2 },
    clips: { idle: 'Idle', move: 'Walk', attack: 'Punch', hit: 'HitReact', death: 'Death' },
  },
};
