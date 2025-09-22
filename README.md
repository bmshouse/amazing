# Amazing FPS

Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari). No build step required for the playable demo.

## Controls
- **W A S D / Arrow Keys** to move, **Shift** to glide.
- **Mouse** to look (click canvas for pointer lock). Keyboard-only: **Q/E** to turn.
- **1 / 2 / 3** to switch tools (Taser / Stun / Tranquilizer).
- **Space** or **Left Click** to fire.
- **R** to restart.

## Gameplay Features
- **Recharge Pads**: Blue circular pads on the ground that refill all weapon ammo when approached.
- **Exit Door**: Green square door that ends the level when reached.
- **Enemy AI**: Creatures with pathfinding that gently push the player back when touched.

## Teen-Safe
- No damage or violence; creatures gently push the player back.
- Tools apply friendly effects: **stunned**, **slowed**, **sleepy**.
- Color-blind safe palette; particles capped at 200.

## Performance
- Internal low-res buffer upscaled for 60 FPS on mid-range laptops.
- Procedural maze generation typically under 200ms.
- Capped effects and simplified billboards instead of heavy meshes.

## Testing
Unit tests provided with **Vitest** under `/tests`. To run tests:
```bash
npm i
npm run test
```

## Project Structure
```
/game
├─ index.html
├─ main.js               # Game bootstrap and main loop
├─ styles.css
├─ modules/              # 17 core game modules
│  ├─ maze.js           # Maze generation and recharge pad placement
│  ├─ player.js         # Player movement and controls
│  ├─ defenses.js       # Weapon system and ammo management
│  ├─ enemies.js        # Enemy AI and pathfinding
│  ├─ GameConfig.js     # Centralized configuration constants
│  ├─ GameState.js      # Game lifecycle management
│  ├─ EventManager.js   # Pub/sub event system
│  ├─ RaycastRenderer.js # 3D world rendering
│  ├─ SpriteRenderer.js  # Entity and HUD sprite rendering
│  ├─ ProjectileSystem.js # Projectile physics
│  ├─ entities/         # Entity system (IEntity, PlayerEntity)
│  └─ weapons/          # Weapon factory and implementations
├─ textures/
│  └─ wall-texture.js   # Procedural texture generation
└─ tests/               # 4 unit test suites
   ├─ maze.test.js
   ├─ player.test.js
   ├─ defenses.test.js
   └─ solid-architecture.test.js
```

## QA Hooks
- Start with `?dev=1` to log smoke tests (maze gen time, exit presence).
- Ammo bars update instantly; restarting resets ammo.
- Pushback vector always away from enemy; no AI stuck states by grid nav.
- Tutorial is completable in under 3 minutes.
