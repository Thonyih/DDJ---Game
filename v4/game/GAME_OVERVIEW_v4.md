# Game Prototype v4 — Technical & Gameplay Overview

## 1. Summary

A browser-based 3D action RPG prototype in a dark fantasy style inspired by Portuguese folklore.
The player is a knight in an open world of 12 connected maps. The player explores, fights folklore
enemies and a boss (Adamastor), completes missions, loots chests, and spends resources on weapon
and health upgrades. The world never pauses: menus are overlays on top of a running game.

## 2. Technology

| Area | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| 3D engine | Three.js 0.186 (WebGL) |
| Build / dev server | Vite 8 |
| UI | Plain HTML/CSS overlay on the canvas (no UI framework) |
| Fonts | Cinzel and EB Garamond (Google Fonts; Georgia as fallback) |
| Assets | Animated characters, all CC0: **KayKit** Adventurers (Knight, Barbarian, Rogue) and Skeletons by Kay Lousberg, and **Quaternius** Wolf, Ghost, Demons and Yeti (via poly.pizza), and **KayKit Halloween Bits** props, in `public/assets/`. The world itself is built in code from basic shapes and canvas drawings. |
| Backend / persistence | None. Progress is kept in memory and resets on page reload. |

Run with `npm install` and `npm run dev`.

## 3. Code Structure

About 2,600 lines in total, in 18 TypeScript modules plus `index.html`.

| File | Responsibility |
|---|---|
| `main.ts` | Entry point; creates `Game` with the game canvas and the minimap canvas |
| `Game.ts` | Central controller: game loop, camera, clicks and raycasting, missions, chests, map travel, click effects |
| `World.ts` | 60×60 ground with a checker texture; 40 trees and 20 rocks placed by a seeded random generator; collision with obstacles and borders |
| `Player.ts` | Player character: movement, targeting, auto-attack timed to the animation, health, healing, death |
| `AnimatedModel.ts` | Shared animated-model logic: loop + one-shot animations, hit flash, ghost tint, per-copy materials |
| `KnightModel.ts` | The player's knight; sword look per upgrade level |
| `EnemyLooks.ts` | Which model and animations each enemy name uses |
| `Assets.ts` | Loads all character models (glTF) before the game starts |
| `MissionGiver.ts` | The Capitão da Ordem NPC who gives missions |
| `Tutorial.ts` | Progressive onboarding: one tooltip at a time, HUD revealed step by step |
| `Enemy.ts` | Enemy types (grunt, wolf, templar, witch, spectre, Mapinguari, Adamastor, training), AI, health bar and name |
| `Decor.ts` | Which props each row of maps gets, how many, their size and whether they block |
| `Mist.ts` | Low drifting ground mist |
| `EdgeFog.ts` | Billowing fog clouds along the map edges |
| `Sound.ts` | Web Audio: sound effects and per-tier ambience crossfades |
| `Pickup.ts` | Travel-mission items (Templar Relic, Lost Astrolabe) |
| `Chest.ts` | Chest model, random loot, pulsing glow effect |
| `Missions.ts` | Mission list and reward definitions |
| `PlayerData.ts` | Resources, upgrade levels, damage, max HP and cost formulas |
| `Maps.ts` | 3×4 map grid, map letters and names, travel directions |
| `Minimap.ts` | 2D canvas minimap (top-down, north up, N/E/S/W letters, player arrow) |
| `Compass.ts` | Compass under the minimap: N turned to match the 3D view, needle shows the player's heading |
| `UI.ts` | HUD, Missions and World Map panels, travel prompt, messages |
| `Bow.ts` | The bow and flying-arrow models, bow look per level |
| `InventoryView.ts` | Inventory 3×3 grid, item card with upgrades, glow when an upgrade is affordable |
| `Input.ts` | Records the latest left/right mouse click as normalised screen coordinates |
| `Movement.ts` | Shared helpers: distance on the ground plane, facing a point, moving toward a point |
| `Label.ts` | Name labels drawn on a canvas texture (used above enemies) |

**Design approach:** one simple class per game object, with configuration kept as constants at the
top of each file. Enemy kinds and missions are plain data objects, so new ones can be added without
writing new logic. `Game` owns all objects and calls their `update` methods each frame.

## 4. Game Loop

The loop is driven by `renderer.setAnimationLoop`. Each frame (frame time capped at 0.1 s) runs these steps in order:

