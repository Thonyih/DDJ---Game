# v5 — Changes (player feedback)

v5 starts as an exact copy of v4. Changes made from player feedback:

## Controls

- **Hold to move:** holding the left mouse button makes the knight keep walking toward the cursor.
  A single left-click still walks to that spot. Releasing the button lets the knight finish walking
  to the last point. Holding only moves; attacking and interacting still use right-click.
  The tutorial's first step mentions holding.
- **Longer reach for chests:** chests (and travel-mission items) can be opened from 5 units away
  instead of 2.5.
- **Easier map travel:** the travel prompt appears within 3 units of a map border instead of 1.5.
  Arriving on a new map still places the knight 4 units inside, so the prompt doesn't pop up again
  straight away.
- **Longer reach for the Capitão da Ordem:** he can be talked to from 6 units away instead of 3.
  His mission panel now closes when the knight walks more than 9 units away (was 4.5).

## New enemies and missions

Five new enemies, each with its own model and stats:

| Enemy | Model | HP | Damage | Appears in |
|---|---|---|---|---|
| Guardião da Relíquia | KayKit Mage with staff, gold tint | 60 | 10 | 2 guard the Templar Relic on Map F |
| Sentinela de Trancoso | Quaternius Skeleton soldier | 50 | 9 | *Sentinels of Trancoso* (tier 2) |
| Pirata das Berlengas | KayKit Rogue with two knives, red tint | 45 | 12 | *Pirates of the Berlengas* (tier 3) |
| Náufrago do Navio Negro | Quaternius Zombie (sinks into the ground on death) | 55 | 12 | *The Black Ship* (tier 3) |
| Capitão do Cabo da Roca | Quaternius Pirate Captain, ghostly, 3.6 units tall (boss) | 220 | 17 | *The Captain of Cabo da Roca* (tier 4) |

- **4 new missions** (15 in total): Sentinels of Trancoso (7 gold, 170 spices), Pirates of the
  Berlengas (11 / 280), The Black Ship (13 / 320), The Captain of Cabo da Roca (25 / 650).
- **Relic guards:** the Templar Relic is now guarded by two Guardiões da Relíquia when the player
  reaches Map F.
- **Credit required:** the Zombie model is **CC-BY 3.0**, "Animated Zombie" by Quaternius
  (quaternius.com), and must be credited. All other new models are CC0.

## Name

- The game is now called **Knights of Tomar** (browser tab, loading screen and documents).

## Difficulty and enemy distribution

- **Stronger enemies:** all regular enemies have **+30% health and damage**; the three bosses have
  **×2 health and damage** (Mapinguari 360 HP / 32, Capitão do Cabo da Roca 440 / 34,
  Adamastor 500 / 30). The tutorial's practice enemy is unchanged.
- **Each map has its own enemies** (`src/MapEnemies.ts`):

| Tier | Map | Enemies |
|---|---|---|
| 1 | A Campos de Tomar | Diabrete, Cavaleiro Fantasma, Lobisomem |
| 1 | B Bosque dos Templários | Lobisomem, Diabrete, Moura Encantada, Cavaleiro Fantasma |
| 1 | C Ruínas do Convento | Cavaleiro Fantasma, Moura Encantada, Marinheiro Naufragado, Diabrete |
| 2 | D Túneis de Tomar | Templário Perdido, Guardião da Relíquia, Diabrete, Moura Encantada |
| 2 | E Fronteira de Trancoso | Sentinela de Trancoso, Cavaleiro Fantasma, Templário Perdido, Lobisomem |
| 2 | F Campos dos Cavaleiros Fantasma | Cavaleiro Fantasma, Sentinela de Trancoso, Templário Perdido, Guardião da Relíquia |
| 3 | G Serra das Sombras | Bruxa, Lobisomem, Moura Encantada, Alma do Naufrágio |
| 3 | H Caminho de Lisboa | Bruxa, Cavaleiro Fantasma, Corsário Espectral, Pirata das Berlengas |
| 3 | I Costa dos Navios Negros | Marinheiro Naufragado, Alma do Naufrágio, Corsário Espectral, Náufrago do Navio Negro, Pirata das Berlengas |
| 4 | J Cabo das Tormentas | Bruxa, Alma do Naufrágio, Náufrago do Navio Negro, Corsário Espectral + **Adamastor (boss)** |
| 4 | K Ilhas dos Corsários | Pirata das Berlengas, Corsário Espectral, Marinheiro Naufragado, Alma do Naufrágio + **Capitão do Cabo da Roca (boss)** |
| 4 | L Costa do Além-Mar | Lobisomem, Bruxa, Moura Encantada, Diabrete + **Mapinguari (boss)** |

