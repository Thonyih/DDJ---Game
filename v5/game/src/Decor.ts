import type { ModelName } from './Assets';

// A kind of prop scattered over a map: how many, at what scale, and (if solid) how wide to block.
export interface PropRule {
  model: ModelName;
  count: number;
  scale: number;
  solid?: number;
}

// Props per row of maps (tier). The bottom row stays open fields; each row north gets grimmer:
// dead trees, then graveyards and lanterns, then bones, skulls, crypts and shrines.
export const TIER_PROPS: PropRule[][] = [
  [
    { model: 'tree_dead_small', count: 3, scale: 0.8, solid: 0.4 },
  ],
  [
    { model: 'tree_dead_small', count: 6, scale: 0.8, solid: 0.4 },
    { model: 'tree_dead_medium', count: 4, scale: 0.85, solid: 0.4 },
    { model: 'fence_broken', count: 4, scale: 0.6 },
    { model: 'lantern_standing', count: 3, scale: 1 },
    { model: 'gravemarker_A', count: 4, scale: 0.7 },
  ],
  [
    { model: 'tree_dead_medium', count: 6, scale: 0.9, solid: 0.4 },
    { model: 'tree_dead_large', count: 5, scale: 0.9, solid: 0.5 },
    { model: 'grave_A', count: 5, scale: 0.55, solid: 0.6 },
    { model: 'grave_B', count: 4, scale: 0.55, solid: 0.6 },
    { model: 'gravestone', count: 6, scale: 0.6 },
    { model: 'gravemarker_A', count: 6, scale: 0.7 },
    { model: 'lantern_standing', count: 5, scale: 1 },
    { model: 'fence_broken', count: 3, scale: 0.6 },
    { model: 'crypt', count: 1, scale: 0.45, solid: 2 },
  ],
  [
    { model: 'tree_dead_large', count: 10, scale: 0.95, solid: 0.5 },
    { model: 'tree_dead_medium', count: 6, scale: 0.9, solid: 0.4 },
    { model: 'grave_A_destroyed', count: 6, scale: 0.55, solid: 0.6 },
    { model: 'gravestone', count: 6, scale: 0.6 },
    { model: 'skull', count: 8, scale: 0.5 },
    { model: 'bone_A', count: 8, scale: 0.8 },
    { model: 'ribcage', count: 5, scale: 0.8 },
    { model: 'post_skull', count: 5, scale: 0.6, solid: 0.3 },
    { model: 'shrine_candles', count: 2, scale: 0.8, solid: 0.5 },
    { model: 'crypt', count: 2, scale: 0.45, solid: 2 },
  ],
];
