// modules/GameConfig.js - Centralized configuration for game constants
export const GameConfig = {
  // Rendering constants
  RENDERING: {
    INTERNAL_WIDTH: 960,
    INTERNAL_HEIGHT: 540,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 180,
    FOV: Math.PI / 3, // 60 degrees
    MAX_RENDER_DEPTH: 24,
    COLUMN_STEP: 1,
    FIXED_TEXTURE_SCALE: 64,

    // Raycasting settings
    RAY_MARCHING_STEP_SIZE: 0.02,
    MIN_WALL_DISTANCE: 0.1,
    WALL_DETECTION_THRESHOLD: 0.01,

    // Lighting and shading
    SHADING_OPACITY: 0.7,
    SHADING_RED_BASE: 60,
    SHADING_RED_FACTOR: 80,
    SHADING_GREEN_BASE: 140,
    SHADING_GREEN_FACTOR: 40,
    SHADING_BLUE_BASE: 200,
    SHADING_BLUE_FACTOR: 20,

    // Sprite rendering
    EXIT_DOOR_SIZE: 0.6,
    RECHARGE_PAD_SIZE: 0.4,
    ENEMY_SIZE: 0.6,
    PARTICLE_SIZE: 0.05,
    BILLBOARD_HEIGHT_MULTIPLIER: 1.2,


    // Crosshair
    CROSSHAIR_OPACITY: 0.9,
    CROSSHAIR_SIZE: 12,
    CROSSHAIR_THICKNESS: 2,
    CROSSHAIR_OFFSET: 5
  },

  // Player constants
  PLAYER: {
    START_X: 1.5,
    START_Y: 1.5,
    START_ANGLE: 0,
    SPEED: 2.4,
    SPRINT_MULTIPLIER: 1.4,
    TURN_SPEED: 2.4,
    DEFAULT_SENSITIVITY: 0.5,
    COLLISION_RADIUS: 0.3
  },

  // Enemy constants
  ENEMIES: {
    COUNT: 10,
    SPEED: 1.3,
    MIN_SPAWN_DISTANCE: 5,
    CHASE_DISTANCE: 6,
    COLLISION_DISTANCE: 0.6,
    PUSHBACK_FORCE: 0.4,
    WANDER_JITTER: 0.2,

    // State durations (ms)
    STUNNED_DURATION: 1500,
    SLOWED_DURATION: 2500,
    TRANQ_DURATION: 3000
  },

  // Device constants
  DEVICES: {
    TASER: {
      MAX_CHARGES: 8,
      COOLDOWN: 250,
      RANGE: 1.6,
      EFFECT_DURATION: 1500
    },
    STUN: {
      MAX_CHARGES: 6,
      COOLDOWN: 600,
      PROJECTILE_SPEED: 3.2,
      PROJECTILE_RADIUS: 0.08,
      EFFECT_DURATION: 2500,
      SLOWDOWN_FACTOR: 0.35
    },
    TRANQ: {
      MAX_CHARGES: 4,
      COOLDOWN: 750,
      PROJECTILE_SPEED: 5.0,
      PROJECTILE_RADIUS: 0.05,
      EFFECT_DURATION: 3000
    }
  },

  // Maze generation constants
  MAZE: {
    DEFAULT_SIZE: 21, // Must be odd for perfect maze
    MIN_SIZE: 11,
    MAX_SIZE: 51,

    // Recharge pad settings
    RECHARGE_PAD_COUNT: 3,
    MIN_DISTANCE_FROM_START: 6,
    MIN_DISTANCE_FROM_EXIT: 6,
    RECHARGE_PAD_RADIUS: 0.8,

    // Cell types
    CELL_WALL: 1,
    CELL_OPEN: 0,
    CELL_EXIT_DOOR: 2
  },

  // Particle system constants
  PARTICLES: {
    MAX_PARTICLES: 200,
    DEFAULT_LIFE: 400,
    SPAWN_COUNT_ON_HIT: 8,
    SPAWN_COUNT_ON_BOOP: 6,
    DEFAULT_RADIUS_MIN: 0.02,
    DEFAULT_RADIUS_MAX: 0.05
  },

  // Audio constants
  AUDIO: {
    DEFAULT_VOLUME: 0.05,
    BEEP_DURATION: 0.08,

    // Frequencies for different actions
    FREQ_TASER_HIT: 720,
    FREQ_TASER_MISS: 520,
    FREQ_STUN: 600,
    FREQ_TRANQ: 420,
    FREQ_WEAPON_SELECT: 660,
    FREQ_GAME_START: 520,
    FREQ_RESTART: 480,
    FREQ_WIN: 740,
    FREQ_BOOP: 360
  },

  // Color constants
  COLORS: {
    EXIT_DOOR: '#a8f8abff',
    RECHARGE_PAD: '#2b1bbdff',
    ENTITY_STUNNED: '#ffd166',
    ENTITY_TRANQ: '#a29bfe',
    ENTITY_SLOWED: '#00d1ff',
    ENTITY: '#f0134aff',

    // Weapon effect colors
    TASER: '#ffd166',
    STUN: '#00d1ff',
    TRANQ: '#a29bfe',

    // Particle colors
    PARTICLE_BOOP: '#fcd34d',
    PARTICLE_DEFAULT: '#9be7ff',

    // UI colors
    CROSSHAIR: '#e2e2e2',

    // Background colors
    BACKGROUND: '#0b0e1d',
    SKY_TOP: '#1c2050',
    SKY_BOTTOM: '#2a2f4a',
    FLOOR_TOP: '#111728',
    FLOOR_BOTTOM: '#0b0e1d'
  },

  // Performance constants
  PERFORMANCE: {
    TARGET_FPS: 60,
    MAX_FRAME_TIME: 50, // ms
    RAYCAST_STEP_SIZE: 0.02,

    // Smoke test thresholds
    MAX_MAZE_GEN_TIME: 200, // ms

    // Update intervals
    AMMO_BAR_UPDATE_INTERVAL: 80 // ms
  },

  // Game balance constants
  BALANCE: {
    WIN_DISTANCE_TO_EXIT: 0.7,
    MAX_PROJECTILE_LIFETIME: 10000, // ms
    SPRITE_MIN_ALPHA: 0.3,
  }
};

// Utility functions for accessing config values
export const getDeviceConfig = (deviceType) => {
  return GameConfig.DEVICES[deviceType.toUpperCase()];
};

export const getColor = (colorName) => {
  return GameConfig.COLORS[colorName.toUpperCase()];
};

export const getRenderingConfig = () => {
  return GameConfig.RENDERING;
};

export const getPlayerConfig = () => {
  return GameConfig.PLAYER;
};

export const getEnemyConfig = () => {
  return GameConfig.ENEMIES;
};

export const getMazeConfig = () => {
  return GameConfig.MAZE;
};