- **Roaming enemies:** each map always has some of its enemies roaming (3 / 4 / 5 / 5 per tier),
  away from the map centre. A defeated one is replaced after 40 s. They appear once the tutorial
  reaches missions (or is skipped), are replaced when travelling, and don't count toward missions.
- **Map-based missions:** *Clear the Field* and *Hold the Line* now spawn a mix of the current
  map's enemies. Missions with a named enemy still use that enemy.
- **Exclusive bosses:** each boss mission is offered only by the Capitão on its own map
  (Adamastor on J, Capitão do Cabo da Roca on K, Mapinguari on L) and can be beaten **once**
  (marked "defeated", no replay). Mapinguari no longer appears as a random grunt.

## Interface

- **Cleaner World Map:** removed the text box under the grid ("You are in …", the exits list and the
  travel hint). The grid itself still highlights the current map, the reachable maps and any
  travel-mission target.
- **Simpler toolbar:** 4 slots instead of 6, without numbers. The sword and bow stay in the first
  two slots; the tutorial now says "first slot" / "second slot".
- **Toolbar icons:** the weapon slots show the item picture instead of its name: the sword with
  "Lv N", and the bow with "Lv N" and the arrows left (e.g. "5/5"). The icons grow and change
  colour with the upgrade level, like in the Inventory.
- **Clearer tutorial tooltip:** bigger box (up to 400 px wide), bigger text (21 px instead of 16),
  a thicker gold border and arrow, and a much stronger pulsing golden glow. It is kept fully on
  screen based on its real size.
- **Shorter tutorial texts:** every tutorial tip is now one short instruction
  (e.g. "Left-click to move. Hold to keep walking.", "Click the bow slot.").
- **Better gold and spices display:** the top-left box now shows a gold coin and a spice pouch icon
  with large numbers (gold in gold, spices in amber) instead of the plain text "Gold: 0 Spices: 0".
  Hovering an icon shows its name.
- **New look for the Capitão da Ordem:** instead of tinting the whole model red (which also turned
  his face red), only specific parts are recoloured: crimson tunic, sleeves and cape, gold shield.
  The bear-fur hood is removed, so he is now a bald, grey-bearded veteran with an axe and shield,
  and slightly bigger (2.5 units). Comparison of the options: `docs/images/capitao-options.png`.
- **Click the minimap to move:** left-clicking a spot on the minimap walks the knight there
  (green ring at the destination), like a left-click on the ground. It also cancels the current
  attack. The minimap now shows a pointer cursor.
