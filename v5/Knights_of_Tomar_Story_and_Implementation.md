# Knights of Tomar — Story Script & Implementation Notes

## Narrative premise

Members of the Templar Order have begun experiencing visions of Portugal's destruction. The **Capitão da Ordem** summons a young Templar knight to Tomar and sends him to investigate. As the knight travels through increasingly corrupted lands, supernatural creatures emerge from ruins, forests, battlefields, and the coast. In Tier 3, the knight learns the name of the threat: **Adamastor**. By the time he reaches the final confrontation, Adamastor has already awakened. The knight defeats him, but the land remains scarred.

**Tone:** Dark, mysterious, restrained.  
**Delivery:** One- or two-sentence dialogue; short, once-only tier introductions; optional interactable lore.  
**Folklore basis:** The Templar Secret of Tomar, Phantom Knights of Trancoso, Phantom Black Ships of Lisbon, Corsairs of Berlengas, Ghost Corsair of Cabo da Roca, Adamastor, and Mapinguari as explored in the Week 1 research. The specific inscriptions and plot are **original fiction inspired by** those subjects, not quotations from traditional legends.

## 1. Opening (first new game)

**Trigger:** New game, before or immediately after spawning in A — Campos de Tomar. Show only once per save.

**Title:** KNIGHTS OF TOMAR

> Strange visions haunt the Order. They show a kingdom swallowed by darkness, but reveal neither its cause nor its name.

**Trigger:** First conversation with the Capitão da Ordem.

**CAPITÃO DA ORDEM**

> "Our brothers have seen Portugal in ruins. Something is stirring beyond Tomar."
>
> "Go, investigate these disturbances, and return with what you learn."

**Gameplay:** Enable the first mission through the existing mission system. Do not create a separate story-only quest unless needed.

## 2. Tier introductions

Show **once per tier per save** when the player first enters *any* map in that tier. Changing maps within the same tier must not repeat the text.

| Tier | Maps | Display title | Text |
|---|---|---|---|
| 1 — Easy | A Campos de Tomar; B Bosque dos Templários; C Ruínas do Convento | **The First Signs** | "The Order's visions grow restless. Even the familiar lands around Tomar no longer feel safe." |
| 2 — Medium | D Túneis de Tomar; E Fronteira de Trancoso; F Campos dos Cavaleiros Fantasma | **The Restless Dead** | "The darkness reaches the old Templar lands. Forgotten soldiers rise, and the dead refuse to rest." |
| 3 — Hard | G Serra das Sombras; H Caminho de Lisboa; I Costa dos Navios Negros | **The Name in the Storm** | "The corruption has reached the coast. Amid the wrecks and gathering storms, one name returns: Adamastor." |
| 4 — Deadly | J Cabo das Tormentas; K Ilhas dos Corsários; L Costa do Além-Mar | **The Last Warning** | "The sea rages and the sky darkens. Adamastor has awakened; the visions are becoming real." |

**Important:** The Tier 3 introduction is the **first explicit reveal of Adamastor's name**. Avoid using his name in earlier dialogue, mission descriptions, or readable lore if preserving the mystery matters.

## 3. Capitão da Ordem — progression dialogue

These are short story conversations, separate from ordinary mission descriptions. Show each at most once, ideally on the player's next conversation with the Capitão after meeting the specified milestone.

### First conversation (Tier 1)

> "Our brothers have seen Portugal in ruins. Something is stirring beyond Tomar."
>
> "Investigate the disturbances and report what you find."

### After completing the Tier 1 milestone

> "These creatures should not roam so close to Tomar."
>
> "Search the old Templar lands. We must learn how far the darkness has spread."

### After completing the Tier 2 milestone

> "Even the knights of Trancoso cannot rest. This is no ordinary haunting."
>
> "Follow the disturbances toward the coast. The answer may lie there."

### After reaching Tier 3 / learning the name

> "Adamastor. The name belongs to an ancient terror of the sea."
>
> "Keep moving. We cannot allow the visions to become our fate."

### Before the final confrontation, if the Capitão is reachable

> "The darkness is no longer approaching. It is here."
>
> "Whatever awaits you at the end, Portugal depends on your courage."

