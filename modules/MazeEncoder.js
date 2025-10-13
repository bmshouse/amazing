// modules/MazeEncoder.js - Maze serialization and URL encoding for sharing
import { GameConfig } from './GameConfig.js';
import { logger } from './Logger.js';

export class MazeEncoder {
  constructor() {
    this.version = 1; // For future compatibility
  }

  /**
   * Generate a deterministic seed from maze configuration
   * @param {Object} config - Maze configuration (must include timestamp for uniqueness)
   * @returns {number} Deterministic seed
   */
  generateSeed(config) {
    // Create a simple hash from configuration parameters including timestamp
    // The timestamp ensures each maze is unique while remaining reproducible from the same data
    const str = `${config.size}-${config.rechargePadCount}-${config.enemyCount}-${config.enemySpeed}-${config.timestamp}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Serialize current game state into a compact object
   * @param {Object} gameData - Current game state
   * @returns {Object} Serialized game data
   */
  serializeGameState(gameData) {
    const {
      maze,
      enemies,
      config,
      completionTime = null,
      playerName = 'Anonymous'
    } = gameData;

    // Generate timestamp for this challenge (ensures unique seed)
    const timestamp = Date.now();

    // Generate deterministic seed for maze recreation
    const mazeConfig = {
      size: maze.w,
      rechargePadCount: maze.rechargePadCount,
      enemyCount: enemies?.entities?.length || GameConfig.ENEMIES.COUNT,
      enemySpeed: config?.enemySpeed || GameConfig.ENEMIES.SPEED,
      timestamp: timestamp
    };

    const seed = this.generateSeed(mazeConfig);

    // Serialize maze grid using run-length encoding for compactness
    // Grid is flattened row by row: [0,0,1,1,1,0,...] -> "2,0,3,1,1,0,..."
    const gridData = this.encodeMazeGrid(maze.grid);

    // Serialize recharge pad positions
    const rechargePads = maze.pads.map(pad => ({
      x: pad.x,
      y: pad.y
    }));

    // Serialize enemy spawn positions (deterministic from seed)
    const enemySpawns = enemies?.entities?.map(enemy => ({
      x: Math.round(enemy.x * 10) / 10, // Round to 1 decimal place
      y: Math.round(enemy.y * 10) / 10
    })) || [];

    // Device configuration
    const deviceConfig = {
      taserCharges: config?.devices?.taser?.charges || GameConfig.DEVICES.TASER.MAX_CHARGES,
      stunCharges: config?.devices?.stun?.charges || GameConfig.DEVICES.STUN.MAX_CHARGES,
      tranqCharges: config?.devices?.tranq?.charges || GameConfig.DEVICES.TRANQ.MAX_CHARGES
    };

    return {
      version: this.version,
      timestamp: timestamp,
      seed,
      maze: {
        size: maze.w,
        rechargePadCount: maze.rechargePadCount,
        grid: gridData,
        exit: {
          x: maze.exit.x,
          y: maze.exit.y,
          wallX: maze.exit.wallX,
          wallY: maze.exit.wallY
        },
        pads: rechargePads
      },
      enemies: {
        count: enemySpawns.length,
        speed: config?.enemySpeed || GameConfig.ENEMIES.SPEED,
        spawns: enemySpawns
      },
      devices: deviceConfig,
      challenge: {
        createdBy: playerName,
        completionTime,
        difficulty: config?.difficultyPreset || 'normal'
      }
    };
  }

  /**
   * Compress and encode serialized data for URL
   * @param {Object} serializedData - Serialized game state
   * @returns {string} Base64 encoded string
   */
  encodeForURL(serializedData) {
    try {
      const jsonString = JSON.stringify(serializedData);

      // Simple compression: remove unnecessary whitespace and common patterns
      const compressed = jsonString
        .replace(/\s+/g, '')
        .replace(/"x":/g, '"x":')
        .replace(/"y":/g, '"y":');

      // Convert to base64
      const encoded = btoa(unescape(encodeURIComponent(compressed)));

      logger.info(`Encoded maze data: ${jsonString.length} chars -> ${encoded.length} chars`);
      return encoded;
    } catch (error) {
      logger.error('Failed to encode maze data:', error);
      throw new Error('Failed to encode maze data for sharing');
    }
  }

  /**
   * Decode URL parameter back to game state
   * @param {string} encodedData - Base64 encoded maze data
   * @returns {Object} Deserialized game state
   */
  decodeFromURL(encodedData) {
    try {
      // Decode from base64
      const decompressed = decodeURIComponent(escape(atob(encodedData)));
      const gameState = JSON.parse(decompressed);

      // Validate version compatibility
      if (!gameState.version || gameState.version > this.version) {
        throw new Error('Incompatible challenge version');
      }

      logger.info('Successfully decoded shared maze challenge');
      return gameState;
    } catch (error) {
      logger.error('Failed to decode maze data:', error);
      throw new Error('Invalid challenge URL - unable to decode maze data');
    }
  }

  /**
   * Generate a complete shareable URL
   * @param {Object} gameData - Current game state
   * @param {string} baseURL - Base game URL (optional)
   * @returns {string} Complete shareable URL
   */
  generateShareableURL(gameData, baseURL = null) {
    const serialized = this.serializeGameState(gameData);
    const encoded = this.encodeForURL(serialized);

    // Use current page URL as base if not provided
    const base = baseURL || window.location.href.split('#')[0];

    return `${base}#/challenge/${encoded}`;
  }

