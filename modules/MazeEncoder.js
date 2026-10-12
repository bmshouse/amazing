// modules/MazeEncoder.js - Maze serialization and URL encoding for sharing
//
// A shared challenge is packed into bytes and written as base64url, about 150 characters for a 21x21 maze.
// Layout, all numbers big-endian:
//   u8 version | u8 size | u8 rechargePadCount | grid bits, 8 cells per byte, row by row (1 = wall)
//   u8 exitX, exitY, exitWallX, exitWallY (cells)
//   u8 padCount, then x, y per pad (cells) | u8 spawnCount, then x, y per snowman (cell; it starts at the centre)
//   u8 disruptor, frost and pacifier charges | u8 flags (bit 0-2: disruptor, frost, pacifier enabled)
//   u16 enemy speed x 100 | u32 completion time in ms (0 = none) | u16 + u32 timestamp in ms
//   u8 length + UTF-8 difficulty | u8 length + UTF-8 player name
import { GameConfig } from './GameConfig.js';
import { logger } from './Logger.js';

const FORMAT_VERSION = 1;
const MAX_TEXT_BYTES = 255;
const MAX_SIZE = 255;
const TWO_POW_32 = 2 ** 32;

class ByteWriter {
  constructor() { this.bytes = []; }
  u8(n) { this.bytes.push(Math.max(0, Math.min(255, Math.round(n)))); }
  u16(n) { const v = Math.max(0, Math.min(65535, Math.round(n))); this.bytes.push(v >> 8, v & 255); }
  u32(n) { const v = Math.max(0, Math.min(TWO_POW_32 - 1, Math.round(n))); this.bytes.push(v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); }
  raw(list) { for (const b of list) this.bytes.push(b); }
  text(s) {
    let bytes = new TextEncoder().encode(String(s ?? ''));
    // Trim whole characters so a long name never ends in half of one
    for (const chars = [...String(s ?? '')]; bytes.length > MAX_TEXT_BYTES; bytes = new TextEncoder().encode(chars.join(''))) chars.pop();
    this.u8(bytes.length);
    this.raw(bytes);
  }
}

class ByteReader {
  constructor(bytes) { this.bytes = bytes; this.pos = 0; }
  u8() {
    if (this.pos >= this.bytes.length) throw new Error('Challenge data is truncated');
    return this.bytes[this.pos++];
  }
  u16() { return this.u8() * 256 + this.u8(); }
  u32() { return this.u16() * 65536 + this.u16(); }
  take(n) {
    if (this.pos + n > this.bytes.length) throw new Error('Challenge data is truncated');
    return this.bytes.subarray(this.pos, (this.pos += n));
  }
  text() { return new TextDecoder().decode(this.take(this.u8())); }
}