**Implementation note:** The Capitão does not need to physically appear in every region. If the player cannot return to him naturally, these conversations can remain optional. Never block progression behind a dialogue the player cannot access.

## 4. Existing mission connections

Keep the established missions. Add **one short contextual line** to the existing mission-giver text or mission journal; avoid changing objectives, rewards, or map travel behavior.

| Tier | Mission | Optional story context |
|---|---|---|
| 1 | Find the Lost Chests | "Supplies have vanished near Tomar. Find them before the darkness claims the roads." |
| 1 | Clear the Field | "Creatures gather where the fields were once safe. Drive them back." |
| 1 | Wolves of Tomar | "The wolves have grown unusually bold. Discover what has driven them from the woods." |
| 2 | Hold the Line | "The frontier is failing. Hold the path against the restless dead." |
| 2 | The Restless Templars | "The fallen Templars walk again. Give them rest." |
| 2 | Sentinels of Trancoso | "Spectral sentinels still guard Trancoso, but no longer know friend from foe." |
| 2 | The Templar Relic | "A relic lies among the haunted fields. Recover it and continue the investigation." |
| 3 | Witches of the Serra | "Strange rites have appeared in the mountains. End them." |
| 3 | The Spectral Crew | "The dead have returned from the sea. Find what drew them ashore." |
| 3 | Pirates of the Berlengas | "Corsairs haunt the islands and coastal routes. Break their hold." |
| 3 | The Black Ship | "A black ship appears where no vessel should sail. Investigate its wake." |
| 3 | The Lost Astrolabe | "Recover the lost astrolabe; its route may point toward the source of the storms." |
| 4 | The Mapinguari | "A monstrous beast blocks the way. Defeat it to continue your journey." |
| 4 | The Captain of Cabo da Roca | "The ghostly captain commands the cursed shore. End his reign." |
| 4 | Adamastor | "The giant has awakened. Face him before Portugal is lost." |

**Mapinguari:** An independent threat, **not** Adamastor's servant, guardian, or creation. Its defeat clears a dangerous obstacle but does not explain the prophecy.

## 5. Interactable environmental lore

Each interaction displays a **short, readable text panel**. Text should be optional and must not interrupt combat. These are **proposed inscriptions**, not historical quotations.

### Crypt — 1 in Tier 3, 2 in Tier 4

| ID | Placement suggestion | Title | Interaction text |
|---|---|---|---|
| `crypt_t3_01` | I — Costa dos Navios Negros | **The Drowned Oath** | "Here lie those who followed the black sails. The sea returned their bodies, but not their peace." |
| `crypt_t4_01` | J — Cabo das Tormentas | **The Last Watch** | "We watched the horizon until the horizon vanished. May those who follow turn back." |
| `crypt_t4_02` | L — Costa do Além-Mar | **A Knight Without a Name** | "He crossed the darkness so that others might see dawn. His name was lost; his oath remains." |

### Candle shrine — Tier 4 only; lit

| ID | Placement suggestion | Title | Interaction text |
|---|---|---|---|
| `shrine_t4_01` | J — Cabo das Tormentas | **A Prayer Against the Storm** | "Let this flame endure where the sun cannot. Guide the living through the night." |
| `shrine_t4_02` | K — Ilhas dos Corsários | **For Those at Sea** | "For the lost, a light. For the living, a way home." |

### Gravestone — Tiers 3 and 4

| ID | Placement suggestion | Title | Interaction text |
|---|---|---|---|
| `grave_t3_01` | G — Serra das Sombras | **The Forgotten Knight** | "He stood his ground when the forest fell silent." |
| `grave_t3_02` | I — Costa dos Navios Negros | **No Safe Harbor** | "The waves took his ship. The darkness took his rest." |
| `grave_t4_01` | J — Cabo das Tormentas | **The Final Warning** | "We mistook the first storm for the worst." |
| `grave_t4_02` | L — Costa do Além-Mar | **Here Fell a Brother** | "His sword broke. His oath did not." |

### Standing lantern — Tiers 2 and 3

