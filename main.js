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
import { DifficultyConfig } from './modules/DifficultyConfig.js';

export function bootstrap({ dev=false } = {}) {
  // ═══════════════════════════════════════════════════════════════
  // DIFFICULTY CONFIGURATION SETUP
  // ═══════════════════════════════════════════════════════════════
  const difficultyConfig = new DifficultyConfig();
  let currentDifficulty = difficultyConfig.getConfig();

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
    // Difficulty UI elements
    difficultyRating: document.getElementById('difficultyRating'),
    estimatedTime: document.getElementById('estimatedTime'),
    mazeSize: document.getElementById('mazeSize'),
    mazeSizeValue: document.getElementById('mazeSizeValue'),
    rechargePads: document.getElementById('rechargePads'),
    rechargePadsValue: document.getElementById('rechargePadsValue'),
    enemyCount: document.getElementById('enemyCount'),
    enemyCountValue: document.getElementById('enemyCountValue'),
    enemySpeed: document.getElementById('enemySpeed'),
    enemySpeedValue: document.getElementById('enemySpeedValue'),
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
  function createGameWorld() {
    const mazeSize = currentDifficulty.maze.size;
    const rechargePads = currentDifficulty.maze.rechargePads;
    let maze = new Maze(mazeSize, mazeSize, rechargePads);
    maze.generate();
    return maze;
  }

  let maze = createGameWorld();

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
  // DIFFICULTY CONFIGURATION UI SETUP
  // ═════════════════════════════════════════════════════════════════

  function updateDifficultyUI() {
    // Update difficulty rating and estimated time
    hud.difficultyRating.textContent = `Difficulty: ${difficultyConfig.getDifficultyRating()}/10`;
    hud.estimatedTime.textContent = `Est. Time: ${difficultyConfig.getEstimatedTime()} min`;

    // Update maze settings
    hud.mazeSize.value = currentDifficulty.maze.size;
    hud.mazeSizeValue.textContent = `${currentDifficulty.maze.size}x${currentDifficulty.maze.size}`;
    hud.rechargePads.value = currentDifficulty.maze.rechargePads;
    hud.rechargePadsValue.textContent = currentDifficulty.maze.rechargePads;

    // Update enemy settings
    hud.enemyCount.value = currentDifficulty.enemies.count;
    hud.enemyCountValue.textContent = currentDifficulty.enemies.count;
    hud.enemySpeed.value = currentDifficulty.enemies.speedMultiplier;
    const speedNames = { 0.5: 'Slow', 0.8: 'Easy', 1.0: 'Normal', 1.2: 'Fast', 1.5: 'Frantic', 2.0: 'Insane' };
    hud.enemySpeedValue.textContent = speedNames[currentDifficulty.enemies.speedMultiplier] || 'Custom';

    // Update device settings
    document.getElementById('enableDisruptor').checked = currentDifficulty.devices.disruptor.enabled;
    document.getElementById('disruptorCharges').value = currentDifficulty.devices.disruptor.charges;
    document.getElementById('disruptorChargesValue').textContent = currentDifficulty.devices.disruptor.charges;

    document.getElementById('enableImmobilizer').checked = currentDifficulty.devices.immobilizer.enabled;
    document.getElementById('immobilizerCharges').value = currentDifficulty.devices.immobilizer.charges;
    document.getElementById('immobilizerChargesValue').textContent = currentDifficulty.devices.immobilizer.charges;

    document.getElementById('enablePacifier').checked = currentDifficulty.devices.pacifier.enabled;
    document.getElementById('pacifierCharges').value = currentDifficulty.devices.pacifier.charges;
    document.getElementById('pacifierChargesValue').textContent = currentDifficulty.devices.pacifier.charges;

    // Update preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === currentDifficulty.preset);
    });
  }

  // Tab switching
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update tab buttons
      document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update tab content
      document.querySelectorAll('.config-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(targetTab + 'Tab').classList.add('active');
    });
  });

  // Preset selection
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      difficultyConfig.applyPreset(preset);
      currentDifficulty = difficultyConfig.getConfig();
      updateDifficultyUI();
    });
  });

  // Maze size slider
  hud.mazeSize.addEventListener('input', (e) => {
    let size = parseInt(e.target.value);
    if (size % 2 === 0) size += 1; // Ensure odd number
    difficultyConfig.updateConfig('maze', 'size', size);
    currentDifficulty = difficultyConfig.getConfig();
    updateDifficultyUI();
  });

  // Recharge pads slider
  hud.rechargePads.addEventListener('input', (e) => {
    const count = parseInt(e.target.value);
    difficultyConfig.updateConfig('maze', 'rechargePads', count);
    currentDifficulty = difficultyConfig.getConfig();
    updateDifficultyUI();
  });

  // Enemy count slider
  hud.enemyCount.addEventListener('input', (e) => {
    const count = parseInt(e.target.value);
    difficultyConfig.updateConfig('enemies', 'count', count);
    currentDifficulty = difficultyConfig.getConfig();
    updateDifficultyUI();
  });

  // Enemy speed slider
  hud.enemySpeed.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    difficultyConfig.updateConfig('enemies', 'speedMultiplier', speed);
    currentDifficulty = difficultyConfig.getConfig();
    updateDifficultyUI();
  });

  // Device toggles and charge sliders
  ['disruptor', 'immobilizer', 'pacifier'].forEach(deviceType => {
    const enableCheckbox = document.getElementById(`enable${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`);
    const chargeSlider = document.getElementById(`${deviceType}Charges`);

    enableCheckbox.addEventListener('change', (e) => {
      difficultyConfig.updateDevice(deviceType, 'enabled', e.target.checked);
      currentDifficulty = difficultyConfig.getConfig();
      updateDifficultyUI();
    });

    chargeSlider.addEventListener('input', (e) => {
      const charges = parseInt(e.target.value);
      difficultyConfig.updateDevice(deviceType, 'charges', charges);
      currentDifficulty = difficultyConfig.getConfig();
      updateDifficultyUI();
    });
  });

  // Reset and Apply buttons
  document.getElementById('resetDifficulty').addEventListener('click', () => {
    difficultyConfig.reset();
    currentDifficulty = difficultyConfig.getConfig();
    updateDifficultyUI();
  });

  document.getElementById('applyDifficulty').addEventListener('click', () => {
    // Apply changes and restart game
    restart();
    closeConfigPanel();
  });

  // Initialize difficulty UI
  updateDifficultyUI();

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
      const deviceMapping = { Digit1:'taser', Digit2:'stun', Digit3:'tranq' };
      const difficultyMapping = { taser: 'disruptor', stun: 'immobilizer', tranq: 'pacifier' };
      const requestedDevice = deviceMapping[data.code];
      const difficultyDevice = difficultyMapping[requestedDevice];

      // Check if device is enabled in current difficulty
      if (currentDifficulty.devices[difficultyDevice]?.enabled) {
        defenses.setMode(requestedDevice);
        speak(requestedDevice);
        audio.beep('square', GameConfig.AUDIO.FREQ_WEAPON_SELECT, 0.06, 0.04);
      } else {
        speak('Device disabled');
        audio.beep('triangle', 200, 0.05, 0.03);
      }
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
    // Apply current difficulty configuration
    currentDifficulty = difficultyConfig.getConfig();

    // Create new maze with difficulty settings
    maze = createGameWorld();

    // Reset game entities with difficulty settings
    player.reset(maze);
    enemies.reset(maze);
    applyDifficultyToEnemies();
    defenses.reset();
    applyDifficultyToDevices();
    projectileSystem.clear();
    gameState.resetForRestart();
    hud.tutorial.style.display = '';
    hud.tutorial.querySelector('h2').textContent = 'Ready to go again!';
    speak('Restarted! Press Enter to begin.');
    audio.beep('sine', GameConfig.AUDIO.FREQ_RESTART, 0.07, 0.06);
  }

  function applyDifficultyToEnemies() {
    // Adjust enemy count and speed
    const targetCount = currentDifficulty.enemies.count;
    const speedMultiplier = currentDifficulty.enemies.speedMultiplier;

    // Adjust enemy array to match target count
    while (enemies.entities.length > targetCount) {
      enemies.entities.pop();
    }

    // Apply speed multiplier to all enemies
    enemies.entities.forEach(enemy => {
      enemy.speed = GameConfig.ENEMIES.SPEED * speedMultiplier;
    });
  }

  function applyDifficultyToDevices() {
    // Update device charges and availability
    const deviceMapping = {
      disruptor: 'taser',
      immobilizer: 'stun',
      pacifier: 'tranq'
    };

    Object.entries(currentDifficulty.devices).forEach(([deviceType, config]) => {
      const gameDeviceType = deviceMapping[deviceType];
      if (defenses.devices[gameDeviceType]) {
        defenses.devices[gameDeviceType].maxCharges = config.charges;
        defenses.devices[gameDeviceType].charges = config.charges;

        // If device is disabled, ensure it can't be selected
        if (!config.enabled && defenses.currentDevice === gameDeviceType) {
          // Switch to first enabled device
          const enabledDevices = Object.entries(currentDifficulty.devices)
            .filter(([_, dev]) => dev.enabled)
            .map(([type, _]) => deviceMapping[type]);

          if (enabledDevices.length > 0) {
            defenses.setMode(enabledDevices[0]);
          }
        }
      }
    });
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