1. Handle the latest mouse click (raycast against enemies, chests and ground).
2. Update the player (movement, collision, attack and swing).
3. Update the enemies (AI), then remove dead enemies and count them toward the mission.
4. Update chest respawn timers and the map-border travel prompt.
5. Check for player death and mission completion.
6. Update the camera, health bars, chest glow, target ring and click effects.
7. Update the HUD and minimap, then render the scene.

## 5. Systems

**Camera and rendering.** An orthographic camera at a fixed isometric angle (offset 12, 12, 12) follows
the player. The scene uses ambient and directional light with standard (PBR) materials.

**Controls and interaction.** Mouse only. Clicks are turned into world positions by casting a ray
from the camera.
- **Left-click:** move to a point on the ground (green ring effect).
- **Right-click on an enemy:** target it (red ring). The player never moves on right-click.
- **Any other click** (move, chest, empty ground) cancels the attack.
- **Right-click on a chest:** open it if within 2.5 units (gold ring).
- **Right-click on empty ground:** grey ring, nothing else.
- If the target is out of reach, a "Too far away" message appears.

**Player.** Moves at 5 units/s in a straight line and turns to face where it is going. Base HP is 100.
The player attacks the targeted enemy automatically whenever it is in range. That range is always the
enemy's own range + 1.0, so the player outranges every enemy. Attack cooldown is 0.8 s.

**Combat.** Each attack plays the knight's sword-slash animation (0.6 s).
Damage lands mid-swing and only if the target is still in range. Hits are shown by a colour flash
on the character that was hit.

**Enemies.** Both types share one class and differ only in their data:

| Type | HP | Damage | Speed | Detect / Attack range | Look |
|---|---|---|---|---|---|
| Grunt | 30 | 8 per 1.5 s | 3 | 7 / 1.5 | Random folklore name; the name picks the model (skeletons, spectral knight, wolf, ghost, imp, yeti…) |
| Adamastor (boss) | 250 | 15 per 2 s | 2.2 | 10 / 2.4 | Giant demon model |

The AI has three states: idle → chase the player once within detect range → attack once within attack range.
Each enemy shows a health bar and a name label that always face the camera.

**Missions.** Given by the **Capitão da Ordem**, an NPC at the same spot near the centre of every map
(gold marker on the minimap, floating "!" when he has work). Right-click him when close to open the
mission list; only one mission can be active at a time. The mission's
enemies spawn in a ring 10 units around the player, and progress is shown in the HUD.

The 12 maps form 4 rows of difficulty (tiers): row 1 (A B C) is the easiest, row 4 (J K L) the
hardest. Each row's Capitão offers only that tier's missions, so harder work means travelling north.
All missions are always available; completed ones are marked done and can be replayed.

| Tier | Maps | Mission | Goal | Reward |
|---|---|---|---|---|
| 1 | A B C | Find the Lost Chests | Open 2 chests | 1 gold, 30 spices |
| 1 | A B C | Clear the Field | Defeat 3 enemies | 2 gold, 50 spices |
| 1 | A B C | Wolves of Tomar | Defeat 3 Lobisomem | 3 gold, 80 spices |
| 2 | D E F | Hold the Line | Defeat 5 enemies | 5 gold, 120 spices |
| 2 | D E F | The Restless Templars | Defeat 4 Templário Perdido | 6 gold, 150 spices |
| 2 | D E F | The Templar Relic | Travel to Map F, pick up the relic | 8 gold, 200 spices |
| 3 | G H I | Witches of the Serra | Defeat 3 Bruxa | 10 gold, 260 spices |
| 3 | G H I | The Spectral Crew | Defeat 5 drowned spirits | 12 gold, 300 spices |
| 3 | G H I | The Lost Astrolabe | Travel to Map I, pick up the astrolabe | 14 gold, 350 spices |
| 4 | J K L | The Mapinguari | Defeat the beast | 20 gold, 500 spices |
| 4 | J K L | Adamastor | Defeat the giant | 30 gold, 800 spices |