  /**
   * Parse challenge URL and extract encoded data
   * @param {string} url - Complete challenge URL
   * @returns {string|null} Encoded challenge data or null if invalid
   */
  parseShareableURL(url = null) {
    const targetURL = url || window.location.href;
    const match = targetURL.match(/#\/challenge\/([A-Za-z0-9+/=]+)/);

    if (!match || !match[1]) {
      return null;
    }

    return match[1];
  }

  /**
   * Validate that a decoded game state has all required fields
   * @param {Object} gameState - Decoded game state
   * @returns {boolean} True if valid
   */
  validateGameState(gameState) {
    try {
      // Check required top-level fields
      if (!gameState.version || !gameState.seed || !gameState.maze || !gameState.enemies) {
        return false;
      }

      // Check maze structure
      const maze = gameState.maze;
      if (!maze.size || !maze.exit || !Array.isArray(maze.pads)) {
        return false;
      }
      // Grid is optional (for backward compatibility with old shares)

      // Check enemy data
      const enemies = gameState.enemies;
      if (typeof enemies.count !== 'number' || !Array.isArray(enemies.spawns)) {
        return false;
      }

      // Check device configuration
      if (!gameState.devices ||
          typeof gameState.devices.taserCharges !== 'number' ||
          typeof gameState.devices.stunCharges !== 'number' ||
          typeof gameState.devices.tranqCharges !== 'number') {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Game state validation failed:', error);
      return false;
    }
  }

  /**
   * Create a human-readable challenge summary
   * @param {Object} gameState - Decoded game state
   * @returns {string} Challenge description
   */
  getChallengeSummary(gameState) {
    if (!this.validateGameState(gameState)) {
      return 'Invalid Challenge';
    }

    const { maze, enemies, challenge } = gameState;
    const completionTime = challenge.completionTime
      ? `${Math.floor(challenge.completionTime / 60000)}:${Math.floor((challenge.completionTime % 60000) / 1000).toString().padStart(2, '0')}`
      : 'Not completed';

    return `${maze.size}x${maze.size} maze by ${challenge.createdBy} • ${enemies.count} enemies • ${challenge.difficulty} difficulty • Time: ${completionTime}`;
  }

  /**
   * Encode maze grid using bit-packing for maximum compression
   * Each cell (0 or 1) becomes 1 bit, packed 8 cells per byte
   * @param {Array<Array<number>>} grid - 2D maze grid
   * @returns {string} Base64 encoded bit-packed grid
   */
  encodeMazeGrid(grid) {
    // Flatten grid to 1D array
    const flat = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        flat.push(grid[y][x]);
      }
    }

    // Pack 8 bits into each byte
    const bytes = [];
    for (let i = 0; i < flat.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < flat.length; j++) {
        if (flat[i + j] === 1 || flat[i + j] === 2) { // Support walls (1) and exit doors (2)
          byte |= (1 << j);
        }
      }
      bytes.push(byte);
    }

    // Convert to base64 using btoa
    const binaryString = String.fromCharCode.apply(null, bytes);
    return btoa(binaryString);
  }

  /**
   * Decode bit-packed maze grid
   * @param {string} encoded - Base64 encoded bit-packed grid
   * @param {number} size - Maze size (width/height)
   * @returns {Array<Array<number>>} 2D maze grid
   */
  decodeMazeGrid(encoded, size) {
    // Decode base64 to binary string
    const binaryString = atob(encoded);
    const bytes = [];
    for (let i = 0; i < binaryString.length; i++) {
      bytes.push(binaryString.charCodeAt(i));
    }

    // Unpack bits from bytes
    const flat = [];
    const totalCells = size * size;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      for (let j = 0; j < 8 && flat.length < totalCells; j++) {
        const bit = (byte >> j) & 1;
        flat.push(bit);
      }
    }

    // Convert flat array back to 2D grid
    const grid = [];
    for (let y = 0; y < size; y++) {
      grid.push(flat.slice(y * size, (y + 1) * size));
    }

    return grid;
  }
}