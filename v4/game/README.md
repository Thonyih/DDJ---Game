# Game Prototype (v4) — single player

Toy prototype loop: TypeScript + Three.js + Vite.
Mission select → fight → rewards → inventory/upgrade → replay.

## Requirements

- Node.js and npm

## Setup

```bash
npm install
```

## Run (dev server)

```bash
npm run dev
```

Open the printed URL (default http://localhost:5173/).

## Controls

- Left-click ground: move there
- Toolbar slot 1 / 2 (click): choose the **sword** or the **bow** (bow shows arrows left, max 5)
- Right-click an enemy: target it; the player attacks whenever it is in range (right-click never moves the player)
- Any other click (moving, a chest, empty ground) cancels the attack; right-click the enemy again to resume
- Right-click a chest when standing next to it: open it for gold, spices and a health potion that heals 30 HP immediately (max 3 on the map, a new one appears 30s after one is opened)
- Inventory button (top left): resources, weapon upgrade (+5 damage) and health upgrade (+25 max HP)
- Right-click the **Capitão da Ordem** (mission-giver near the centre of every map, gold dot on the minimap) when close: choose and start a mission
- A short tutorial guides new players step by step (skippable)

The world never pauses. Minimap is top right; health bar and item slots are at the bottom.

## World maps

The world is 12 maps (A–L) in a grid 3 wide and 4 tall. You start in Map A (bottom-left):

```
J K L
G H I
D E F
A B C
```

- Walk to a border that has a map beyond it (shown in gold on the minimap) and a prompt appears at the top of the screen to travel.
- North is the top of the minimap (marked N). The compass under the minimap shows where north is on screen and which way you are heading. Borders with no map beyond them do nothing.
- You can't travel during an active mission.
- The "Map X" button left of the minimap opens the world grid showing where you are.
- Each map keeps its own chests.

Map names: A Campos de Tomar, B Bosque dos Templários, C Ruínas do Convento, D Túneis de Tomar,
E Fronteira de Trancoso, F Campos dos Cavaleiros Fantasma, G Serra das Sombras, H Caminho de Lisboa,
I Costa dos Navios Negros, J Cabo das Tormentas, K Ilhas dos Corsários, L Costa do Além-Mar.

Progress (gold, spices, upgrade levels) is kept in memory and resets on page reload.

## Other commands

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
```