**Travel missions** allow travelling while active (other missions don't). The target map is marked
with a ★ on the World Map; on that map the item shows as a ★ on the minimap and glows in the world.
Right-clicking it when close completes the mission.

**Rows look different:** each row north has darker ground, trees and rocks, dimmer light, a darker
sky, heavier fog, low drifting mist and a darker screen vignette. Props (KayKit Halloween Bits, CC0)
are scattered per row: a few dead trees in row 1; dead trees, broken fences, lanterns and grave
markers in row 2; graveyards, lanterns and a crypt in row 3; bones, skulls, skull posts, ruined graves,
crypts and shrines in row 4. Large props block movement. The ground is a generated mottled texture
of grass and dirt; past the map edge a darker ground and a ring of trees fade into the fog, and a band of
billowing fog clouds lines all four edges (thicker in the northern rows).

On death, the player respawns at the centre of the current map with full HP and the active mission fails.

**Chests.** Up to 3 per map, placed at random spots clear of obstacles. They are not shown on the
minimap. Each chest gives 1–3 gold, 15–35 spices and a potion that heals 30 HP straight away.
An opened chest is replaced after 30 s.

**Progression.** Gold is the rare resource and spices are the common one. The sword and the armour
(health) each go from level 1 to 4, and each level costs 5× the previous one:

| Level | Damage | Sword size and colour | Max HP | Cost to reach |
|---|---|---|---|---|
| 1 | 10 | 100%, plain | 100 | — |
| 2 | 15 | 125%, steel | 125 | 1 gold, 30 spices |
| 3 | 20 | 150%, gilded | 150 | 5 gold, 150 spices |
| 4 | 25 | 180%, azulejo blue glow | 175 | 25 gold, 750 spices |

**Bow.** Selected by clicking toolbar slot 2 (slot 1 is the sword). Shoots an arrow at an enemy up
to 10 units away for 8 / 12 / 16 / 20 damage (by bow level), using the KayKit ranged-shoot animation.
Arrows are limited (max 5, start with 5); half of all chests hold 2 more. Out of arrows, the game
switches back to the sword. The bow is upgraded like the sword (same 4 levels and costs) and grows
(up to 145%) and changes colour.

The Inventory is a 3×3 grid (sword, bow, armour, gold, spices, arrows, empty slots). Clicking the sword, bow or armour
opens a card with the next level's stat, its cost and an Upgrade button; a slot glows while its
upgrade is affordable. A health upgrade also adds the extra HP to current health.

**World and maps.** 12 maps of 60×60 each, arranged in a grid 3 wide and 4 tall and named after
Portuguese locations (A "Campos de Tomar" to L "Costa do Além-Mar"). All maps use the same terrain
and only the current one is shown.
- **Travelling:** walk to a border that has a map beyond it, then confirm in the prompt at the top
  of the screen. You arrive on the opposite side of the new map.
- **Restriction:** you cannot travel while a mission is active.
- **Chests:** each map remembers its own chests.

**Sound.** Each row of maps has its own ambience, crossfaded on travel: a calm forest loop in row 1,
wind in row 2, wind plus a dark drone in row 3, and drone plus a cavernous rumble in row 4. Effects:
sword swings and hits, bow shots and arrow impacts, getting hurt, death bell, footsteps on grass,
chests (creak and coins), mission start and completion, upgrades, and monster growls (short slices
of longer recordings, quieter for distant enemies) when enemies notice you, attack and die.
A Sound On/Off button sits next to the Map button. All sounds are CC0 (Kenney, OpenGameArt);
credits in `public/assets/audio/LICENSE.txt`.

**User interface.** Styled to fit the dark fantasy theme: iron and gold frames, with an azulejo tile strip on the panels.
- **Top-left:** Inventory button with gold/spices next to it, mission tracker.
- **Top-right:** square minimap with gold lines on the borders you can travel through,
  the current map's name under it, and a map button that opens the 3×4 world grid.
- **Bottom:** health bar above 6 item slots (slot 1 shows the sword; the others are not used yet).
- **Messages:** banners for events; the travel prompt appears at the top of the screen.

## 6. Gameplay Loop

Explore a map → find chests → start a mission → fight → collect rewards → upgrade weapon or health →
take on harder missions (the boss) → travel to other maps.

## 7. Current Limitations

- No audio. The KayKit skeleton enemies fight unarmed (their weapons are separate files not added yet).
- All 12 maps share the same terrain, and missions are not tied to a specific map.
- Item slots 2–6 are not used yet; the only item is the sword.
- No save system. Single player only (a multiplayer experiment exists separately in v3).
- Movement goes in a straight line with no pathfinding; obstacles only push characters out.
