# Game Prototype v2 — Technical & Gameplay Overview

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
| Assets | None. All 3D models and textures are built in code from basic shapes and canvas drawings. |
| Backend / persistence | None. Progress is kept in memory and resets on page reload. |

Run with `npm install` and `npm run dev`.

## 3. Code Structure

About 2,000 lines in total, in 14 TypeScript modules plus `index.html`.

| File | Responsibility |
|---|---|
| `main.ts` | Entry point; creates `Game` with the game canvas and the minimap canvas |
| `Game.ts` | Central controller: game loop, camera, clicks and raycasting, missions, chests, map travel, click effects |
| `World.ts` | 60×60 ground with a checker texture; 40 trees and 20 rocks placed by a seeded random generator; collision with obstacles and borders |
| `Player.ts` | Player character: movement, targeting, auto-attack, health, healing, hit/heal flash |
| `Sword.ts` | Sword model, three-phase swing animation, slash trail, look per upgrade level |
| `Enemy.ts` | Enemy types (`GRUNT`, `ADAMASTOR`), AI, floating health bar and name label |
| `Chest.ts` | Chest model, random loot, pulsing glow effect |
| `Missions.ts` | Mission list and reward definitions |
| `PlayerData.ts` | Resources, upgrade levels, damage, max HP and cost formulas |
| `Maps.ts` | 3×4 map grid, map letters and names, travel directions |
| `Minimap.ts` | 2D canvas minimap (top-down, north up) |
| `UI.ts` | HUD, Inventory, Missions and World Map panels, travel prompt, messages |
| `Input.ts` | Records the latest left/right mouse click as normalised screen coordinates |
| `Movement.ts` | Shared helpers: distance on the ground plane, facing a point, moving toward a point |

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
- **Right-click on a chest:** open it if within 2.5 units (gold ring).
- **Right-click on empty ground:** grey ring, nothing else.
- If the target is out of reach, a "Too far away" message appears.

**Player.** Moves at 5 units/s in a straight line and turns to face where it is going. Base HP is 100.
The player attacks the targeted enemy automatically whenever it is in range. That range is always the
enemy's own range + 1.0, so the player outranges every enemy. Attack cooldown is 0.8 s.

**Combat.** Each attack plays a 0.35 s sword swing (wind-up → slash → recover) with an arc trail.
Damage lands mid-swing and only if the target is still in range. Hits are shown by a colour flash
on the character that was hit.

**Enemies.** Both types share one class and differ only in their data:

| Type | HP | Damage | Speed | Detect / Attack range | Look |
|---|---|---|---|---|---|
| Grunt | 30 | 8 per 1.5 s | 3 | 7 / 1.5 | Red box, random folklore name (e.g. Lobisomem, Bruxa, Moura Encantada) |
| Adamastor (boss) | 250 | 15 per 2 s | 2.2 | 10 / 2.4 | Large white box |

The AI has three states: idle → chase the player once within detect range → attack once within attack range.
Each enemy shows a health bar and a name label that always face the camera.

**Missions.** Chosen and started from the Missions panel; only one can be active at a time. The mission's
enemies spawn in a ring 10 units around the player, and progress is shown in the HUD.

| Mission | Objective | Reward |
|---|---|---|
| Clear the Field | Defeat 3 enemies | 2 gold, 50 spices |
| Hold the Line | Defeat 5 enemies | 5 gold, 120 spices |
| Adamastor | Defeat the boss | 12 gold, 300 spices |

On death, the player respawns at the centre of the current map with full HP and the active mission fails.

**Chests.** Up to 3 per map, placed at random spots clear of obstacles. They are not shown on the
minimap. Each chest gives 1–3 gold, 15–35 spices and a potion that heals 30 HP straight away.
An opened chest is replaced after 30 s.

**Progression.** Gold is the rare resource and spices are the common one. There are two separate
upgrades, and each costs `level` gold + `30 × level` spices:
- **Weapon:** +5 damage per level (base 10). The sword also grows (up to 1.4× its size) and changes
  colour: iron → steel → gilded → blood → azulejo → enchanted.
- **Health:** +25 max HP per level. The extra HP is also added to current health.

**World and maps.** 12 maps of 60×60 each, arranged in a grid 3 wide and 4 tall and named after
Portuguese locations (A "Campos de Tomar" to L "Costa do Além-Mar"). All maps use the same terrain
and only the current one is shown.
- **Travelling:** walk to a border that has a map beyond it, then confirm in the prompt at the top
  of the screen. You arrive on the opposite side of the new map.
- **Restriction:** you cannot travel while a mission is active.
- **Chests:** each map remembers its own chests.

**User interface.** Styled to fit the dark fantasy theme: iron and gold frames, with an azulejo tile strip on the panels.
- **Top-left:** Inventory button with gold/spices next to it, Missions button, mission tracker.
- **Top-right:** square minimap with gold lines on the borders you can travel through,
  the current map's name under it, and a map button that opens the 3×4 world grid.
- **Bottom:** health bar above 6 item slots (slot 1 shows the sword; the others are not used yet).
- **Messages:** banners for events; the travel prompt appears at the top of the screen.

## 6. Gameplay Loop

Explore a map → find chests → start a mission → fight → collect rewards → upgrade weapon or health →
take on harder missions (the boss) → travel to other maps.

## 7. Current Limitations

- Characters are simple shapes (capsule player, box enemies); there are no imported models,
  no character animation besides the sword swing, and no audio.
- All 12 maps share the same terrain, and missions are not tied to a specific map.
- Item slots 2–6 are not used yet; the only item is the sword.
- No save system and no multiplayer (multiplayer is planned but not started).
- Movement goes in a straight line with no pathfinding; obstacles only push characters out.
