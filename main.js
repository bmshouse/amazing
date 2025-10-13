// main.js - bootstraps the game and runs the loop
import { Maze } from './modules/maze.js';
import { PlayerController } from './modules/player.js';
import { Defenses } from './modules/defenses.js';
import { EnemyController } from './modules/enemies.js';
import { generateWallTexture, generateBrickTexture, generateDoorTexture } from './textures/wall-texture.js';
import { RaycastRenderer } from './modules/RaycastRenderer.js';
import { SpriteRenderer } from './modules/SpriteRenderer.js';
import { Model3DRenderer } from './modules/rendering/Model3DRenderer.js';
import { GameState } from './modules/GameState.js';
import { EventManager } from './modules/EventManager.js';
import { ProjectileSystem } from './modules/ProjectileSystem.js';
import { GameConfig } from './modules/GameConfig.js';
import { DifficultyConfig } from './modules/DifficultyConfig.js';
import { I18nManager } from './modules/I18nManager.js';
import { ShareManager } from './modules/ShareManager.js';
import { TouchHUD } from './modules/ui/TouchHUD.js';
import { logger } from './modules/Logger.js';

export function bootstrap({ dev=false } = {}) {
  // ═══════════════════════════════════════════════════════════════
  // I18N INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  const i18n = new I18nManager();
  logger.debug('I18nManager created');

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
    targetTimeDisplay: document.getElementById('targetTimeDisplay'),
    targetTime: document.getElementById('targetTime'),
    sensitivity: document.getElementById('sensitivity'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    audioToggle: document.getElementById('audioToggle'),
    rendering3DToggle: document.getElementById('rendering3DToggle'),
    subtitles: document.getElementById('subtitles'),
    tutorial: document.getElementById('tutorial'),
    victoryPanel: document.getElementById('victoryPanel'),
    victoryTitle: document.getElementById('victoryTitle'),
    victoryMazeSize: document.getElementById('victoryMazeSize'),
    victoryTime: document.getElementById('victoryTime'),
    victoryTimeItem: document.getElementById('victoryTimeItem'),
    victoryTargetTime: document.getElementById('victoryTargetTime'),
    victoryTargetTimeItem: document.getElementById('victoryTargetTimeItem'),
    victoryDifficulty: document.getElementById('victoryDifficulty'),
    victoryCta: document.getElementById('victoryCta'),
    victoryShareButton: document.getElementById('victoryShareButton'),
    victoryRestartButton: document.getElementById('victoryRestartButton'),
    restartButton: document.getElementById('restartButton'),
    configButton: document.getElementById('configButton'),
    fullscreenButton: document.getElementById('fullscreenButton'),
    configPanel: document.getElementById('configPanel'),
    languageSelect: document.getElementById('languageSelect'),
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
  // SHARING SYSTEM INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  logger.debug('Creating ShareManager');
  const shareManager = new ShareManager(i18n);
  logger.info('ShareManager created successfully');

  // Add basic test functions immediately (outside of i18n promise)
  window.testShare = () => {
    logger.info('Manual share test triggered');
    if (!shareManager) {
      logger.error('ShareManager not available');
      return;
    }
    logger.debug('ShareManager available, testing...');
    // Add more test logic here
  };

  window.checkShareSystem = () => {
    logger.info('Checking share system status');
    logger.debug('ShareManager:', shareManager ? 'Available' : 'Not available');
    logger.debug('Share button element:', document.getElementById('shareButton') ? 'Found' : 'Not found');
    logger.debug('Share panel element:', document.getElementById('sharePanel') ? 'Found' : 'Not found');
  };

  // Initialize i18n system
  logger.debug('Starting i18n initialization');
  i18n.init().then(() => {
    logger.info('I18n initialized with language: ' + i18n.getCurrentLanguage());
    hud.languageSelect.value = i18n.getCurrentLanguage();
    i18n.updateDOM(); // Update all data-i18n elements
    updateDifficultyUI(); // Initial update with translations

    // Set initial config button tooltip
    hud.configButton.title = i18n.t('ui.common.settings');

    // Set up share manager callbacks BEFORE initializing
    shareManager.onPlayAgain = () => {
      restart();
    };

    // Set up callback to close config panel from ShareManager
    shareManager.onCloseConfigPanel = () => {
      closeConfigPanel();
    };

    // Set up challenge loaded callback BEFORE ShareManager initializes
    // This needs to be set first so it's available during initialize()
    shareManager.getChallengeManager().onChallengeLoaded = (challengeData) => {
      // Show the challenge banner (normally done by ShareManager)
      shareManager.showChallengeBanner(challengeData);
      // Load the challenge data
      loadChallengeData(challengeData);
    };

    // Initialize sharing system after i18n is ready
    logger.debug('Initializing ShareManager');
    shareManager.initialize();

    // Debug function - expose to global scope for testing
    window.testShare = () => {
      logger.info('Manual share test triggered');
      const testGameData = {
        maze: maze,
        enemies: enemies,
        config: {
          difficultyPreset: currentDifficulty.name,
          enemyCount: enemies.entities.length, // Use actual enemy count from game state
          enemySpeed: currentDifficulty.enemies.speed,
          devices: {
            taserCharges: defenses.devices.taser.maxCharges, // Use actual starting charges from game state
            stunCharges: defenses.devices.stun.maxCharges, // Use actual starting charges from game state
            tranqCharges: defenses.devices.tranq.maxCharges // Use actual starting charges from game state
          }
        },
        completionTime: 120000, // 2 minutes test time
        playerName: 'TestPlayer'
      };
      shareManager.prepareShare(testGameData);
    };

    // Debug function to manually trigger win condition
    window.triggerWin = () => {
      logger.info('Manual win triggered');
      gameState.updateElapsed();
      const completionTime = gameState.state.elapsed;
      gameState.winGame();

      const gameData = {
        maze: maze,
        enemies: enemies,
        config: {
          difficultyPreset: currentDifficulty.name,
          enemyCount: enemies.entities.length, // Use actual enemy count from game state
          enemySpeed: currentDifficulty.enemies.speed,
          devices: {
            taserCharges: defenses.devices.taser.maxCharges, // Use actual starting charges from game state
            stunCharges: defenses.devices.stun.maxCharges, // Use actual starting charges from game state
            tranqCharges: defenses.devices.tranq.maxCharges // Use actual starting charges from game state
          }
        },
        completionTime: completionTime,
        playerName: 'TestPlayer'
      };
      shareManager.prepareShare(gameData);
    };
  }).catch(error => {
    console.error('Failed to initialize i18n:', error);
  });

  // ═══════════════════════════════════════════════════════════════
  // CANVAS AND RENDERING SETUP
  // ═══════════════════════════════════════════════════════════════
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = GameConfig.RENDERING.INTERNAL_WIDTH, H = GameConfig.RENDERING.INTERNAL_HEIGHT;

  // Get WebGL canvas for 3D rendering (declare early for resize function)
  const webglCanvas = document.getElementById('webgl-canvas');
  let model3DRenderer = null; // Declare early, initialize later

  // Get UI canvas for particles and crosshair (z-index: 2, above 3D models)
  const uiCanvas = document.getElementById('ui-canvas');
  const uiCtx = uiCanvas ? uiCanvas.getContext('2d') : null;

  // Detect WebGL capability without creating a context
  function detectWebGLSupport() {
    if (!webglCanvas) {
      logger.warn('WebGL canvas not found in DOM');
      return false;
    }

    // Create a temporary canvas for testing to avoid conflicts
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        logger.warn('WebGL not supported by this browser');
        return false;
      }
      logger.info('WebGL support detected');
      return true;
    } catch (e) {
      logger.error('Error detecting WebGL support:', e);
      return false;
    }
  }

  // Check WebGL support and disable 3D if needed
  if (GameConfig.RENDERING.USE_3D_MODELS && !detectWebGLSupport()) {
    logger.warn('Disabling 3D models - WebGL not available');
    GameConfig.RENDERING.USE_3D_MODELS = false;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(GameConfig.RENDERING.MIN_WIDTH, Math.floor(rect.width / 2)) | 0;
    H = Math.max(GameConfig.RENDERING.MIN_HEIGHT, Math.floor(rect.height / 2)) | 0;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Resize WebGL canvas to match (both buffer size and display size)
    if (webglCanvas) {
      webglCanvas.width = W * DPR;
      webglCanvas.height = H * DPR;
      // Also set CSS size to match the display canvas
      webglCanvas.style.width = rect.width + 'px';
      webglCanvas.style.height = rect.height + 'px';

      if (model3DRenderer) {
        model3DRenderer.resize(W, H);
      }
    }

    // Resize UI canvas to match (both buffer size and display size)
    if (uiCanvas) {
      uiCanvas.width = W * DPR;
      uiCanvas.height = H * DPR;
      uiCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // Also set CSS size to match the display canvas
      uiCanvas.style.width = rect.width + 'px';
      uiCanvas.style.height = rect.height + 'px';
    }
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
  const uiRenderer = uiCanvas ? new SpriteRenderer(uiCanvas) : null;

  // Initialize 3D model renderer if WebGL is available and 3D is enabled
  if (webglCanvas && GameConfig.RENDERING.USE_3D_MODELS) {
    model3DRenderer = new Model3DRenderer(webglCanvas, W, H);
    logger.info('Model3DRenderer created, initializing Three.js...');

    // Initialize asynchronously (doesn't block game start)
    model3DRenderer.initialize().then(async (success) => {
      if (success) {
        logger.info('Model3DRenderer initialized successfully');
        await model3DRenderer.loadAllEnemyModels();
        logger.info('3D enemy models loaded');
      } else {
        logger.warn('Model3DRenderer failed to initialize, using 2D sprites only');
        GameConfig.RENDERING.USE_3D_MODELS = false;
        model3DRenderer = null;
      }
    }).catch(error => {
      logger.error('Failed to initialize Model3DRenderer:', error);
      GameConfig.RENDERING.USE_3D_MODELS = false;
      model3DRenderer = null;
    });
  } else if (!webglCanvas) {
    logger.warn('WebGL canvas not found, 3D rendering disabled');
  } else {
    logger.info('3D rendering disabled (WebGL not supported or disabled in config)');
  }

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

  // Initialize TouchHUD for touch devices
  const touchHUD = new TouchHUD(defenses, eventManager, GameConfig);
  logger.info('TouchHUD initialized');

  // ═════════════════════════════════════════════════════════════════
  // TOUCH DEVICE TUTORIAL SETUP
  // ═════════════════════════════════════════════════════════════════
  const isTouchDevice = touchHUD.shouldShowTouchControls();
  if (isTouchDevice) {
    // Hide desktop instructions and show touch instructions
    const desktopInstructions = document.getElementById('desktopInstructions');
    const touchInstructions = document.getElementById('touchInstructions');
    const desktopStartPrompt = hud.tutorial.querySelector('[data-i18n="ui.tutorial.start_prompt"]');
    const touchStartControls = document.getElementById('touchStartControls');
    const touchStartButton = document.getElementById('touchStartButton');

    if (desktopInstructions) desktopInstructions.style.display = 'none';
    if (touchInstructions) touchInstructions.style.display = '';
    if (desktopStartPrompt) desktopStartPrompt.style.display = 'none';
    if (touchStartControls) touchStartControls.style.display = '';

    // Add touch start button handler
    if (touchStartButton) {
      touchStartButton.addEventListener('click', () => {
        startGame();
      });
    }

    // Move charges display below timer for touch devices
    const chargesElement = document.querySelector('.hud-group.charges');
    const topRow = document.querySelector('#hud .row.top');
    const timerElement = topRow?.querySelector('.hud-group:first-child');

    if (chargesElement && topRow && timerElement) {
      // Create a wrapper for timer and charges to stack them vertically
      const leftGroup = document.createElement('div');
      leftGroup.style.display = 'flex';
      leftGroup.style.flexDirection = 'column';
      leftGroup.style.gap = '8px';
      leftGroup.style.alignItems = 'flex-start';

      // Replace timer with the wrapper, then add timer and charges inside
      timerElement.parentNode.insertBefore(leftGroup, timerElement);
      leftGroup.appendChild(timerElement);
      leftGroup.appendChild(chargesElement);

      // Make charges wider and more usable on touch
      chargesElement.style.minWidth = '280px';
      chargesElement.style.maxWidth = '360px';
      chargesElement.style.width = 'auto';
      chargesElement.style.fontSize = '12px';

      logger.info('Moved charges display below timer for touch device');
    }

    logger.info('Touch device detected - showing touch tutorial');
  }

  // ═════════════════════════════════════════════════════════════════
  // CONFIGURATION PANEL SETUP
  // ═════════════════════════════════════════════════════════════════
  let configPanelOpen = false;

  function toggleConfigPanel() {
    configPanelOpen = !configPanelOpen;
    if (configPanelOpen) {
      // Close challenge panel if open
      if (shareManager) {
        shareManager.hideChallengePanel();
      }
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
  // VICTORY PANEL BUTTON HANDLERS
  // ═════════════════════════════════════════════════════════════════
  // Victory share button
  if (hud.victoryShareButton) {
    hud.victoryShareButton.addEventListener('click', () => {
      if (shareManager && shareManager.currentGameData) {
        shareManager.openSharePanel();
        document.exitPointerLock();
      }
    });
  }

  // Victory restart button
  if (hud.victoryRestartButton) {
    hud.victoryRestartButton.addEventListener('click', () => {
      restart(true); // Auto-start after clicking restart button
    });
  }

  // In-game restart button (for touch devices)
  if (hud.restartButton) {
    hud.restartButton.addEventListener('click', () => {
      restart(); // Show tutorial before restarting
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // FULLSCREEN FUNCTIONALITY
  // ═════════════════════════════════════════════════════════════════

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
  }

  function updateFullscreenIcon() {
    const icon = document.getElementById('fullscreenIcon');
    if (isFullscreen()) {
      // Exit fullscreen icon (four corners pointing inward)
      icon.setAttribute('d', 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z');
      hud.fullscreenButton.title = 'Exit Fullscreen';
    } else {
      // Enter fullscreen icon (four corners pointing outward)
      icon.setAttribute('d', 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
      hud.fullscreenButton.title = 'Toggle Fullscreen';
    }
  }

  function toggleFullscreen() {
    if (isFullscreen()) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      // Enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    }
  }

  // Fullscreen button click handler
  if (hud.fullscreenButton) {
    hud.fullscreenButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Listen for fullscreen changes to update icon
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
  document.addEventListener('msfullscreenchange', updateFullscreenIcon);

  // ═════════════════════════════════════════════════════════════════
  // DIFFICULTY CONFIGURATION UI SETUP
  // ═════════════════════════════════════════════════════════════════

  function updateDifficultyUI() {
    // Update difficulty rating and estimated time
    hud.difficultyRating.textContent = i18n.t('game.difficulty.rating', { rating: difficultyConfig.getDifficultyRating() });
    hud.estimatedTime.textContent = i18n.t('game.difficulty.estimated_time', { minutes: difficultyConfig.getEstimatedTime() });

    // Update maze settings
    hud.mazeSize.value = currentDifficulty.maze.size;
    hud.mazeSizeValue.textContent = i18n.t('config.maze.size_value', { size: currentDifficulty.maze.size });
    hud.rechargePads.value = currentDifficulty.maze.rechargePads;
    hud.rechargePadsValue.textContent = currentDifficulty.maze.rechargePads;

    // Update enemy settings
    hud.enemyCount.value = currentDifficulty.enemies.count;
    hud.enemyCountValue.textContent = currentDifficulty.enemies.count;
    hud.enemySpeed.value = currentDifficulty.enemies.speedMultiplier;
    const speedKey = `config.enemies.speed_values.${currentDifficulty.enemies.speedMultiplier}`;
    hud.enemySpeedValue.textContent = i18n.getTranslation(speedKey) !== `[${speedKey}]` ?
      i18n.t(speedKey) : i18n.t('game.difficulty.fallback.custom');

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

  // Difficulty UI will be initialized in i18n.init() promise

  // ═════════════════════════════════════════════════════════════════
  // EVENT HANDLERS SETUP
  // ═════════════════════════════════════════════════════════════════
  hud.sensitivity.addEventListener('input', (e)=>{
    const value = parseFloat(e.target.value);
    player.sensitivity = value;
    hud.sensitivityValue.textContent = value.toFixed(1);
    saveUserSettings();
  });

  // Initialize sensitivity display
  hud.sensitivityValue.textContent = hud.sensitivity.value;

  // ═════════════════════════════════════════════════════════════════
  // SETTINGS PERSISTENCE (localStorage)
  // ═════════════════════════════════════════════════════════════════
  function loadUserSettings() {
    try {
      // Load 3D rendering preference
      const saved3DRendering = localStorage.getItem('calmmaze_use3d');
      if (saved3DRendering !== null) {
        const use3D = saved3DRendering === 'true';
        GameConfig.RENDERING.USE_3D_MODELS = use3D;
        logger.debug('Loaded 3D rendering preference:', use3D);
      }

      // Load audio preference
      const savedAudio = localStorage.getItem('calmmaze_audio');
      if (savedAudio !== null) {
        hud.audioToggle.checked = savedAudio === 'true';
        logger.debug('Loaded audio preference:', hud.audioToggle.checked);
      }

      // Load sensitivity preference
      const savedSensitivity = localStorage.getItem('calmmaze_sensitivity');
      if (savedSensitivity !== null) {
        const sensitivity = parseFloat(savedSensitivity);
        if (!isNaN(sensitivity)) {
          hud.sensitivity.value = sensitivity;
          player.sensitivity = sensitivity;
          hud.sensitivityValue.textContent = sensitivity.toFixed(1);
          logger.debug('Loaded sensitivity preference:', sensitivity);
        }
      }
    } catch (e) {
      logger.warn('Could not load user settings from localStorage:', e);
    }
  }

  function saveUserSettings() {
    try {
      localStorage.setItem('calmmaze_use3d', GameConfig.RENDERING.USE_3D_MODELS.toString());
      localStorage.setItem('calmmaze_audio', hud.audioToggle.checked.toString());
      localStorage.setItem('calmmaze_sensitivity', hud.sensitivity.value);
    } catch (e) {
      logger.warn('Could not save user settings to localStorage:', e);
    }
  }

  // Load settings on startup
  loadUserSettings();

  // 3D Rendering toggle event handler
  if (hud.rendering3DToggle) {
    // Initialize toggle state from config (after loading from localStorage)
    hud.rendering3DToggle.checked = GameConfig.RENDERING.USE_3D_MODELS;

    hud.rendering3DToggle.addEventListener('change', (e) => {
      GameConfig.RENDERING.USE_3D_MODELS = e.target.checked;
      logger.info(`3D rendering ${e.target.checked ? 'enabled' : 'disabled'} by user`);

      // Save preference
      saveUserSettings();

      // If enabling 3D and renderer isn't initialized yet, initialize it
      if (e.target.checked && !model3DRenderer && webglCanvas) {
        model3DRenderer = new Model3DRenderer(webglCanvas, W, H);
        model3DRenderer.initialize().then(async (success) => {
          if (success) {
            await model3DRenderer.loadAllEnemyModels();
            logger.info('3D models enabled and loaded');
          } else {
            logger.warn('Failed to enable 3D rendering');
            GameConfig.RENDERING.USE_3D_MODELS = false;
            hud.rendering3DToggle.checked = false;
            saveUserSettings();
          }
        }).catch(error => {
          logger.error('Error enabling 3D rendering:', error);
          GameConfig.RENDERING.USE_3D_MODELS = false;
          hud.rendering3DToggle.checked = false;
          saveUserSettings();
        });
      }
    });
  }

  // Save audio preference when changed
  hud.audioToggle.addEventListener('change', () => {
    saveUserSettings();
  });

  // Language selector event handler
  hud.languageSelect.addEventListener('change', async (e) => {
    const selectedLanguage = e.target.value;
    await i18n.setLanguage(selectedLanguage);

    // Small delay to ensure DOM is ready, then force update all translations
    setTimeout(() => {
      i18n.updateDOM();
      updateDifficultyUI(); // Refresh dynamic text

      // Update tutorial header if currently visible
      const tutorialHeader = hud.tutorial.querySelector('h2');
      if (tutorialHeader && !gameState.isWon()) {
        tutorialHeader.textContent = i18n.t('ui.tutorial.welcome');
      }

      // Update config button tooltip
      hud.configButton.title = i18n.t('ui.common.settings');

      logger.debug('Language changed to:', selectedLanguage, 'DOM updated');
    }, 10);
  });

  // Language selector will be initialized in i18n.init() promise

  eventManager.on('keydown', (data)=>{
    if (data.code === 'Escape') closeConfigPanel();
    if (data.code === 'Enter') {
      if (gameState.isWon()) {
        restart(true); // Auto-start after victory
      } else if (!gameState.isStarted()) {
        startGame();
      }
    }
    if (data.code === 'KeyR') restart();
    if (data.code === 'KeyS' && gameState.isWon()) {
      // Open share panel and unlock pointer
      if (shareManager && shareManager.currentGameData) {
        shareManager.openSharePanel();
        document.exitPointerLock();
      }
    }
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
        speak(i18n.t('game.messages.device_disabled'));
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
    hud.restartButton.style.display = 'block';
    audio.beep('sine', GameConfig.AUDIO.FREQ_GAME_START, 0.1, 0.06);

    // Emit gamestart event for TouchHUD and other systems
    eventManager.emit('gamestart');
  }

  function restart(autoStart = false) {
    // Check if we're in challenge mode
    if (shareManager.isInChallengeMode()) {
      const challengeData = shareManager.getCurrentChallenge();
      if (challengeData) {
        loadChallengeData(challengeData);
        return;
      }
    }

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

    // Hide victory panel and share button
    hud.victoryPanel.style.display = 'none';
    shareManager.hideShareButton();

    if (autoStart) {
      // Auto-start the game immediately
      gameState.restartGame();
      hud.tutorial.style.display = 'none';
      hud.restartButton.style.display = 'block';
      audio.beep('sine', GameConfig.AUDIO.FREQ_GAME_START, 0.1, 0.06);
    } else {
      // Show tutorial and wait for Enter to start
      gameState.resetForRestart();
      hud.tutorial.style.display = '';
      hud.restartButton.style.display = 'none';
      hud.timer.textContent = gameState.getFormattedTime(); // Reset timer display immediately
      hud.tutorial.querySelector('h2').textContent = i18n.t('game.messages.ready_again');
      speak(i18n.t('game.messages.restarted'));
      audio.beep('sine', GameConfig.AUDIO.FREQ_RESTART, 0.07, 0.06);

      // Hide touch controls when showing tutorial
      eventManager.emit('gameend');
    }
  }

  function loadChallengeData(challengeData) {
    try {
      // Generate maze from challenge data
      const challengeResult = shareManager.getChallengeManager().generateMazeFromChallenge(challengeData);

      // Update maze and configuration
      maze = challengeResult.maze;
      currentDifficulty = {
        ...difficultyConfig.getConfig(), // Start with current defaults
        name: challengeResult.config.difficultyPreset,
        enemies: {
          count: challengeResult.config.enemyCount,
          speed: challengeResult.config.enemySpeed,
          speedMultiplier: challengeResult.config.enemySpeed / GameConfig.ENEMIES.SPEED
        },
        devices: {
          disruptor: { charges: challengeResult.config.devices.taserCharges },
          immobilizer: { charges: challengeResult.config.devices.stunCharges },
          pacifier: { charges: challengeResult.config.devices.tranqCharges }
        }
      };

      // Reset game entities with challenge settings
      player.reset(maze);
      enemies.reset(maze);

      // Set enemy spawn positions from challenge data
      if (challengeResult.enemySpawns && challengeResult.enemySpawns.length > 0) {
        challengeResult.enemySpawns.forEach((spawn, index) => {
          if (index < enemies.entities.length) {
            enemies.entities[index].x = spawn.x;
            enemies.entities[index].y = spawn.y;
          }
        });
      }

      applyDifficultyToEnemies();
      defenses.reset();
      applyDifficultyToDevices();
      projectileSystem.clear();
      gameState.resetForRestart();

      // Update UI for challenge mode
      hud.victoryPanel.style.display = 'none';
      shareManager.hideShareButton();
      hud.tutorial.style.display = '';
      hud.tutorial.querySelector('h2').textContent = i18n.t('game.messages.ready_again');

      // Show target time in HUD if challenge has a completion time
      if (challengeData.challenge && challengeData.challenge.completionTime) {
        hud.targetTimeDisplay.style.display = '';
        hud.targetTime.textContent = fmtTime(challengeData.challenge.completionTime);
      }

      speak(i18n.t('game.messages.restarted'));
      audio.beep('sine', GameConfig.AUDIO.FREQ_RESTART, 0.07, 0.06);

      logger.info('Challenge loaded successfully:', shareManager.getChallengeManager().getCurrentChallengeSummary());
    } catch (error) {
      logger.error('Failed to load challenge:', error);
      shareManager.showError(i18n.t('ui.errors.challenge_load_failed'));

      // Fall back to normal restart
      restart();
    }
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
    hud.subtitles.style.display = ''; // Show the subtitles container
    clearTimeout(speak._t);
    speak._t = setTimeout(()=>{
      hud.subtitles.textContent='';
      hud.subtitles.style.display = 'none'; // Hide the empty container
    }, 1200);
  }

  // ═════════════════════════════════════════════════════════════════
  // DEVELOPMENT MODE TESTING
  // ═════════════════════════════════════════════════════════════════
  if (gameState.isDev()) {
    const t0 = performance.now();
    const testMaze = new Maze(31,31); testMaze.generate();
    const genTime = performance.now() - t0;
    logger.debug('[SMOKE] Maze gen ms:', genTime.toFixed(2));
    if (genTime > GameConfig.PERFORMANCE.MAX_MAZE_GEN_TIME) logger.warn('Maze gen too slow!');
    if (!testMaze.exit) logger.error('Exit missing!');
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
  // PERFORMANCE MONITORING FOR 3D AUTO-DETECTION
  // ═════════════════════════════════════════════════════════════════
  let fpsHistory = [];
  let frameCount = 0;
  let fpsCheckInterval = 0;
  const FPS_CHECK_INTERVAL = 5000; // Check FPS every 5 seconds
  const FPS_HISTORY_SIZE = 10; // Keep last 10 samples

  function updateFPS(deltaTime) {
    frameCount++;
    fpsCheckInterval += deltaTime;

    if (fpsCheckInterval >= FPS_CHECK_INTERVAL) {
      const averageFPS = (frameCount / fpsCheckInterval) * 1000;
      fpsHistory.push(averageFPS);

      // Keep only recent history
      if (fpsHistory.length > FPS_HISTORY_SIZE) {
        fpsHistory.shift();
      }

      // Check if we should disable 3D models due to low FPS
      if (GameConfig.RENDERING.AUTO_DETECT_3D_CAPABILITY &&
          GameConfig.RENDERING.USE_3D_MODELS &&
          fpsHistory.length >= 3) {

        const recentAverageFPS = fpsHistory.reduce((a, b) => a + b) / fpsHistory.length;

        if (recentAverageFPS < GameConfig.RENDERING.MIN_FPS_FOR_3D) {
          logger.warn(`Auto-disabling 3D models due to low FPS: ${recentAverageFPS.toFixed(1)} < ${GameConfig.RENDERING.MIN_FPS_FOR_3D}`);
          GameConfig.RENDERING.USE_3D_MODELS = false;
          speak(i18n.t('game.messages.performance_mode') || 'Performance mode enabled');
        }
      }

      // Reset counters
      frameCount = 0;
      fpsCheckInterval = 0;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // MAIN GAME LOOP
  // ═════════════════════════════════════════════════════════════════
  let last = performance.now();
  let loopId = null;
  function loop(now) {
    loopId = window.requestAnimationFrame(loop);
    const dt = Math.min(GameConfig.PERFORMANCE.MAX_FRAME_TIME, now - last);
    last = now;

    // Update FPS monitoring
    updateFPS(dt);

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
          // Update elapsed time before winning
          gameState.updateElapsed();
          const completionTime = gameState.state.elapsed;

          gameState.winGame();

          // Emit gameend event for TouchHUD and other systems
          eventManager.emit('gameend');

          // Hide tutorial and show victory panel
          hud.tutorial.style.display = 'none';
          hud.victoryPanel.style.display = '';

          // Build victory message with details
          const mazeSize = `${maze.w}x${maze.h}`;
          const formattedTime = fmtTime(completionTime);
          const difficultyName = currentDifficulty.name || currentDifficulty.preset || i18n.t('game.difficulty.fallback.normal');

          // Update victory panel with game stats
          hud.victoryMazeSize.textContent = mazeSize;
          hud.victoryTime.textContent = formattedTime;
          hud.victoryDifficulty.textContent = difficultyName;

          // Check if in challenge mode and handle comparison
          const inChallengeMode = shareManager.isInChallengeMode();
          if (inChallengeMode) {
            const challengeData = shareManager.getCurrentChallenge();
            const targetTime = challengeData?.challenge?.completionTime;

            if (targetTime) {
              // Show target time
              hud.victoryTargetTimeItem.style.display = '';
              hud.victoryTargetTime.textContent = fmtTime(targetTime);

              // Calculate time difference
              const timeDiff = completionTime - targetTime;
              const timeDiffAbs = Math.abs(timeDiff);
              const beatTarget = timeDiff < 0; // Negative means faster
              const isClose = timeDiffAbs < 5000; // Within 5 seconds

              // Format time difference
              const diffSeconds = Math.abs(Math.floor(timeDiffAbs / 1000));
              const diffText = diffSeconds === 1
                ? i18n.t('ui.challenge.time_diff_second', { seconds: diffSeconds })
                : i18n.t('ui.challenge.time_diff_seconds', { seconds: diffSeconds });

              // Update victory message based on performance
              if (beatTarget) {
                // Beat the target!
                hud.victoryTitle.textContent = i18n.t('game.messages.victory_beat_record_title');
                hud.victoryCta.innerHTML = i18n.t('game.messages.victory_beat_record', {
                  diff: diffText
                });
                hud.victoryTimeItem.classList.add('stat-beat-target');
                hud.victoryShareButton.querySelector('span').textContent = i18n.t('ui.challenge.share_victory');
              } else if (isClose) {
                // Close but didn't beat
                hud.victoryTitle.textContent = i18n.t('game.messages.victory_close_title');
                hud.victoryCta.innerHTML = i18n.t('game.messages.victory_close', {
                  diff: diffText
                });
                hud.victoryTimeItem.classList.add('stat-close');
              } else {
                // Didn't beat, not close
                hud.victoryTitle.textContent = i18n.t('game.messages.victory_title');
                hud.victoryCta.innerHTML = i18n.t('game.messages.victory_missed', {
                  diff: diffText
                });
              }

              // Change button text to "Try Again" for challenge mode
              hud.victoryRestartButton.querySelector('span').textContent = i18n.t('ui.common.try_again');
            }
          } else {
            // Normal mode - hide target time, reset classes
            hud.victoryTargetTimeItem.style.display = 'none';
            hud.victoryTimeItem.classList.remove('stat-beat-target', 'stat-close');
            hud.victoryTitle.textContent = i18n.t('game.messages.victory_title');
            hud.victoryCta.innerHTML = i18n.t('game.messages.victory_cta');
            hud.victoryShareButton.querySelector('span').textContent = i18n.t('ui.share.share_challenge');
            hud.victoryRestartButton.querySelector('span').textContent = i18n.t('ui.common.play_again');
          }

          speak(i18n.t('game.messages.found_exit'));
          audio.beep('triangle', GameConfig.AUDIO.FREQ_WIN, 0.12, 0.07);

          // Prepare sharing data
          const gameData = {
            maze: maze,
            enemies: enemies,
            config: {
              difficultyPreset: currentDifficulty.preset || currentDifficulty.name || i18n.t('game.difficulty.fallback.normal'),
              enemyCount: enemies.entities.length, // Use actual enemy count from game state
              enemySpeed: currentDifficulty.enemies.speed,
              devices: {
                taserCharges: defenses.devices.taser.maxCharges, // Use actual starting charges from game state
                stunCharges: defenses.devices.stun.maxCharges, // Use actual starting charges from game state
                tranqCharges: defenses.devices.tranq.maxCharges // Use actual starting charges from game state
              }
            },
            completionTime: completionTime,
            playerName: 'Player' // Could be enhanced with actual player name input
          };

          logger.info('Win detected! Preparing share data');
          logger.debug('Game completion data', { completionTime, mazeSize: `${maze.w}x${maze.h}` });

          // Prepare sharing
          shareManager.prepareShare(gameData);
        }
      }
    }
    render();
  }
  loopId = window.requestAnimationFrame(loop);

  // ═════════════════════════════════════════════════════════════════
  // RENDERING FUNCTIONS
  // ═════════════════════════════════════════════════════════════════
  function render() {
    // Render walls using raycast renderer (2D canvas layer)
    raycastRenderer.render(player, maze, W, H);

    // Check if 3D models are enabled and renderer is ready
    const use3D = GameConfig.RENDERING.USE_3D_MODELS && model3DRenderer && model3DRenderer.enabled && model3DRenderer.modelsLoaded;

    if (use3D && uiRenderer) {
      // Sync 3D camera with player position
      model3DRenderer.syncCamera(player);

      // Update enemy 3D models (LOD selection and state)
      model3DRenderer.updateEnemies(enemies.entities, player, 0, maze);

      // Render 3D enemies (WebGL canvas layer)
      model3DRenderer.render();

      // Render sprites without enemies on base canvas (exit door, recharge pads)
      spriteRenderer.renderSprites(player, maze, { entities: [] }, [], W, H, colors);

      // Clear UI canvas before rendering
      uiCtx.clearRect(0, 0, W, H);

      // Render particles and crosshair on UI canvas (z-index: 2, above 3D models)
      uiRenderer.renderParticles(particles, player, W, H);
      uiRenderer.renderCrosshair(W, H);
    } else {
      // Fallback to 2D sprite rendering for everything
      spriteRenderer.renderSprites(player, maze, enemies, particles, W, H, colors);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // HUD AND UI UPDATES
  // ═════════════════════════════════════════════════════════════════
  function updateBars() {
    hud.bars.taser.style.transform = `scaleX(${defenses.taserChargeRatio()})`;
    hud.bars.stun.style.transform = `scaleX(${defenses.stunChargeRatio()})`;
    hud.bars.tranq.style.transform = `scaleX(${defenses.tranqChargeRatio()})`;
  }
  const barsIntervalId = setInterval(updateBars, GameConfig.PERFORMANCE.AMMO_BAR_UPDATE_INTERVAL);

  // ═════════════════════════════════════════════════════════════════
  // GAME EVENT CALLBACKS
  // ═════════════════════════════════════════════════════════════════
  enemies.onBoop = (x,y)=>{
    for (let i=0;i<GameConfig.PARTICLES.SPAWN_COUNT_ON_BOOP;i++) {
      spawnParticle(x+(Math.random()-0.5)*0.2, y+(Math.random()-0.5)*0.2, GameConfig.COLORS.PARTICLE_BOOP, 300);
    }
    speak(i18n.t('game.messages.boop'));
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
  applyDifficultyToEnemies();
  applyDifficultyToDevices();
  updateBars();

  // Return cleanup function for tests
  return function cleanup() {
    if (loopId !== null) {
      window.cancelAnimationFrame(loopId);
      loopId = null;
    }
    if (barsIntervalId) {
      clearInterval(barsIntervalId);
    }
    if (touchHUD) {
      touchHUD.destroy();
    }
    if (model3DRenderer) {
      model3DRenderer.destroy();
    }
  };
}

