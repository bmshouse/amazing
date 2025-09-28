// modules/DifficultyConfig.js - Centralized difficulty configuration management
import { GameConfig } from './GameConfig.js';

export class DifficultyConfig {
  constructor() {
    this.config = this.getDefaultConfig();
    this.presets = this.getPresets();
    this.loadFromStorage();
  }

  getDefaultConfig() {
    return {
      preset: 'normal',
      maze: {
        size: GameConfig.MAZE.DEFAULT_SIZE,
        rechargePads: GameConfig.MAZE.RECHARGE_PAD_COUNT
      },
      enemies: {
        count: GameConfig.ENEMIES.COUNT,
        speedMultiplier: 1.0
      },
      devices: {
        disruptor: {
          enabled: true,
          charges: GameConfig.DEVICES.TASER.MAX_CHARGES
        },
        immobilizer: {
          enabled: true,
          charges: GameConfig.DEVICES.STUN.MAX_CHARGES
        },
        pacifier: {
          enabled: true,
          charges: GameConfig.DEVICES.TRANQ.MAX_CHARGES
        }
      },
      advanced: {
        timerEnabled: true,
        timerDuration: 600000, // 10 minutes
        rechargeMode: 'instant'
      }
    };
  }

  getPresets() {
    return {
      easy: {
        name: 'Easy',
        description: 'Relaxed pace with generous resources',
        maze: { size: 15, rechargePads: 4 },
        enemies: { count: 5, speedMultiplier: 0.8 },
        devices: {
          disruptor: { enabled: true, charges: 12 },
          immobilizer: { enabled: true, charges: 9 },
          pacifier: { enabled: true, charges: 6 }
        },
        advanced: { timerEnabled: false, timerDuration: 0, rechargeMode: 'instant' }
      },
      normal: {
        name: 'Normal',
        description: 'Balanced challenge for most players',
        maze: { size: 21, rechargePads: 3 },
        enemies: { count: 10, speedMultiplier: 1.0 },
        devices: {
          disruptor: { enabled: true, charges: 8 },
          immobilizer: { enabled: true, charges: 6 },
          pacifier: { enabled: true, charges: 4 }
        },
        advanced: { timerEnabled: true, timerDuration: 600000, rechargeMode: 'instant' }
      },
      hard: {
        name: 'Hard',
        description: 'Challenging maze with limited resources',
        maze: { size: 31, rechargePads: 2 },
        enemies: { count: 15, speedMultiplier: 1.2 },
        devices: {
          disruptor: { enabled: true, charges: 6 },
          immobilizer: { enabled: true, charges: 4 },
          pacifier: { enabled: true, charges: 2 }
        },
        advanced: { timerEnabled: true, timerDuration: 480000, rechargeMode: 'instant' }
      },
      teensafe: {
        name: 'Teen-Safe',
        description: 'Minimal challenge, quick completion',
        maze: { size: 13, rechargePads: 5 },
        enemies: { count: 3, speedMultiplier: 0.6 },
        devices: {
          disruptor: { enabled: true, charges: 15 },
          immobilizer: { enabled: true, charges: 12 },
          pacifier: { enabled: true, charges: 10 }
        },
        advanced: { timerEnabled: false, timerDuration: 0, rechargeMode: 'instant' }
      },
      custom: {
        name: 'Custom',
        description: 'User-defined settings'
      }
    };
  }

  // Apply preset configuration
  applyPreset(presetName) {
    if (!this.presets[presetName]) return false;

    this.config.preset = presetName;
    if (presetName !== 'custom') {
      const preset = this.presets[presetName];
      this.config.maze = { ...preset.maze };
      this.config.enemies = { ...preset.enemies };
      this.config.devices = JSON.parse(JSON.stringify(preset.devices));
      this.config.advanced = { ...preset.advanced };
    }

    this.saveToStorage();
    return true;
  }

  // Update specific configuration values
  updateConfig(section, key, value) {
    if (!this.config[section]) return false;

    if (typeof key === 'object') {
      // Update multiple keys at once
      Object.assign(this.config[section], key);
    } else {
      this.config[section][key] = value;
    }

    // Switch to custom preset when manually changing values
    if (this.config.preset !== 'custom') {
      this.config.preset = 'custom';
    }

    this.saveToStorage();
    return true;
  }

  // Update device configuration
  updateDevice(deviceType, property, value) {
    if (!this.config.devices[deviceType]) return false;

    this.config.devices[deviceType][property] = value;
    if (this.config.preset !== 'custom') {
      this.config.preset = 'custom';
    }

    this.saveToStorage();
    return true;
  }