| ID | Placement suggestion | Title | Interaction text |
|---|---|---|---|
| `lantern_t2_01` | D — Túneis de Tomar | **Pilgrim's Mark** | "Keep the light to your left. The lower passage does not lead home." |
| `lantern_t2_02` | E — Fronteira de Trancoso | **The Old Road** | "If you hear marching after sundown, leave the road to the dead." |
| `lantern_t3_01` | H — Caminho de Lisboa | **A Traveler's Note** | "The air grows colder toward the sea. Do not follow voices in the fog." |

### Skull post — Tier 4 only

| ID | Placement suggestion | Title | Interaction text |
|---|---|---|---|
| `skull_t4_01` | J — Cabo das Tormentas | **Edge of the Storm** | "Beyond this point, even the wind speaks in warnings." |
| `skull_t4_02` | K — Ilhas dos Corsários | **The Captain's Claim** | "All who land here belong to the tide." |
| `skull_t4_03` | L — Costa do Além-Mar | **No Return** | "Those who crossed this line did not come back." |

**Placement constraints:** These are suggestions, not claims about the current map geometry. Only place an entry where that prop actually exists; do not add more crypts than the specified **1 in Tier 3 and 2 in Tier 4**. If fewer instances of another prop exist, select the best entries rather than spawning new props solely for lore.

## 6. Boss moments

Use brief text **before or after** encounters, without adding cutscenes unless the game already supports them.

| Boss | Encounter text | Victory text | Notes |
|---|---|---|---|
| **Capitão do Cabo da Roca** | "The ghostly captain still claims these waters." | "The captain falls. For a moment, the waves grow quiet." | Connected to the ghost corsair / Berlengas coastal legends. |
| **Mapinguari** | "A beast from beyond the familiar world bars your path." | "The beast is defeated. The darkness ahead remains unexplained." | Independent boss; do **not** connect its origin to Adamastor. |
| **Adamastor** | "The giant has awakened. The prophecy can no longer be prevented—only survived." | *Use the ending sequence below.* | Final narrative boss; only one encounter. |

**Progression:** Defeating a regional boss can reveal a brief clue and unlock the next region **only if this matches the existing progression rules**. Do not require defeating Mapinguari to obtain information about Adamastor.

**Important map-order decision:** The earlier map plan places **Adamastor at J** and **Mapinguari at L**, while the narrative calls Adamastor the final confrontation. If map progression is strictly A → L, this is inconsistent. To keep Adamastor last, either (a) move his encounter to the final reachable map, or (b) use explicit mission/boss unlock order that allows J to be visited last. This document does not assume either change has already been implemented.

## 7. Ending — bittersweet victory

**Trigger:** First confirmed defeat of Adamastor.

**Display:** Simple ending overlay or sequential text screens. No extra characters or cinematic required.

> Adamastor falls. The storm begins to break, and the darkness retreats from the shore.
>
> Portugal survives. But the ruined land, the silent villages, and the restless dead remain.

**Final line:**

> **The darkness has passed. Its scars remain.**

After dismissal, return control to the existing post-boss game state, or show a simple **End of Story** screen. Do not automatically reset the save.

## 8. Implementation specification (engine-agnostic)

These are **suggested functions and state fields**, not assertions about the current codebase. Reuse the existing dialogue, mission, save, map-change, and interaction systems wherever possible. The pseudocode is illustrative JavaScript-style logic.

### Persistent state

```js
storyState = {
  openingSeen: false,
  captainIntroSeen: false,
  seenTierIntros: [],           // e.g. [1, 2]
  seenCaptainDialogues: [],     // e.g. ["after_tier_1"]
  readLoreIds: [],              // optional: track read entries
  defeatedBosses: [],          // reuse existing boss progression if available
  endingSeen: false
};
```

Persist these fields in the **existing save system**. If the game already tracks missions, bosses, or dialogue flags, reference those values instead of maintaining duplicate sources of truth.

### Map-to-tier mapping

```js
const MAP_TIER = {
  A: 1, B: 1, C: 1,
  D: 2, E: 2, F: 2,
  G: 3, H: 3, I: 3,
  J: 4, K: 4, L: 4
};
```

### Story triggers

