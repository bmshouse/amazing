import { describe, it, expect } from 'vitest';
import { MazeEncoder } from '../modules/MazeEncoder.js';
import { ChallengeManager } from '../modules/ChallengeManager.js';
import { Maze } from '../modules/maze.js';
import { EnemyController } from '../modules/enemies.js';
import { GameConfig } from '../modules/GameConfig.js';

const encoder = new MazeEncoder();

function shareable(size = 21, extra = {}) {
  const maze = new Maze(size, size, 3);
  maze.generate();
  const enemies = new EnemyController(maze, { x: GameConfig.PLAYER.START_X, y: GameConfig.PLAYER.START_Y });
  const gameData = {
    maze,
    enemies,
    config: {
      enemySpeed: 1.3,
      difficultyPreset: 'normal',
      devices: { taserCharges: 8, stunCharges: 6, tranqCharges: 4, taserEnabled: true, stunEnabled: false, tranqEnabled: true }
    },
    completionTime: 123456,
    playerName: 'Zoë 🎄',
    ...extra
  };
  return { maze, enemies, gameData, serialized: encoder.serializeGameState(gameData) };
}

describe('MazeEncoder binary format', () => {
  it('round-trips a whole challenge', () => {
    const { serialized } = shareable();
    const decoded = encoder.decodeFromURL(encoder.encodeForURL(serialized));
    expect(decoded).toEqual(serialized);
  });

  it('keeps the exit door as a door, not a wall', () => {
    const { maze, serialized } = shareable();
    const decoded = encoder.decodeFromURL(encoder.encodeForURL(serialized));
    expect(decoded.maze.grid[maze.exit.wallY][maze.exit.wallX]).toBe(GameConfig.MAZE.CELL_EXIT_DOOR);
  });

  it('keeps names with accents and emoji, and trims over-long ones', () => {
    const { serialized } = shareable(15);
    serialized.challenge.createdBy = '🎄'.repeat(200);
    const decoded = encoder.decodeFromURL(encoder.encodeForURL(serialized));
    expect(decoded.challenge.createdBy).toMatch(/^(🎄)+$/u);
    expect(new TextEncoder().encode(decoded.challenge.createdBy).length).toBeLessThanOrEqual(255);
  });

  it('makes links far shorter than the old JSON ones, and URL-safe', () => {
    const { serialized } = shareable(21);
    const encoded = encoder.encodeForURL(serialized);
    expect(encoded.length).toBeLessThan(250);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('handles the largest maze', () => {
    const { serialized } = shareable(51);
    expect(encoder.decodeFromURL(encoder.encodeForURL(serialized))).toEqual(serialized);
  });

  it('rejects old JSON links and truncated data', () => {
    const old = btoa(JSON.stringify({ version: 1, seed: 1, maze: {} }));
    expect(() => encoder.decodeFromURL(old.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))).toThrow();
    const { serialized } = shareable(15);
    const encoded = encoder.encodeForURL(serialized);
    expect(() => encoder.decodeFromURL(encoded.slice(0, 20))).toThrow();
  });

  it('finds the data in a share URL', () => {
    const { serialized } = shareable(15);
    const encoded = encoder.encodeForURL(serialized);
    expect(encoder.parseShareableURL(`https://example.com/game/#/challenge/${encoded}`)).toBe(encoded);
  });

  it('lets ChallengeManager rebuild the identical maze, pads and snowmen', () => {
    const { maze, enemies, serialized } = shareable(21);
    const decoded = encoder.decodeFromURL(encoder.encodeForURL(serialized));
    const restored = new ChallengeManager().generateMazeFromChallenge(decoded);
    expect(restored.maze.grid).toEqual(maze.grid);
    expect(restored.maze.pads).toEqual(maze.pads);
    expect(restored.maze.exit).toEqual(maze.exit);
    expect(restored.enemySpawns).toEqual(enemies.entities.map(e => ({ x: e.spawnX, y: e.spawnY })));
    expect(restored.config.enemySpeed).toBe(1.3);
  });
});
