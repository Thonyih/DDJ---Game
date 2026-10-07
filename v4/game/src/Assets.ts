import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

// All models (CC0): KayKit by Kay Lousberg, and Quaternius via poly.pizza.
// Relative paths so they also work on GitHub Pages.
const MODEL_URLS = {
  Knight: 'assets/kaykit/Knight.glb',
  Barbarian: 'assets/kaykit/Barbarian.glb',
  Rogue_Hooded: 'assets/kaykit/Rogue_Hooded.glb',
  Skeleton_Warrior: 'assets/kaykit/Skeleton_Warrior.glb',
  Skeleton_Minion: 'assets/kaykit/Skeleton_Minion.glb',
  Skeleton_Rogue: 'assets/kaykit/Skeleton_Rogue.glb',
  Skeleton_Mage: 'assets/kaykit/Skeleton_Mage.glb',
  Wolf: 'assets/quaternius/Wolf.glb',
  Ghost: 'assets/quaternius/Ghost.glb',
  Demon_Small: 'assets/quaternius/Demon_Small.glb',
  Demon_Large: 'assets/quaternius/Demon_Large.glb',
  Yeti: 'assets/quaternius/Yeti.glb',
  // Dark fantasy props: KayKit Halloween Bits (CC0).
  tree_dead_large: 'assets/halloween/tree_dead_large.gltf',
  tree_dead_medium: 'assets/halloween/tree_dead_medium.gltf',
  tree_dead_small: 'assets/halloween/tree_dead_small.gltf',
  grave_A: 'assets/halloween/grave_A.gltf',
  grave_A_destroyed: 'assets/halloween/grave_A_destroyed.gltf',
  grave_B: 'assets/halloween/grave_B.gltf',
  gravestone: 'assets/halloween/gravestone.gltf',
  gravemarker_A: 'assets/halloween/gravemarker_A.gltf',
  crypt: 'assets/halloween/crypt.gltf',
  fence_broken: 'assets/halloween/fence_broken.gltf',
  lantern_standing: 'assets/halloween/lantern_standing.gltf',
  skull: 'assets/halloween/skull.gltf',
  bone_A: 'assets/halloween/bone_A.gltf',
  ribcage: 'assets/halloween/ribcage.gltf',
  shrine_candles: 'assets/halloween/shrine_candles.gltf',
  post_skull: 'assets/halloween/post_skull.gltf',
};

export type ModelName = keyof typeof MODEL_URLS;
export type GameModels = Record<ModelName, GLTF>;

// Loads every model in parallel before the game starts.
export async function loadModels(): Promise<GameModels> {
  const loader = new GLTFLoader();
  const names = Object.keys(MODEL_URLS) as ModelName[];
  const loaded = await Promise.all(names.map((name) => loader.loadAsync(MODEL_URLS[name])));
  return Object.fromEntries(names.map((name, i) => [name, loaded[i]])) as GameModels;
}