```js
function onNewGameStarted() {
  if (!storyState.openingSeen) {
    showStoryPanel("opening", () => {
      storyState.openingSeen = true;
      saveStoryState();
    });
  }
}

function onMapEntered(mapId) {
  const tier = MAP_TIER[mapId];
  if (!tier || storyState.seenTierIntros.includes(tier)) return;

  // Wait until the map is loaded and the player is not in combat.
  queueStoryPanel(`tier_${tier}`, () => {
    storyState.seenTierIntros.push(tier);
    saveStoryState();
  });
}

function onCaptainInteracted() {
  const dialogueId = getEligibleCaptainDialogue();
  if (dialogueId) {
    showDialogue(dialogueId, () => {
      markCaptainDialogueSeen(dialogueId);
      saveStoryState();
      openExistingMissionMenu();
    });
  } else {
    openExistingMissionMenu();
  }
}

function onLorePropInteracted(loreId) {
  const entry = LORE_ENTRIES[loreId];
  if (!entry) return;
  showLorePanel(entry.title, entry.text);
  // Optional: mark as read without hiding future interactions.
}

function onBossDefeated(bossId) {
  // First let existing combat and mission systems register the victory.
  if (bossId === "adamastor" && !storyState.endingSeen) {
    queueStoryPanel("ending", () => {
      storyState.endingSeen = true;
      saveStoryState();
    });
  }
}
```

### Required integration points

| Function / hook | When called | Required behavior |
|---|---|---|
| `onNewGameStarted()` | On creation of a new save | Show opening once. |
| `onMapEntered(mapId)` | After a successful map transition | Show the relevant tier intro only on first entry into that tier. |
| `onCaptainInteracted()` | Existing Capitão interaction | Show eligible short dialogue, then existing mission UI. |
| `getEligibleCaptainDialogue()` | On Capitão interaction | Choose dialogue based on **completed** missions/tier milestones, not map entry alone. |
| `onLorePropInteracted(loreId)` | Player activates a configured prop | Open a readable lore panel with title and text. |
| `onBossDefeated(bossId)` | Boss HP reaches zero and defeat is confirmed | Trigger victory text; show ending only for Adamastor. |
| `saveStoryState()` / load equivalent | Existing save/load lifecycle | Persist once-only flags. |

### UI and interaction behavior

1. **Reuse existing UI:** A centered text panel with title, 1–2 sentences, and a **Continue/Close** button is sufficient. Avoid a new cutscene system.
2. **Safe timing:** Queue narrative panels until the player is out of combat and the map transition is complete. Do not display overlays during an attack or loading screen.
3. **Once-only behavior:** Mark a tier introduction as seen **after** the player dismisses it; do not mark it when merely queued. Prevent duplicate panels if multiple events fire.
4. **Lore interaction:** Use the existing interaction key/click mechanic. Add an interaction prompt within range; allow players to reread inscriptions.
5. **Accessibility:** Keep text large enough to read, support keyboard dismissal, and avoid rapidly disappearing text. This responds to earlier tutorial readability feedback.
6. **Non-blocking lore:** Gravestones, crypts, shrines, lanterns, and skull posts should not be required for mission completion unless the mission already calls for interacting with them.
7. **No new assets required:** Existing props and a basic text panel are enough. Lit candle shrines remain lit as specified.
8. **No new mechanics required:** The story does not introduce multiplayer, idle systems, branching dialogue, or inventory-based lore collection.

## 9. Minimal build checklist

- [ ] Add story text as data entries, separate from game logic.
- [ ] Hook the opening into new-game initialization.
- [ ] Map A–L to tiers and add once-per-tier introduction flags.
- [ ] Add short Capitão dialogue at existing mission milestones.
- [ ] Give each selected lore prop instance a unique `loreId`.
- [ ] Hook lore interaction to the existing interaction prompt and panel.
- [ ] Add boss victory messages and an Adamastor ending trigger.
- [ ] Save and reload story flags.
- [ ] Test first entry into a tier, switching maps inside a tier, save/load, repeated prop interaction, and boss defeat.
- [ ] Confirm Adamastor is the final reachable narrative encounter under the actual map progression rules.

---

**Scope note:** This is a narrative and implementation specification, not a code patch. Actual function names, state ownership, map transitions, and mission milestones must be matched to the game's existing source code before implementation.
