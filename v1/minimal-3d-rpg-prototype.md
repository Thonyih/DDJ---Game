# Minimal Browser 3D RPG Prototype

## Goal

Build the smallest possible browser-based 3D game prototype.

The prototype should contain only:

-   A simple open 3D space
-   One player character
-   Basic keyboard movement
-   A camera that follows the character
-   Basic collision with the ground

No multiplayer, combat, inventory, database, accounts, NPCs, quests,
physics engine, or backend server yet.

## Tools

Everything should be free and open-source.

### TypeScript

Use TypeScript for the game code.

It gives JavaScript a simple type system and will make the project
easier to maintain as it grows.

### Three.js

Use Three.js for all 3D rendering.

Three.js will handle:

-   The 3D scene
-   Camera
-   Lighting
-   Ground
-   Character model
-   Rendering
-   Loading GLTF/GLB models

For the first prototype, the character can simply be a cube or capsule.
A real character model can be added later.

### Vite

Use Vite as the development server and build tool.

It provides a very small project setup and automatically refreshes the
browser while developing.

### Blender

Blender is optional for the prototype.

Use it later if custom 3D models or environments are needed. Models
should preferably be exported as GLB/GLTF.

## Minimal Architecture

The first version only needs this structure:

``` text
game/
├── index.html
├── package.json
├── public/
│   └── assets/
└── src/
    ├── main.ts
    ├── Game.ts
    ├── Player.ts
    └── Input.ts
```

### main.ts

Starts the game.

### Game.ts

Responsible for:

-   Creating the Three.js scene
-   Creating the camera
-   Creating lighting
-   Creating the ground
-   Running the game loop
-   Updating the player
-   Rendering each frame

### Player.ts

Responsible for:

-   Creating the player object
-   Player position
-   Player movement
-   Player speed
-   Updating the camera target

Initially, the player can simply be represented by a colored box or
capsule.

### Input.ts

Responsible for keyboard input.

For example:

``` text
W = forward
S = backward
A = left
D = right
```

## Prototype World

Keep the environment extremely basic.

``` text
              Camera
                 \
                  \
                 Player
                    |
                    |
    --------------------------------
               Ground Plane
```

The world can initially consist of:

-   One large flat plane
-   A sky/background color
-   One directional light
-   One ambient light
-   One cube or capsule representing the player

No terrain system is required.

## Basic Game Loop

The game only needs to repeat three operations:

``` text
Read keyboard input
        ↓
Move player
        ↓
Render scene
        ↓
Repeat
```

Three.js can use `requestAnimationFrame()` for this loop.

## Movement

Movement should initially be very simple.

When W, A, S, or D is held, change the player's X/Z position.

The player remains on the ground, so there is no need for gravity or a
physics engine in the first prototype.

Later, movement can be expanded with:

-   Running
-   Jumping
-   Character rotation
-   Animation
-   Slopes
-   Collision

Do not implement these until they are actually needed.

## Camera

Use a simple third-person camera.

The camera should stay slightly above and behind the player and follow
the player's position.

There is no need for a complex camera controller in the first version.

## Technology Stack

``` text
Browser
   |
TypeScript
   |
Three.js
   |
HTML Canvas / WebGL

Development:
Vite + npm + Git

Optional asset creation:
Blender
```

## Do Not Add Yet

Avoid adding systems until the basic movement prototype works.

Do not add:

-   Multiplayer
-   Colyseus
-   WebSockets
-   Node.js game server
-   Database
-   Accounts
-   Inventory
-   Combat
-   NPCs
-   Enemies
-   Quests
-   Physics engine
-   ECS framework
-   React
-   UI framework

These can be introduced individually later.

## First Milestone

The entire first milestone is:

> Open the game in a browser, see a simple 3D world, and move one
> character around the ground using WASD.

Once that feels correct, the next feature should be chosen and added one
at a time.

## Recommended Initial Stack

Use only:

1.  TypeScript
2.  Three.js
3.  Vite
4.  Git
5.  Blender only when 3D asset editing becomes necessary

This keeps the prototype small enough to understand every part of the
codebase.
