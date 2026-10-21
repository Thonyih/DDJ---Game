import type { ModelOptions } from './AnimatedModel';
import type { ModelName } from './Assets';
import { KNIGHT_SPARE_GEAR } from './KnightModel';

// Which animation each model plays for each action.
export interface EnemyClips {
  idle: string;
  move: string;
  attack: string;
  // Optional: models without these just flash when hit, and sink into the ground when they die.
  hit?: string;
  death?: string;
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
// The pirate keeps both knives.
const PIRATE_SPARE_GEAR = ['1H_Crossbow', '2H_Crossbow', 'Throwable'];
// The guardian keeps only his staff.
const MAGE_SPARE_GEAR = ['Spellbook', 'Spellbook_open', '1H_Wand'];

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
  'Guardião da Relíquia': {
    model: 'Mage',
    height: 2.1,
    hide: MAGE_SPARE_GEAR,
    tint: 0xe8c878, // gold, like the relic he guards
    clips: { ...KAYKIT_ARMED, attack: '2H_Melee_Attack_Chop' },
  },
  'Sentinela de Trancoso': {
    model: 'Skeleton',
    height: 2,
    clips: { idle: 'Idle', move: 'Walk', attack: 'Attack', hit: 'HitRecieve', death: 'Death' },
  },
  'Pirata das Berlengas': {
    model: 'Rogue',
    height: 2,
    hide: PIRATE_SPARE_GEAR,
    tint: 0xd89090, // reddish, sea-worn
    clips: { ...KAYKIT_ARMED, attack: 'Dualwield_Melee_Attack_Chop' },
  },
  'Náufrago do Navio Negro': {
    model: 'Zombie',
    height: 2,
    // No hit or death animation in this model: it flashes when hit and sinks when it dies.
    clips: { idle: 'ZombieIdle', move: 'ZombieWalk', attack: 'ZombieBite' },
  },
  'Capitão do Cabo da Roca': {
    model: 'Pirate_Captain',
    height: 3.6,
    ghost: true,
    clips: { idle: 'Idle', move: 'Walk', attack: 'Sword', hit: 'HitReact', death: 'Death' },
  },
  'Adamastor': {
    model: 'Demon_Large',
    height: 4.5,
    // White giant; horns, trident and eyes keep their own colours.
    colors: { Demon_Main: 0xf2f2f2 },
    clips: { idle: 'Idle', move: 'Walk', attack: 'Punch', hit: 'HitReact', death: 'Death' },
  },
};
