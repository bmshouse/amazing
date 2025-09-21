// main.js - bootstraps the game and runs the loop
import { Maze } from './modules/maze.js';
import { PlayerController } from './modules/player.js';
import { Defenses } from './modules/defenses.js';
import { EnemyController } from './modules/enemies.js';
import { generateWallTexture, generateBrickTexture } from './textures/wall-texture.js';

export function bootstrap({ dev=false } = {}) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hud = {
    timer: document.getElementById('timer'),
    sensitivity: document.getElementById('sensitivity'),
    audioToggle: document.getElementById('audioToggle'),
    subtitles: document.getElementById('subtitles'),
    tutorial: document.getElementById('tutorial'),
    bars: {
      taser: document.querySelector('#ammo-taser span'),
      stun: document.querySelector('#ammo-stun span'),
      tranq: document.querySelector('#ammo-tranq span'),
    },
  };

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 960, H = 540; // internal resolution for speed
  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width / 2)) | 0;
    H = Math.max(180, Math.floor(rect.height / 2)) | 0;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Game state
  const state = {
    started: false,
    startTime: 0,
    elapsed: 0,
    won: false,
    dev,
  };

  // Audio shim (procedural chimes); togglable
  const audio = (function(){
    const enabled = () => hud.audioToggle.checked;
    let ac;
    function beep(type='sine', freq=440, dur=0.08, vol=0.05) {
      if (!enabled()) return;
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(t0 + dur);
    }
    return { beep };
  })();

  // Maze + systems
  const mazeSize = 21; // odd number for perfect maze
  let maze = new Maze(mazeSize, mazeSize);
  maze.generate();

  // Generate wall textures
  const wallTexture = generateWallTexture(64, 64);
  const brickTexture = generateBrickTexture(64, 64);

  // Set entity colors
  const exitDoorColor = '#a8f8abff';
  const rechargePadColor = '#2b1bbdff';
  const entityStunnedColor = '#ffd166';
  const entityTranqColor = '#a29bfe';
  const entitySlowedColor = '#00d1ff';
  const entityColor = '#f0134aff';


  const player = new PlayerController(maze);
  const enemies = new EnemyController(maze, player);
  const defenses = new Defenses(player, enemies, audio, hud);

  // Input events
  hud.sensitivity.addEventListener('input', (e)=>{
    player.sensitivity = parseFloat(e.target.value);
  });
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Enter' && !state.started) startGame();
    if (e.code === 'KeyR') restart();
    if (['Digit1','Digit2','Digit3'].includes(e.code)) {
      const m = { Digit1:'taser', Digit2:'stun', Digit3:'tranq' }[e.code];
      defenses.setMode(m);
      speak(m);
      audio.beep('square', 660, 0.06, 0.04);
    }
  });

  // Pointer lock optional, keyboard-only fallback provided
  canvas.addEventListener('click', ()=>{
    if (!state.started) return;
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', ()=>{
    player.pointerLocked = (document.pointerLockElement === canvas);
  });
  window.addEventListener('mousemove', (e)=>{
    if (!state.started) return;
    if (player.pointerLocked) {
      player.turn(e.movementX);
    }
  });

  function startGame() {
    state.started = true;
    state.won = false;
    state.startTime = performance.now();
    hud.tutorial.style.display = 'none';
    audio.beep('sine', 520, 0.1, 0.06);
  }
  function restart() {
    maze = new Maze(mazeSize, mazeSize);
    maze.generate();
    player.reset(maze);
    enemies.reset(maze);
    defenses.reset();
    state.startTime = performance.now();
    state.won = false;
    state.started = true;
    hud.tutorial.style.display = 'none';
    speak('Restarted!');
    audio.beep('sine', 480, 0.07, 0.06);
  }

  // HUD helpers
  function fmtTime(ms) {
    const t = Math.max(0, Math.floor(ms/1000));
    const m = (t/60)|0, s = (t%60)|0;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }
  function speak(text) {
    hud.subtitles.textContent = text;
    clearTimeout(speak._t);
    speak._t = setTimeout(()=>{ hud.subtitles.textContent=''; }, 1200);
  }

  // Smoke tests (dev mode)
  if (dev) {
    // Maze gen under 200ms and exit reachable
    const t0 = performance.now();
    const testMaze = new Maze(31,31); testMaze.generate();
    const genTime = performance.now() - t0;
    console.log('[SMOKE] Maze gen ms:', genTime.toFixed(2));
    if (genTime > 200) console.warn('Maze gen too slow!');
    if (!testMaze.exit) console.error('Exit missing!');
  }

  // Raycaster renderer (fast, low-res internal buffer scaled up)
  const RC = {
    fov: Math.PI/3, // 60 deg
    maxDepth: 24,
    columnStep: 1, // pixel column step for speed; 1 = full res
  };

  // Particles
  const particles = [];
  function spawnParticle(x, y, color='#9be7ff', life=400) {
    if (particles.length > 200) return;
    particles.push({ x, y, r: 0.02+Math.random()*0.03, life, color, born: performance.now() });
  }

  // Game loop
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(50, now - last); last = now;
    if (state.started) {
      state.elapsed = now - state.startTime;
      hud.timer.textContent = fmtTime(state.elapsed);
      player.update(dt, maze);
      enemies.update(dt, maze);
      defenses.update(dt);
      if (!state.won && maze.exit && player.distanceTo(maze.exit.centerX, maze.exit.centerY) < 0.5) {
        state.won = true;
        state.started = false;
        hud.tutorial.style.display = '';
        hud.tutorial.querySelector('h2').textContent = 'You found the exit! 🎉';
        speak('Great job! Press Enter to play again.');
        audio.beep('triangle', 740, 0.12, 0.07);
      }
    }
    render();
  }
  requestAnimationFrame(loop);

  function render() {
    // Clear the entire canvas with dark background color
    ctx.fillStyle = '#0b0e1d';
    ctx.fillRect(0, 0, W, H);

    // Draw sky gradient in upper half of screen (ceiling area)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, H/2);
    skyGradient.addColorStop(0, '#1c2050'); // Darker blue at top
    skyGradient.addColorStop(1, '#2a2f4a'); // Lighter blue at horizon
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, W, H/2);

    // Draw floor gradient in lower half of screen
    const floorGradient = ctx.createLinearGradient(0, H/2, 0, H);
    floorGradient.addColorStop(0, '#111728'); // Lighter at horizon line
    floorGradient.addColorStop(1, '#0b0e1d'); // Darker at bottom
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, H/2, W, H/2);

    // RAYCASTING WALL RENDERING
    // Calculate angular step between rays - spread field of view across screen width
    const rayAngleStepPerPixel = RC.fov / W;

    // Start with leftmost ray angle (player facing direction minus half FOV)
    let currentRayAngle = player.a - RC.fov/2;

    // Cast one ray for each pixel column across the screen
    for (let screenX = 0; screenX < W; screenX += RC.columnStep, currentRayAngle += rayAngleStepPerPixel * RC.columnStep) {

      // Cast ray from player position in current direction
      const wallHitInfo = castRay(player.x, player.y, currentRayAngle);

      if (wallHitInfo) {
        // DISTANCE CALCULATION AND FISH-EYE CORRECTION
        // Apply fish-eye correction: multiply by cosine of angle difference from center ray
        // This prevents the "barrel distortion" effect where walls curve at screen edges
        const fishEyeCorrectedDistance = wallHitInfo.dist * Math.cos(currentRayAngle - player.a);

        // Clamp minimum distance to prevent extreme texture stretching when very close to walls
        const clampedDistanceToWall = Math.max(0.1, fishEyeCorrectedDistance);

        // WALL HEIGHT CALCULATION
        // Wall height on screen is inversely proportional to distance (perspective projection)
        // Closer walls appear taller, distant walls appear shorter
        const wallHeightInPixels = Math.min(H, (H / clampedDistanceToWall) | 0);

        // Calculate vertical position to center the wall on screen
        const wallTopY = ((H - wallHeightInPixels) / 2) | 0;

        // LIGHTING CALCULATION
        // Calculate brightness based on distance - closer walls are brighter
        const brightnessFactor = Math.max(0, 1 - clampedDistanceToWall / RC.maxDepth);

        // TEXTURE SELECTION
        // Choose between two textures based on wall grid position (creates checkerboard pattern)
        const selectedTexture = ((Math.floor(wallHitInfo.nx) + Math.floor(wallHitInfo.ny)) % 2 === 0) ? wallTexture : brickTexture;

        // TEXTURE COORDINATE CALCULATION
        // Calculate horizontal texture coordinate (U) based on which wall face we hit
        let wallSurfaceU; // Position along the wall surface (0.0 to 1.0)

        // Determine if we hit a vertical wall (north/south facing) or horizontal wall (east/west facing)
        const hitPointX = wallHitInfo.nx;
        const hitPointY = wallHitInfo.ny;
        const isVerticalWall = Math.abs(hitPointX - Math.floor(hitPointX + 0.5)) < 0.01;

        if (isVerticalWall) {
          // Hit vertical wall - use Y coordinate for texture mapping
          wallSurfaceU = hitPointY % 1;
        } else {
          // Hit horizontal wall - use X coordinate for texture mapping
          wallSurfaceU = hitPointX % 1;
        }

        // Convert wall surface position to texture pixel coordinate
        const textureSourceX = Math.floor(wallSurfaceU * selectedTexture.width) % selectedTexture.width;

        // VERTICAL TEXTURE COORDINATE CALCULATION
        // Use fixed texture scale to maintain consistent texture appearance regardless of distance
        const fixedTextureScale = 64; // Controls apparent texture size - higher = smaller textures
        const wallHeightInTexturePixels = wallHeightInPixels / fixedTextureScale;
        const textureVerticalStart = 0; // Always start from top of texture

        const textureSourceY = Math.floor(textureVerticalStart * selectedTexture.height) % selectedTexture.height;
        const textureSourceWidth = 1; // Sample single pixel column to avoid distortion
        const textureSourceHeight = Math.min(selectedTexture.height, Math.ceil(wallHeightInTexturePixels));

        // WALL COLUMN RENDERING
        ctx.save();
        ctx.globalAlpha = 1;

        // Draw textured wall column from texture to screen
        ctx.drawImage(
          selectedTexture,
          textureSourceX, textureSourceY, textureSourceWidth, textureSourceHeight, // source rectangle
          screenX, wallTopY, RC.columnStep, wallHeightInPixels // destination rectangle
        );

        // DISTANCE-BASED SHADING OVERLAY
        // Apply multiplicative color overlay to simulate distance fog/lighting
        ctx.globalCompositeOperation = 'multiply';
        const shadedRed = (60 + 80 * brightnessFactor) | 0;
        const shadedGreen = (140 + 40 * brightnessFactor) | 0;
        const shadedBlue = (200 + 20 * brightnessFactor) | 0;
        ctx.fillStyle = `rgba(${shadedRed}, ${shadedGreen}, ${shadedBlue}, 0.7)`;
        ctx.fillRect(screenX, wallTopY, RC.columnStep, wallHeightInPixels);

        ctx.restore();
      }
    }

    // Sprites: enemies, recharge pads, exit
    // Exit
    if (maze.exit) {
      drawBillboard(maze.exit.centerX, maze.exit.centerY, 0.6, exitDoorColor);
    }
    // Pads
    maze.pads.forEach(p=> drawBillboard(p.x+0.5, p.y+0.5, 0.5, rechargePadColor));
    // Enemies
    enemies.entities.forEach(e=>{
      const col = e.state==='stunned' ? entityStunnedColor : e.state==='tranq' ? entityTranqColor : e.state==='slowed' ? entitySlowedColor : entityColor;
      drawBillboard(e.x, e.y, 0.6, col);
    });

    // Particles
    const now = performance.now();
    for (let i=particles.length-1;i>=0;i--) {
      const p = particles[i];
      const age = now - p.born;
      if (age > p.life) { particles.splice(i,1); continue; }
      drawBillboard(p.x, p.y, 0.2, p.color, 1 - age/p.life);
    }

    // Crosshair
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#e2e2e2';
    ctx.fillRect(W/2-5, H/2, 12, 2);
    ctx.fillRect(W/2, H/2-5, 2, 12);
    ctx.globalAlpha = 1;
  }

  function castRay(startX, startY, rayAngle) {
    // RAY CASTING USING STEP-BASED TRAVERSAL
    // This function casts a ray from the starting position in the given direction
    // until it hits a wall (maze cell value of 1) or reaches maximum distance

    // Calculate ray direction components using trigonometry
    const rayDirectionY = Math.sin(rayAngle); // Y component of unit direction vector
    const rayDirectionX = Math.cos(rayAngle); // X component of unit direction vector

    // Initialize ray marching variables
    let currentDistanceFromStart = 0; // Distance traveled along the ray so far
    const rayMarchingStepSize = 0.02; // How far to advance the ray each iteration (smaller = more accurate)

    // Maximum number of steps to prevent infinite loops
    const maxStepsToTake = RC.maxDepth / rayMarchingStepSize;

    // Step along the ray until we hit a wall or reach maximum distance
    for (let stepCount = 0; stepCount < maxStepsToTake; stepCount++) {
      // Calculate current ray position by advancing from start position
      const currentRayX = startX + rayDirectionX * currentDistanceFromStart;
      const currentRayY = startY + rayDirectionY * currentDistanceFromStart;

      // Check what type of maze cell we're currently in
      const mazeCell = maze.cellAt(currentRayX, currentRayY);

      // If we hit a wall (cell value 1), return hit information
      if (mazeCell === 1) {
        return {
          dist: currentDistanceFromStart,    // Distance from ray start to wall
          nx: currentRayX,                   // X coordinate where ray hit the wall
          ny: currentRayY                    // Y coordinate where ray hit the wall
        };
      }

      // Move ray forward by one step
      currentDistanceFromStart += rayMarchingStepSize;
    }

    // Ray didn't hit any walls within maximum distance
    return null;
  }

  function drawBillboard(worldX, worldY, objectSize, objectColor, transparency = 1) {
    // BILLBOARD SPRITE RENDERING
    // This function renders 3D-looking sprites (enemies, items, etc.) that always face the player
    // Uses perspective projection to make objects appear smaller when farther away

    // DISTANCE AND DIRECTION CALCULATION
    // Calculate vector from player to object in world coordinates
    const deltaX = worldX - player.x;
    const deltaY = worldY - player.y;

    // Calculate straight-line distance from player to object
    const distanceToObject = Math.hypot(deltaX, deltaY);

    // Calculate angle from player's forward direction to the object
    const angleFromPlayerToObject = Math.atan2(deltaY, deltaX) - player.a;

    // VISIBILITY CULLING
    // Check if object is behind the player (outside field of view)
    const isObjectBehindPlayer = Math.cos(angleFromPlayerToObject) <= 0;
    if (isObjectBehindPlayer) return; // Don't render objects behind the player

    // WALL OCCLUSION CHECK
    // Cast a ray to see if there's a wall between player and object
    // Skip this check for the exit door (let it show through walls for gameplay)
    if (objectColor !== exitDoorColor) {
      const wallHitBetweenPlayerAndObject = castRay(player.x, player.y, angleFromPlayerToObject + player.a);

      // If ray hits a wall closer than the object, the object is occluded
      if (wallHitBetweenPlayerAndObject && wallHitBetweenPlayerAndObject.dist < distanceToObject) {
        return; // Object is hidden behind a wall, don't render
      }
    }

    // PERSPECTIVE PROJECTION CALCULATIONS
    // Calculate apparent size on screen using perspective projection
    // Objects farther away appear smaller (size inversely proportional to distance)
    const projectedSizeOnScreen = (H / distanceToObject) * objectSize;

    // Calculate horizontal screen position using field of view projection
    // Convert angle to horizontal screen coordinate
    const screenPositionX = Math.tan(angleFromPlayerToObject) / Math.tan(RC.fov/2) * (W/2) + (W/2);

    // Objects appear at vertical center of screen (horizon line)
    const screenPositionY = H/2;

    // DISTANCE-BASED TRANSPARENCY
    // Calculate alpha based on distance - farther objects are more transparent
    // Minimum alpha of 0.3 ensures objects don't completely disappear
    const distanceBasedAlpha = transparency * Math.max(0.3, 1 - distanceToObject / RC.maxDepth);

    // SPRITE RENDERING
    ctx.globalAlpha = distanceBasedAlpha;
    ctx.fillStyle = objectColor;
    ctx.beginPath();

    // Choose shape based on object type
    if (objectColor !== exitDoorColor) {
      // Most objects are rendered as ellipses (enemies, power-ups, etc.)
      // Slightly taller than wide for better visibility
      ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 1.2, 0, 0, Math.PI * 2);
    } else {
      // Exit door is rendered as a rectangle to distinguish it from other objects
      ctx.rect(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 1.2);
    }

    ctx.fill();
    ctx.globalAlpha = 1; // Reset alpha for next drawing operations
  }

  // UI ammo bars
  function updateBars() {
    hud.bars.taser.style.transform = `scaleX(${defenses.taserAmmoRatio()})`;
    hud.bars.stun.style.transform = `scaleX(${defenses.stunAmmoRatio()})`;
    hud.bars.tranq.style.transform = `scaleX(${defenses.tranqAmmoRatio()})`;
  }
  setInterval(updateBars, 80);

  // Enemy->Player pushback particles
  enemies.onBoop = (x,y)=>{
    for (let i=0;i<6;i++) spawnParticle(x+(Math.random()-0.5)*0.2, y+(Math.random()-0.5)*0.2, '#fcd34d', 300);
    speak('Boop!');
    audio.beep('sine', 360, 0.05, 0.05);
  };

  defenses.onFire = (x,y,color)=>{
    for (let i=0;i<8;i++) spawnParticle(x, y, color, 350);
  };

  // Start screen until Enter
  // Pre-warm controls to avoid initial stutter
  player.reset(maze);
  enemies.reset(maze);
  updateBars();
}

