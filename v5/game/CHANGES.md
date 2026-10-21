# v4 — Changes

v4 is the single-player version of the game. It started as a copy of the v3 game with all multiplayer
code removed (server connection, login, other players, PvP). Everything below was added in v4.

## 1. Onboarding

- **Progressive tutorial:** one glowing tooltip at a time, pointing at what to use next. HUD elements
  are hidden at first and appear when their step arrives. Each step starts only when the previous
  one is done.
- **Steps:** move (left-click) → open a chest (right-click) → sword attack on a practice enemy →
  select the bow (toolbar slot 2) → shoot a second practice enemy → talk to the Capitão and start the
  first mission → find 2 chests → upgrade an item in the Inventory → open the World Map (harder
  missions lie north) → travel to another map.
- **Rules:** practice enemies respawn if the player dies. A **Skip tutorial** button reveals
  everything. Travel and missions stay locked until their step is reached (or the tutorial is skipped).

## 2. Missions

- **Mission-giver:** the **Capitão da Ordem** (KayKit Barbarian, dark crimson) stands near the centre
  of every map. Right-click him to open the mission list. He shows a gold "!" when he has work, is
  marked on the minimap, and has his own sounds. The old Missions button was removed.
- **Tiers:** the 12 maps (3 wide × 4 tall) form 4 rows of difficulty. Each row's Capitão offers that
  row's tier. Every mission is always available; completed ones are marked done and can be replayed.

| Tier | Maps | Missions |
|---|---|---|
| 1 | A B C | Find the Lost Chests · Clear the Field · Wolves of Tomar |
| 2 | D E F | Hold the Line · The Restless Templars · The Templar Relic (travel) |
| 3 | G H I | Witches of the Serra · The Spectral Crew · The Lost Astrolabe (travel) |
| 4 | J K L | The Mapinguari · Adamastor |

- **Mission types:** defeat enemies, open chests, or travel to a map and pick up an item there.
  Travel missions allow travelling while active. The target map is starred on the World Map and the
  item is starred on the minimap.
- **Rewards:** grow by tier (1–3 gold in tier 1, up to 30 gold for Adamastor).

## 3. Characters and enemies

- **Animated 3D models (all CC0)** replace the placeholder shapes. Animations: idle, run/walk, attack,
  hit, death; plus interact (chests, NPC) and cheer (mission complete) for the player.
- **Player:** KayKit Knight with sword and shield. The death animation plays before respawning.
- **Enemies:** each enemy's name picks its model:

| Enemy | Model |
|---|---|
| Templário Perdido, Marinheiro Naufragado, Corsário Espectral, Bruxa | KayKit Skeletons |
| Cavaleiro Fantasma, Moura Encantada | KayKit Knight / Rogue, ghost tint |
| Lobisomem · Alma do Naufrágio · Diabrete · Mapinguari | Quaternius Wolf · Ghost · small Demon · Yeti |
| Adamastor (boss) | Quaternius large Demon, white, 4.5 units tall |

- **New enemy types with their own stats:** wolf (fast), templar (sturdy), witch (hard-hitting),
  spectre (quick), Mapinguari (boss).
- **Combat behaviour:** enemy hits land partway through the attack animation. Enemies play a death
  animation before disappearing, and show a health bar and name.

## 4. Combat

- **Right-click** an enemy to attack (never moves the player). **Any other click cancels** the attack.
- **Bow:** selected with toolbar slot 2.
  - **Range and damage:** reach 10 units (vs ~2.5 for the sword); damage 8 / 12 / 16 / 20 by level.
  - **Arrows:** max 5, start with 5; half of all chests hold 2 more. Out of arrows, the game switches
    back to the sword.
- **Easier clicking:** invisible, enlarged hitboxes on enemies, chests, the NPC and mission items, plus
  a hand cursor when hovering over something interactable.

## 5. Inventory and upgrades

- **Inventory:** 3×3 grid (sword, bow, armour, gold, spices, arrows, empty slots). Clicking an item
  opens a card with its level, the next stat, cost and an Upgrade button. A slot **glows** when its
  upgrade is affordable.
- **Levels:** sword, bow and armour each go to **level 4**. Costs grow **×5** per level
  (1 g + 30 s → 5 g + 150 s → 25 g + 750 s).
- **Upgrade looks:** the sword and the bow grow and change colour per level (plain → steel/oak →
  gilded → azulejo blue glow). Armour adds +25 max HP per level.

## 6. World and visuals

- **Darker rows:** each row north has darker ground, trees and rocks, dimmer light, a darker sky,
  heavier fog, ground mist and a stronger screen vignette.
- **Ground:** a generated mottled grass-and-dirt texture replaces the checkerboard.
- **Dark fantasy props (KayKit Halloween Bits):** dead trees and fences in row 2, graveyards and a crypt
  in row 3, bones, skulls, crypts and shrines in row 4. Large props block movement.
- **Map edges:** darker ground and a ring of trees continue past the border, with billowing fog
  clouds along all four edges.
- **Shadows:** soft real-time shadows from the sun, which follows the player.

## 7. Navigation and HUD

- **Minimap:** N / E / S / W letters, a player arrow showing facing, the Capitão and mission items.
- **Compass:** under the minimap. N is turned to match the isometric view, and a needle and label
  show the heading.
- **World Map:** cells coloured by tier (darker to the north) with "Tier N" tags; the travel-mission
  target is starred.
- **Map name and toolbar:** the map name and compass are stacked so long names don't overlap. The
  toolbar shows the selected weapon and arrows left.

## 8. Sound (Web Audio)

- **Ambience per row, crossfaded on travel:** forest → wind → dark drone → cavern rumble.
- **Effects:** sword swing and hit, bow shot and arrow impact, hurt, death bell, footsteps, monster
  growls (alert, attack, death; quieter when far away), chests, mission start and completion,
  upgrades, travel.
- **Interface sounds:** menu buttons, opening and closing panels, Inventory items, weapon switch,
  the Capitão, tutorial steps and "Too far away" warnings.
- **Sound On/Off** button.

## 9. Assets (all CC0)

| Pack | Used for |
|---|---|
| KayKit Adventurers, Skeletons, Halloween Bits (Kay Lousberg) | player, Capitão, skeleton enemies, props |
| Quaternius (via poly.pizza) | wolf, ghost, demons, yeti |
| Kenney RPG Audio, Impact Sounds | combat, UI, footsteps, chests |
| OpenGameArt (various authors) | ambience loops, monster snarls |

Licence files are in `public/assets/*/LICENSE.txt`.

## 10. Known limitations

- **Line of sight:** you can still attack through trees and rocks (a line-of-sight check is proposed
  but not built).
- **Terrain and saving:** all 12 maps share the same terrain layout, and progress is not saved
  between page reloads.
- **Safari:** older Safari versions may not play the Ogg sound files.
