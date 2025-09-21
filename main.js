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
    // Clear
    ctx.fillStyle = '#0b0e1d';
    ctx.fillRect(0,0,W,H);
    // Sky / floor gradient (colorblind-safe hues)
    const sky = ctx.createLinearGradient(0,0,0,H/2);
    sky.addColorStop(0,'#1c2050');
    sky.addColorStop(1,'#2a2f4a');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H/2);
    const floor = ctx.createLinearGradient(0,H/2,0,H);
    floor.addColorStop(0,'#111728');
    floor.addColorStop(1,'#0b0e1d');
    ctx.fillStyle = floor; ctx.fillRect(0,H/2,W,H/2);

    // Rays
    const angleStep = RC.fov / W;
    let rayAngle = player.a - RC.fov/2;
    for (let x=0; x<W; x+=RC.columnStep, rayAngle+=angleStep*RC.columnStep) {
      const hit = castRay(player.x, player.y, rayAngle);
      if (hit) {
        const dist = hit.dist * Math.cos(rayAngle - player.a); // de-fish-eye
        const clampedDist = Math.max(0.1, dist); // Prevent texture distortion when very close to walls
        const h = Math.min(H, (H / clampedDist)|0);
        const y0 = ((H - h) / 2)|0;
        const shade = Math.max(0, 1 - clampedDist/RC.maxDepth);

        // Choose texture based on wall position (checkerboard pattern)
        const texture = ((Math.floor(hit.nx) + Math.floor(hit.ny)) % 2 === 0) ? wallTexture : brickTexture;

        // Calculate texture coordinates that are fixed to world position
        // Determine which side of the wall we hit for proper texture mapping
        let wallU; // texture coordinate along the wall surface
        if (Math.abs(hit.nx - Math.floor(hit.nx + 0.5)) < 0.01) {
          // Hit vertical wall (north/south facing)
          wallU = hit.ny % 1;
        } else {
          // Hit horizontal wall (east/west facing)
          wallU = hit.nx % 1;
        }

        // Map wall position to texture coordinate - this stays fixed as player moves
        const textureX = Math.floor(wallU * texture.width) % texture.width;

        // Calculate vertical texture coordinate based on screen position
        // Use a fixed texture scale so textures don't change size with distance
        const textureScale = 64; // Fixed scale - adjust to make textures larger/smaller
        const wallHeightInTexels = h / textureScale;
        const textureV = 0; // Start from top of texture

        const textureY = Math.floor(textureV * texture.height) % texture.height;
        const textureW = 1; // Sample 1 pixel width
        const textureH = Math.min(texture.height, Math.ceil(wallHeightInTexels));

        // Draw textured wall column
        ctx.save();
        ctx.globalAlpha = 1;

        ctx.drawImage(
          texture,
          textureX, textureY, textureW, textureH, // source
          x, y0, RC.columnStep, h // destination
        );

        // Apply distance-based shading overlay
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${(60+80*shade)|0}, ${(140+40*shade)|0}, ${(200+20*shade)|0}, 0.7)`;
        ctx.fillRect(x, y0, RC.columnStep, h);
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

  function castRay(x, y, angle) {
    // DDA grid traversal
    const sin = Math.sin(angle), cos = Math.cos(angle);
    let dist = 0;
    const step = 0.02;
    for (let i=0; i<RC.maxDepth/step; i++) {
      const nx = x + cos * dist;
      const ny = y + sin * dist;
      const cell = maze.cellAt(nx, ny);
      if (cell===1) return { dist, nx, ny };
      dist += step;
    }
    return null;
  }

  function drawBillboard(wx, wy, size, color, alpha=1) {
    // Project to screen
    const dx = wx - player.x, dy = wy - player.y;
    const dist = Math.hypot(dx, dy);
    const angleTo = Math.atan2(dy, dx) - player.a;
    const behind = Math.cos(angleTo) <= 0;
    if (behind) return;
    // Check if the object is behind a wall using raycasting, but only for pads and entities
    if (color !== exitDoorColor) { // Exit color, skip check for exit
      const hit = castRay(player.x, player.y, angleTo + player.a);
      if (hit && hit.dist < dist) return; // Wall is closer than the object, don't render
    }
    const proj = (H / dist) * size;
    const sx = Math.tan(angleTo) / Math.tan(RC.fov/2) * (W/2) + (W/2);
    const sy = H/2;
    ctx.globalAlpha = alpha * Math.max(0.3, 1 - dist/RC.maxDepth);
    ctx.fillStyle = color;
    ctx.beginPath();
    if (color !== exitDoorColor) {
      ctx.ellipse(sx, sy, proj, proj*1.2, 0, 0, Math.PI*2);
    } else {
      ctx.rect(sx, sy, proj, proj*1.2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
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
