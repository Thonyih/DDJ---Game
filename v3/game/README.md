# Game Prototype (v2)

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
- Right-click enemy (red box): target it; the player attacks whenever it is in range (right-click never moves the player)
- Right-click a chest when standing next to it: open it for gold, spices and a health potion that heals 30 HP immediately (max 3 on the map, a new one appears 30s after one is opened)
- Inventory button (top left): resources, weapon upgrade (+5 damage) and health upgrade (+25 max HP)
- Missions button (below Inventory): choose and start a mission

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
- North is the top of the minimap. Borders with no map beyond them do nothing.
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