  // Get current configuration
  getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  // Get enabled devices list
  getEnabledDevices() {
    return Object.entries(this.config.devices)
      .filter(([_, device]) => device.enabled)
      .map(([type, _]) => type);
  }

  // Get difficulty estimation (0-10 scale)
  getDifficultyRating() {
    let rating = 5; // Start with normal baseline

    // Maze size impact (larger = harder)
    const sizeRatio = this.config.maze.size / 21;
    rating += (sizeRatio - 1) * 2;

    // Enemy count impact
    const enemyRatio = this.config.enemies.count / 10;
    rating += (enemyRatio - 1) * 1.5;

    // Enemy speed impact
    rating += (this.config.enemies.speedMultiplier - 1) * 2;

    // Device charges impact (fewer charges = harder)
    const totalCharges = Object.values(this.config.devices)
      .filter(d => d.enabled)
      .reduce((sum, d) => sum + d.charges, 0);
    const defaultCharges = 8 + 6 + 4; // Default total
    const chargeRatio = totalCharges / defaultCharges;
    rating -= (chargeRatio - 1) * 1.5;

    // Enabled devices impact (fewer = harder)
    const enabledCount = this.getEnabledDevices().length;
    if (enabledCount < 3) rating += (3 - enabledCount) * 1;

    // Recharge pads impact (fewer = harder)
    const padRatio = this.config.maze.rechargePads / 3;
    rating -= (padRatio - 1) * 1;

    // Timer impact
    if (!this.config.advanced.timerEnabled) rating -= 1;
    else if (this.config.advanced.timerDuration < 600000) rating += 1;

    return Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
  }

  // Get estimated completion time in minutes
  getEstimatedTime() {
    const baseTime = 8; // minutes for normal difficulty
    const sizeMultiplier = Math.pow(this.config.maze.size / 21, 1.5);
    const enemyMultiplier = 1 + (this.config.enemies.count - 10) * 0.05;
    const speedMultiplier = 1 + (this.config.enemies.speedMultiplier - 1) * 0.3;

    const totalMultiplier = sizeMultiplier * enemyMultiplier * speedMultiplier;
    const estimatedMinutes = baseTime * totalMultiplier;

    return Math.max(2, Math.min(30, Math.round(estimatedMinutes)));
  }

  // Validate configuration values
  validateConfig() {
    const errors = [];

    // Maze size must be odd and within range
    if (this.config.maze.size % 2 === 0) {
      this.config.maze.size += 1;
      errors.push('Maze size adjusted to odd number');
    }
    if (this.config.maze.size < 11) {
      this.config.maze.size = 11;
      errors.push('Maze size too small, set to minimum');
    }
    if (this.config.maze.size > 51) {
      this.config.maze.size = 51;
      errors.push('Maze size too large, set to maximum');
    }

    // Ensure at least one device is enabled
    const enabledDevices = this.getEnabledDevices();
    if (enabledDevices.length === 0) {
      this.config.devices.disruptor.enabled = true;
      errors.push('At least one device must be enabled');
    }

    // Validate numeric ranges
    this.config.maze.rechargePads = Math.max(1, Math.min(6, this.config.maze.rechargePads));
    this.config.enemies.count = Math.max(0, Math.min(25, this.config.enemies.count));
    this.config.enemies.speedMultiplier = Math.max(0.5, Math.min(2.0, this.config.enemies.speedMultiplier));

    // Validate device charges
    Object.values(this.config.devices).forEach(device => {
      device.charges = Math.max(1, Math.min(20, device.charges));
    });

    return errors;
  }

  // Save configuration to localStorage
  saveToStorage() {
    try {
      localStorage.setItem('calmmaze_difficulty', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Could not save difficulty config to localStorage:', e);
    }
  }

  // Load configuration from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('calmmaze_difficulty');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        // Merge with default config to handle new properties
        this.config = { ...this.getDefaultConfig(), ...parsedConfig };
        this.validateConfig();
      }
    } catch (e) {
      console.warn('Could not load difficulty config from localStorage:', e);
      this.config = this.getDefaultConfig();
    }
  }

  // Reset to default configuration
  reset() {
    this.config = this.getDefaultConfig();
    this.saveToStorage();
  }

  // Export configuration for sharing
  exportConfig() {
    return btoa(JSON.stringify(this.config));
  }

  // Import configuration from exported string
  importConfig(configString) {
    try {
      const imported = JSON.parse(atob(configString));
      this.config = { ...this.getDefaultConfig(), ...imported };
      this.config.preset = 'custom';
      this.validateConfig();
      this.saveToStorage();
      return true;
    } catch (e) {
      console.error('Invalid configuration string:', e);
      return false;
    }
  }
}