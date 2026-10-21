import {
  CASTAWAY,
  GRUNT,
  PIRATE,
  RELIC_GUARDIAN,
  SENTINEL,
  SPECTRE,
  TEMPLAR,
  WITCH,
  WOLF,
  type EnemyType,
} from './Enemy';

// Which enemies live on each map. They roam the map and make up the "defeat N enemies" missions
// given there. The three bosses are not listed: each only appears in its own mission on its map
// (Adamastor on J, Capitão do Cabo da Roca on K, Mapinguari on L).
export const MAP_ENEMIES: Record<string, string[]> = {
  // Tier 1 — Easy
  A: ['Diabrete', 'Cavaleiro Fantasma', 'Lobisomem'],
  B: ['Lobisomem', 'Diabrete', 'Moura Encantada', 'Cavaleiro Fantasma'],
  C: ['Cavaleiro Fantasma', 'Moura Encantada', 'Marinheiro Naufragado', 'Diabrete'],
  // Tier 2 — Medium
  D: ['Templário Perdido', 'Guardião da Relíquia', 'Diabrete', 'Moura Encantada'],
  E: ['Sentinela de Trancoso', 'Cavaleiro Fantasma', 'Templário Perdido', 'Lobisomem'],
  F: ['Cavaleiro Fantasma', 'Sentinela de Trancoso', 'Templário Perdido', 'Guardião da Relíquia'],
  // Tier 3 — Hard
  G: ['Bruxa', 'Lobisomem', 'Moura Encantada', 'Alma do Naufrágio'],
  H: ['Bruxa', 'Cavaleiro Fantasma', 'Corsário Espectral', 'Pirata das Berlengas'],
  I: ['Marinheiro Naufragado', 'Alma do Naufrágio', 'Corsário Espectral', 'Náufrago do Navio Negro', 'Pirata das Berlengas'],
  // Tier 4 — Deadly
  J: ['Bruxa', 'Alma do Naufrágio', 'Náufrago do Navio Negro', 'Corsário Espectral'],
  K: ['Pirata das Berlengas', 'Corsário Espectral', 'Marinheiro Naufragado', 'Alma do Naufrágio'],
  L: ['Lobisomem', 'Bruxa', 'Moura Encantada', 'Diabrete'],
};

// How many enemies roam each map, by row (tier 1-4).
export const ROAMING_COUNT = [3, 4, 5, 5];

// Enemies with their own type use its stats; the rest (Diabrete, Cavaleiro Fantasma,
// Moura Encantada, Marinheiro Naufragado) use the basic grunt stats.
const TYPE_BY_NAME: Record<string, EnemyType> = {
  'Lobisomem': WOLF,
  'Templário Perdido': TEMPLAR,
  'Bruxa': WITCH,
  'Alma do Naufrágio': SPECTRE,
  'Corsário Espectral': SPECTRE,
  'Guardião da Relíquia': RELIC_GUARDIAN,
  'Sentinela de Trancoso': SENTINEL,
  'Pirata das Berlengas': PIRATE,
  'Náufrago do Navio Negro': CASTAWAY,
};

// The enemy type for one specific name (the type always gives that name).
export function enemyTypeForName(name: string): EnemyType {
  return { ...(TYPE_BY_NAME[name] ?? GRUNT), names: [name] };
}

// A random enemy type from a map's list.
export function randomMapEnemy(map: string): EnemyType {
  const names = MAP_ENEMIES[map];
  return enemyTypeForName(names[Math.floor(Math.random() * names.length)]);
}