- **Story mode** (from `v5/Knights_of_Tomar_Story_and_Implementation.md`; text lives in `src/Story.ts`):
  - A story panel (title, 1–2 lines, Continue; Enter/Space/Esc also closes) pauses the game while open.
  - Opening "Knights of Tomar" + "The First Signs" at start; each tier's introduction the first
    time the player enters a map of that row (not repeated when moving within the row).
  - The Capitão says a new story line before opening Missions: first talk, after any Tier 1
    mission, after any Tier 2 mission, after the Tier 3 introduction (Adamastor's name), and once
    Adamastor is unlocked. If several became available at once, only the latest is said.
  - Each mission shows a short story line in the Missions panel.
  - Adamastor is locked ("— locked", Locked button) until the Capitão do Cabo da Roca and the
    Mapinguari are defeated, so he is always the final fight.
  - Boss encounter text when a boss mission starts, victory text when it ends; beating Adamastor
    shows the ending (Victory, then End of Story) and returns to the game.
  - 15 lore inscriptions on props (lanterns, crypts, gravestones, candle shrines, skull posts),
    marked by a floating gold diamond; right-click within range to read (can be reread). Props
    are shared by the maps of a row, so each inscription can be read on all 3 maps of its tier.
  - No save system: story progress lasts for the session, like the rest of the game.
- **Starting a mission closes the Missions panel.**
- **Every mission can be completed only once** (no more Replay). Completed missions show
  "— done" and a disabled "Completed" button. The Capitão's "!" disappears when his map has no
  mission left to start.
- **Tier lock:** travelling north into a new row of maps needs 3 different completed missions of
  the current tier (Tier 1 has exactly 3, so all of them). At a locked border the prompt says e.g.
  "Túneis de Tomar is locked: complete 3 Tier 1 missions (1 / 3)". Locked rows are greyed out with
  "· locked" on the World Map. Travel inside a row and back south is always allowed.
- **Tutorial follows the tier lock:** after the Map step, a new step "Complete 1/3 missions to
  unlock the north. Talk to the Capitão." (the tutorial's chest mission already counts as 1). While
  a mission runs it points at the tracker ("Finish the mission. 1/3 missions done."). At 3/3 the
  last step says "North is open! Walk to the top gold border and Travel." and the tutorial ends on
  reaching D, E or F. Travel is unlocked at that last step, as before.
- **Bigger travel prompt:** text 18px → 23px, larger padding and buttons, gold border. The
  **Travel** button is crimson with a pulsing gold glow. The prompt moved just below the top bar
  (top 78px) so it no longer touches the gold/spices box or the Map button; messages (toast)
  moved down to 170px to make room.
- **Custom cursors** (SVG, iron and gold, defined as CSS variables in `index.html`):
  - Normal: dark iron arrow with a gold rim.
  - Over an enemy: a small sword (blade, gold crossguard, crimson grip).
  - Over something to interact with (chest, Capitão, lore, pickup) and over buttons, slots and the
    minimap: a steel gauntlet pointing its index finger (gold rivets, dark cuff with gold trim);
    the click point is the fingertip.
- **Mouse gestures** (free mouse movement over the game, no button; `src/Gestures.ts`):
  - **Shake side to side → Frenzy:** 4 quick, mostly sideways swings (≥25 px each) within 0.8 s
    give ×1.5 attack speed (sword and bow) for 1 s, refreshed while shaking. "Frenzy!" message;
    the selected weapon slot pulses red.
  - **Circle → Dust Push** (10 s cooldown): enemies within 5 units slide 4 units away over 0.35 s
    (their attack in progress misses), with a dust ring and dust puffs bursting from the knight.
    A circle must be most of a smooth, round lap (no sharp corners, ≥50 px wide, within 2 s).
  - **"+" → Heal** (30 s cooldown): a horizontal and a vertical straight line (≥70 px each, any
    order) crossing near their middles within 1.5 s heal 20 HP. Green rings and a bell.
  - Using Push/Heal on cooldown shows "… ready in Ns".
  - Toolbar slots 3 (Dust Push) and 4 (Heal) show the icon, a cooldown sweep with seconds left,
    a gold border when ready, and a hint on hover explaining how to draw the gesture.
  - Tutorial: 3 new steps after the bow lesson (shake, circle, "+"), each pointing at its slot.
  - Tested with simulated mouse paths (60 Hz): circles (big, small, quick, slow, shaky, ellipse,
    with a lead-in), shake and "+" (both orders) are recognised; ~70 s of random mouse wandering
    triggered nothing.
- **Frenzy slot:** the toolbar now has 5 slots; slot 5 is Frenzy (three red claw slashes). It is
  dim until a shake registers, then lights up red and pulses, with a red sweep showing the time
  left. Frenzy now lasts 0.5 s after the last registered shake (was 1 s). The weapon slot no longer
  pulses. The tutorial's shake step points at slot 5. Hover hint explains the gesture.
- **Bigger gestures** (the player has to work a bit more; constants in `src/Gestures.ts`):
  - Shake: each swing ≥60 px (was 25), 4 swings within 1 s.
  - Circle: ≥120 px wide (was 50), within 2 s, no corner sharper than 45°.
  - "+": each line ≥140 px (was 70), within 2 s; lines must be straight (≤20% slant), about the
    same length (≤2×) and cross in their middle half.
  - Re-tested: small gestures no longer trigger, big ones do; ~2.5 min of random mouse wandering
    (6 patterns) triggered nothing.
- **Mouse trail:** a short gold trail follows the mouse over the game and fades out (0.35 s,
  thinner as it fades). When a gesture is recognised it flashes that gesture's colour: red
  (Frenzy), dust brown (Dust Push), green (Heal). `src/MouseTrail.ts`, drawn on its own canvas that
  ignores clicks.
- **Gestures must be drawn within 0.10 s** (`GESTURE_TIME` in `src/Gestures.ts`, one constant for
  all three): the whole shake (4 swings), the whole circle, or both lines of the "+" must happen
  within 0.1 s; slower movement does nothing. To catch such quick motions, every raw mouse sample
  the browser provides is used (coalesced pointer events, with their own timestamps). The "+" is
  now also checked while its second line is still being drawn, so it works when the mouse stops
  right after. Slot hints and tutorial texts say "very fast".
- **Gesture time limits relaxed** (0.10 s was not doable, tested on a Mac): shake and "+" must be
  drawn within **0.40 s** (`GESTURE_TIME`), the circle (Dust Push) within **0.30 s**
  (`CIRCLE_TIME`). A circle now needs 80% of a lap (was 85%) so quick circles still register with
  only ~60 mouse samples per second. Tested at 60 Hz: all three trigger within their limits and
  not when drawn slower; random mouse wandering triggers nothing. Slot hints show the new times.
- **Travel prompt above the tutorial tip:** the prompt (z-index 25) now covers the tutorial tip
  (20) where they meet, e.g. at the "North is open!" step; story panels (40) stay on top.
- **Top HUD moved a little down and toward the centre:** new CSS variables `--hud-top` (16 → 30 px)
  and `--hud-side` (16 → 40 px) position the Inventory button, gold/spices, Sound and Map buttons,
  minimap, map name and compass; the travel prompt and messages moved down with them.
- **Title screen and narrated opening** (`src/Intro.ts`; art in `art/`):
  - The game opens on the title art (`public/assets/title/game-title.jpg`, a 192 KB copy of
    `art/Game-Title.png`) while the models load. After 2 seconds (and once loaded) a big, glowing
    crimson **Start** button appears.
  - Start: fog rolls in over the title (1.2 s), the game is swapped in behind it, and the fog
    drifts away (2 s).
  - The narrator then speaks (`public/assets/audio/narrator-intro.mp3`, from `art/`). The game is
    paused and darkened behind a text box; the 5 paragraphs of `art/narrator-text.txt` fade in as
    the narration reaches them. The box closes when the narration ends, or on **Skip** (or Esc).
    If the browser blocks the sound, the whole text shows and Skip closes it.
  - Then "The First Signs" panel and the tutorial start as before. The old first story panel
    ("Strange visions haunt the Order…") is removed; the narration replaces it.
- **Performance** (the game ran badly on a Mac with Chrome):
  - Resolution capped at 1.5x pixel density (`MAX_PIXEL_RATIO` in `Game.ts`): Retina screens
    rendered at 2x, i.e. 4x the pixels; 1.5x draws ~45% fewer pixels with little visible change.
  - Lighter fog: edge fog 203 → 55 see-through sprites (one row, wider apart, a bit larger), and
    the ground mist uses 1 full-screen layer instead of 2 (same thickness: 1 − (1 − opacity)²).
  - Cheaper shadows: shadow map 2048 → 1024 (`SHADOW_MAP_SIZE`); border trees and small props
    (bones, skulls, markers, fences, lanterns) no longer cast shadows. Shadow casters 638 → 177.
- **Attack animations:**
  - The knight's sword attacks cycle through 4 swings instead of always the same one:
    horizontal slice → diagonal slice → chop → stab (`SWORD_SWINGS` in `Player.ts`).
  - Each swing leaves a bright slash arc in front of the knight for 0.2 s, tilted to match it
    (flat sweep, 45° diagonal, upright chop, narrow forward thrust for the stab). It appears at the
    middle of the swing, whether or not it hits.
- **Death burst:** a dying enemy releases a puff of dark smoke (12 puffs drifting out and up,
  fading over ~1 s). The Dust Push puffs and this smoke share the same code (`spawnPuffs`).
- **Tutorial recommends a mouse:** under the first attack tip and the Frenzy (shake) tip there is
  now a mouse picture (gold outline, drawn in SVG) with the note "Recommended Mouse Use".
- **Removed the temporary "Debug: Enemies" button** and the code only it used (the enemy
  showcase ring and the enemies' `passive` flag).
