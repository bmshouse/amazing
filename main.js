// main.js - bootstraps the game and runs the loop
import { Maze } from './modules/maze.js';
import { PlayerController } from './modules/player.js';
import { Defenses } from './modules/defenses.js';
import { EnemyController } from './modules/enemies.js';
import { generateWallTexture, generateBrickTexture, generateDoorTexture } from './textures/wall-texture.js';
import { RaycastRenderer } from './modules/RaycastRenderer.js';
import { SpriteRenderer } from './modules/SpriteRenderer.js';
import { GameState } from './modules/GameState.js';
import { EventManager } from './modules/EventManager.js';
import { ProjectileSystem } from './modules/ProjectileSystem.js';
import { GameConfig } from './modules/GameConfig.js';

export function bootstrap({ dev=false } = {}) {
  // ═══════════════════════════════════════════════════════════════
  // DOM ELEMENT SETUP
  // ═══════════════════════════════════════════════════════════════
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hud = {
    timer: document.getElementById('timer'),
    sensitivity: document.getElementById('sensitivity'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    audioToggle: document.getElementById('audioToggle'),
    subtitles: document.getElementById('subtitles'),
    tutorial: document.getElementById('tutorial'),
    configButton: document.getElementById('configButton'),
    configPanel: document.getElementById('configPanel'),
    bars: {
      taser: document.querySelector('#charges-taser span'),
      stun: document.querySelector('#charges-stun span'),
      tranq: document.querySelector('#charges-tranq span'),
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // CORE SYSTEMS INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  const gameState = new GameState();
  const eventManager = new EventManager();
  gameState.initialize({ dev });

  // ═══════════════════════════════════════════════════════════════
  // CANVAS AND RENDERING SETUP
  // ═══════════════════════════════════════════════════════════════
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = GameConfig.RENDERING.INTERNAL_WIDTH, H = GameConfig.RENDERING.INTERNAL_HEIGHT;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(GameConfig.RENDERING.MIN_WIDTH, Math.floor(rect.width / 2)) | 0;
    H = Math.max(GameConfig.RENDERING.MIN_HEIGHT, Math.floor(rect.height / 2)) | 0;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  eventManager.on('resize', resize);
  resize();

  // ═════════════════════════════════════════════════════════════════
  // AUDIO SYSTEM SETUP
  // ═════════════════════════════════════════════════════════════════
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

  // ═════════════════════════════════════════════════════════════════
  // GAME WORLD INITIALIZATION
  // ═════════════════════════════════════════════════════════════════
  const mazeSize = GameConfig.MAZE.DEFAULT_SIZE;
  let maze = new Maze(mazeSize, mazeSize);
  maze.generate();

  // Generate wall textures
  const textures = {
    wall: generateWallTexture(64, 64),
    brick: generateBrickTexture(64, 64),
    door: generateDoorTexture(64, 64)
  };

  // Set entity colors from config
  const colors = {
    exitDoor: GameConfig.COLORS.EXIT_DOOR,
    rechargePad: GameConfig.COLORS.RECHARGE_PAD,
    entityStunned: GameConfig.COLORS.ENTITY_STUNNED,
    entityTranq: GameConfig.COLORS.ENTITY_TRANQ,
    entitySlowed: GameConfig.COLORS.ENTITY_SLOWED,
    entity: GameConfig.COLORS.ENTITY
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDERING SYSTEM INITIALIZATION
  // ═════════════════════════════════════════════════════════════════
  const raycastRenderer = new RaycastRenderer(canvas, textures);
  const spriteRenderer = new SpriteRenderer(canvas);

  // ═════════════════════════════════════════════════════════════════
  // GAME ENTITY INITIALIZATION
  // ═════════════════════════════════════════════════════════════════
  const player = new PlayerController(maze);
  const enemies = new EnemyController(maze, player);
  const projectileSystem = new ProjectileSystem(maze, enemies);
  const defenses = new Defenses(player, enemies, audio, hud);
  defenses.setProjectileSystem(projectileSystem);

  // Inject EventManager into player and defenses
  player.setEventManager(eventManager);
  defenses.setEventManager(eventManager);

  // ═════════════════════════════════════════════════════════════════
  // CONFIGURATION PANEL SETUP
  // ═════════════════════════════════════════════════════════════════
  let configPanelOpen = false;

  function toggleConfigPanel() {
    configPanelOpen = !configPanelOpen;
    if (configPanelOpen) {
      hud.configPanel.style.display = 'block';
      setTimeout(() => hud.configPanel.classList.add('show'), 10);
    } else {
      hud.configPanel.classList.remove('show');
      setTimeout(() => hud.configPanel.style.display = 'none', 300);
    }
  }

  function closeConfigPanel() {
    if (configPanelOpen) {
      configPanelOpen = false;
      hud.configPanel.classList.remove('show');
      setTimeout(() => hud.configPanel.style.display = 'none', 300);
    }
  }

  // Config button click handler
  hud.configButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleConfigPanel();
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (configPanelOpen && !hud.configPanel.contains(e.target) && e.target !== hud.configButton) {
      closeConfigPanel();
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // EVENT HANDLERS SETUP
  // ═════════════════════════════════════════════════════════════════
  hud.sensitivity.addEventListener('input', (e)=>{
    const value = parseFloat(e.target.value);
    player.sensitivity = value;
    hud.sensitivityValue.textContent = value.toFixed(1);
  });

  // Initialize sensitivity display
  hud.sensitivityValue.textContent = hud.sensitivity.value;

  eventManager.on('keydown', (data)=>{
    if (data.code === 'Escape') closeConfigPanel();
    if (data.code === 'Enter' && !gameState.isStarted()) startGame();
    if (data.code === 'KeyR') restart();
    if (['Digit1','Digit2','Digit3'].includes(data.code)) {
      const m = { Digit1:'taser', Digit2:'stun', Digit3:'tranq' }[data.code];
      defenses.setMode(m);
      speak(m);
      audio.beep('square', GameConfig.AUDIO.FREQ_WEAPON_SELECT, 0.06, 0.04);
    }
  });

  // Pointer lock setup
  canvas.addEventListener('click', ()=>{
    if (!gameState.isStarted()) return;
    eventManager.requestPointerLock(canvas);
  });

  eventManager.on('pointerlockchange', (data)=>{
    player.pointerLocked = data.locked;
  });

  // Mouse movement is now handled directly in player.update()

  // ═════════════════════════════════════════════════════════════════
  // GAME CONTROL FUNCTIONS
  // ═════════════════════════════════════════════════════════════════
  function startGame() {
    gameState.startGame();
    hud.tutorial.style.display = 'none';
    audio.beep('sine', GameConfig.AUDIO.FREQ_GAME_START, 0.1, 0.06);
  }

  function restart() {
    maze = new Maze(mazeSize, mazeSize);
    maze.generate();
    player.reset(maze);
    enemies.reset(maze);
    defenses.reset();
    projectileSystem.clear();
    gameState.resetForRestart();
    hud.tutorial.style.display = '';
    hud.tutorial.querySelector('h2').textContent = 'Ready to go again!';
    speak('Restarted! Press Enter to begin.');
    audio.beep('sine', GameConfig.AUDIO.FREQ_RESTART, 0.07, 0.06);
  }

  // ═════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═════════════════════════════════════════════════════════════════
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

  // ═════════════════════════════════════════════════════════════════
  // DEVELOPMENT MODE TESTING
  // ═════════════════════════════════════════════════════════════════
  if (gameState.isDev()) {
    const t0 = performance.now();
    const testMaze = new Maze(31,31); testMaze.generate();
    const genTime = performance.now() - t0;
    console.log('[SMOKE] Maze gen ms:', genTime.toFixed(2));
    if (genTime > GameConfig.PERFORMANCE.MAX_MAZE_GEN_TIME) console.warn('Maze gen too slow!');
    if (!testMaze.exit) console.error('Exit missing!');
  }

  // ═════════════════════════════════════════════════════════════════
  // PARTICLE SYSTEM
  // ═════════════════════════════════════════════════════════════════
  const particles = [];

  function spawnParticle(x, y, color = GameConfig.COLORS.PARTICLE_DEFAULT, life = GameConfig.PARTICLES.DEFAULT_LIFE) {
    if (particles.length > GameConfig.PARTICLES.MAX_PARTICLES) return;
    particles.push({
      x, y,
      r: GameConfig.PARTICLES.DEFAULT_RADIUS_MIN + Math.random() * (GameConfig.PARTICLES.DEFAULT_RADIUS_MAX - GameConfig.PARTICLES.DEFAULT_RADIUS_MIN),
      life,
      color,
      born: performance.now()
    });
  }


  // ═════════════════════════════════════════════════════════════════
  // MAIN GAME LOOP
  // ═════════════════════════════════════════════════════════════════
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(GameConfig.PERFORMANCE.MAX_FRAME_TIME, now - last);
    last = now;

    if (gameState.isStarted()) {
      gameState.updateElapsed();
      hud.timer.textContent = gameState.getFormattedTime();

      player.update(dt, { maze, eventManager });
      enemies.update(dt, maze);
      defenses.update(dt);
      projectileSystem.update(dt);

      // Check win condition
      if (!gameState.isWon() && maze.exit) {
        const exitWallX = maze.exit.wallX;
        const exitWallY = maze.exit.wallY;
        const distanceToExitWall = Math.hypot(player.x - (exitWallX + 0.5), player.y - (exitWallY + 0.5));

        if (distanceToExitWall < GameConfig.BALANCE.WIN_DISTANCE_TO_EXIT) {
          gameState.winGame();
          hud.tutorial.style.display = '';
          hud.tutorial.querySelector('h2').textContent = 'You found the exit! 🎉';
          speak('Great job! Press Enter to play again.');
          audio.beep('triangle', GameConfig.AUDIO.FREQ_WIN, 0.12, 0.07);
        }
      }
    }
    render();
  }
  requestAnimationFrame(loop);

  // ═════════════════════════════════════════════════════════════════
  // RENDERING FUNCTIONS
  // ═════════════════════════════════════════════════════════════════
  function render() {
    // Render walls using raycast renderer
    raycastRenderer.render(player, maze, W, H);

    // Render sprites using sprite renderer
    spriteRenderer.renderSprites(player, maze, enemies, particles, W, H, colors);
  }

  // ═════════════════════════════════════════════════════════════════
  // HUD AND UI UPDATES
  // ═════════════════════════════════════════════════════════════════
  function updateBars() {
    hud.bars.taser.style.transform = `scaleX(${defenses.taserChargeRatio()})`;
    hud.bars.stun.style.transform = `scaleX(${defenses.stunChargeRatio()})`;
    hud.bars.tranq.style.transform = `scaleX(${defenses.tranqChargeRatio()})`;
  }
  setInterval(updateBars, GameConfig.PERFORMANCE.AMMO_BAR_UPDATE_INTERVAL);

  // ═════════════════════════════════════════════════════════════════
  // GAME EVENT CALLBACKS
  // ═════════════════════════════════════════════════════════════════
  enemies.onBoop = (x,y)=>{
    for (let i=0;i<GameConfig.PARTICLES.SPAWN_COUNT_ON_BOOP;i++) {
      spawnParticle(x+(Math.random()-0.5)*0.2, y+(Math.random()-0.5)*0.2, GameConfig.COLORS.PARTICLE_BOOP, 300);
    }
    speak('Boop!');
    audio.beep('sine', GameConfig.AUDIO.FREQ_BOOP, 0.05, 0.05);
  };

  defenses.onActivation = (x,y,color)=>{
    for (let i=0;i<GameConfig.PARTICLES.SPAWN_COUNT_ON_HIT;i++) spawnParticle(x, y, color, 350);
  };

  projectileSystem.setHitCallback((x,y,color)=>{
    for (let i=0;i<GameConfig.PARTICLES.SPAWN_COUNT_ON_HIT;i++) spawnParticle(x, y, color, 350);
  });

  // ═════════════════════════════════════════════════════════════════
  // GAME INITIALIZATION FINALIZATION
  // ═════════════════════════════════════════════════════════════════
  // Pre-warm controls to avoid initial stutter
  player.reset(maze);
  enemies.reset(maze);
  updateBars();
}