export class MazeEncoder {
  constructor() {
    this.version = FORMAT_VERSION;
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

    // Snowmen are saved where they started, not where they have wandered since
    const enemySpawns = enemies?.entities?.map(enemy => ({
      x: enemy.spawnX ?? enemy.x,
      y: enemy.spawnY ?? enemy.y
    })) || [];

    // Device configuration
    const deviceConfig = {
      disruptorCharges: config?.devices?.disruptorCharges ?? config?.devices?.disruptor?.charges ?? GameConfig.DEVICES.DISRUPTOR.MAX_CHARGES,
      frostCharges: config?.devices?.frostCharges ?? config?.devices?.frost?.charges ?? GameConfig.DEVICES.FROST.MAX_CHARGES,
      pacifierCharges: config?.devices?.pacifierCharges ?? config?.devices?.pacifier?.charges ?? GameConfig.DEVICES.PACIFIER.MAX_CHARGES,
      disruptorEnabled: config?.devices?.disruptorEnabled ?? config?.devices?.disruptor?.enabled ?? true,
      frostEnabled: config?.devices?.frostEnabled ?? config?.devices?.frost?.enabled ?? true,
      pacifierEnabled: config?.devices?.pacifierEnabled ?? config?.devices?.pacifier?.enabled ?? true
    };

    return {
      version: this.version,
      timestamp: Date.now(),
      maze: {
        size: maze.w,
        rechargePadCount: maze.rechargePadCount,
        grid: maze.grid.map(row => [...row]),
        exit: {
          x: maze.exit.x,
          y: maze.exit.y,
          wallX: maze.exit.wallX,
          wallY: maze.exit.wallY
        },
        pads: maze.pads.map(pad => ({ x: pad.x, y: pad.y }))
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
   * Pack serialized game state into bytes and encode them for a URL
   * @param {Object} serializedData - Serialized game state
   * @returns {string} base64url string
   */
  encodeForURL(serializedData) {
    try {
      const { maze, enemies, devices, challenge } = serializedData;
      const size = maze.size;
      if (!(size > 0 && size <= MAX_SIZE)) throw new Error(`Maze size ${size} cannot be shared`);

      const out = new ByteWriter();
      out.u8(this.version);
      out.u8(size);
      out.u8(maze.rechargePadCount);
      out.raw(this.packGrid(maze.grid, size));
      out.u8(maze.exit.x);
      out.u8(maze.exit.y);
      out.u8(maze.exit.wallX);
      out.u8(maze.exit.wallY);
      out.u8(maze.pads.length);
      for (const pad of maze.pads) { out.u8(pad.x); out.u8(pad.y); }
      out.u8(enemies.spawns.length);
      for (const spawn of enemies.spawns) { out.u8(Math.floor(spawn.x)); out.u8(Math.floor(spawn.y)); }
      out.u8(devices.disruptorCharges);
      out.u8(devices.frostCharges);
      out.u8(devices.pacifierCharges);
      out.u8((devices.disruptorEnabled ? 1 : 0) | (devices.frostEnabled ? 2 : 0) | (devices.pacifierEnabled ? 4 : 0));
      out.u16(enemies.speed * 100);
      out.u32(challenge.completionTime || 0);
      out.u16(Math.floor(serializedData.timestamp / TWO_POW_32));
      out.u32(serializedData.timestamp % TWO_POW_32);
      out.text(challenge.difficulty);
      out.text(challenge.createdBy);

      const encoded = this.toBase64Url(out.bytes);
      logger.info(`Encoded maze data: ${out.bytes.length} bytes -> ${encoded.length} chars`);
      return encoded;
    } catch (error) {
      logger.error('Failed to encode maze data:', error);
      throw new Error('Failed to encode maze data for sharing');
    }
  }

  /**
   * Decode URL parameter back to game state
   * @param {string} encodedData - base64url maze data
   * @returns {Object} Deserialized game state
   */
  decodeFromURL(encodedData) {
    try {
      const input = new ByteReader(this.fromBase64Url(encodedData));

      if (input.u8() !== this.version) throw new Error('Incompatible challenge version');
      const size = input.u8();
      if (size < 3) throw new Error('Invalid maze size');
      const rechargePadCount = input.u8();
      const grid = this.unpackGrid(input.take(Math.ceil((size * size) / 8)), size);
      const exit = { x: input.u8(), y: input.u8(), wallX: input.u8(), wallY: input.u8() };
      // The packed grid cannot tell a door from a wall, so put the exit door back
      if (grid[exit.wallY]?.[exit.wallX] === GameConfig.MAZE.CELL_WALL) grid[exit.wallY][exit.wallX] = GameConfig.MAZE.CELL_EXIT_DOOR;

      const pads = Array.from({ length: input.u8() }, () => ({ x: input.u8(), y: input.u8() }));
      const spawns = Array.from({ length: input.u8() }, () => ({ x: input.u8() + 0.5, y: input.u8() + 0.5 }));
      const disruptorCharges = input.u8();
      const frostCharges = input.u8();
      const pacifierCharges = input.u8();
      const flags = input.u8();
      const speed = input.u16() / 100;
      const completionTime = input.u32() || null;
      const timestamp = input.u16() * TWO_POW_32 + input.u32();
      const difficulty = input.text();
      const createdBy = input.text();

      logger.info('Successfully decoded shared maze challenge');
      return {
        version: this.version,
        timestamp,
        maze: { size, rechargePadCount, grid, exit, pads },
        enemies: { count: spawns.length, speed, spawns },
        devices: {
          disruptorCharges,
          frostCharges,
          pacifierCharges,
          disruptorEnabled: !!(flags & 1),
          frostEnabled: !!(flags & 2),
          pacifierEnabled: !!(flags & 4)
        },
        challenge: { createdBy, completionTime, difficulty }
      };
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
    const match = targetURL.match(/#\/challenge\/([A-Za-z0-9_-]+)/);

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
      if (!gameState.version || !gameState.maze || !gameState.enemies) {
        return false;
      }

      // Check maze structure
      const maze = gameState.maze;
      if (!maze.size || !maze.exit || !Array.isArray(maze.pads) || !Array.isArray(maze.grid)) {
        return false;
      }

      // Check enemy data
      const enemies = gameState.enemies;
      if (typeof enemies.count !== 'number' || !Array.isArray(enemies.spawns)) {
        return false;
      }

      // Check device configuration
      if (!gameState.devices ||
          typeof gameState.devices.disruptorCharges !== 'number' ||
          typeof gameState.devices.frostCharges !== 'number' ||
          typeof gameState.devices.pacifierCharges !== 'number') {
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
   * Bit-pack the maze grid, 8 cells per byte, row by row. Walls and the exit door are 1, open cells 0.
   * @param {Array<Array<number>>} grid - 2D maze grid
   * @param {number} size - Maze size (width/height)
   * @returns {number[]} Packed bytes
   */
  packGrid(grid, size) {
    const bytes = new Array(Math.ceil((size * size) / 8)).fill(0);
    for (let i = 0; i < size * size; i++) {
      if (grid[(i / size) | 0][i % size]) bytes[i >> 3] |= 1 << (i & 7);
    }
    return bytes;
  }

  /**
   * Unpack a bit-packed maze grid
   * @param {Uint8Array} bytes - Packed bytes
   * @param {number} size - Maze size (width/height)
   * @returns {Array<Array<number>>} 2D maze grid of 0 (open) and 1 (wall)
   */
  unpackGrid(bytes, size) {
    return Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => (bytes[(y * size + x) >> 3] >> ((y * size + x) & 7)) & 1));
  }

  /** @private */
  toBase64Url(bytes) {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** @private */
  fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }
}
