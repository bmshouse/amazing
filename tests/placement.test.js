import { describe, it, expect } from 'vitest';
import { pickSpread, distanceField } from '../modules/Placement.js';
import { Maze } from '../modules/maze.js';
import { EnemyController } from '../modules/enemies.js';
import { GameConfig } from '../modules/GameConfig.js';

const fieldFor = (maze) => distanceField(maze, Math.floor(GameConfig.PLAYER.START_X), Math.floor(GameConfig.PLAYER.START_Y));

describe('pickSpread', () => {
  const line = Array.from({ length: 40 }, (_, d) => ({ x: d, y: 0, d }));

  it('takes one cell from each equal slice of the route', () => {
    const picks = pickSpread(line, 4);
    expect(picks.map(p => Math.floor(p.d / 10))).toEqual([0, 1, 2, 3]);
  });

  it('never picks a cell twice, even when candidates are scarce', () => {
    const picks = pickSpread(line.slice(0, 3), 5);
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks.length).toBe(3);
  });

  it('borrows the nearest cell for a slice with none', () => {
    const gappy = [{ x: 0, y: 0, d: 0 }, { x: 1, y: 0, d: 30 }];
    expect(pickSpread(gappy, 3)).toHaveLength(2);
  });
});

describe('even placement in a generated maze', () => {
  it('spreads pads along the route and keeps them off the start', () => {
    for (let n = 0; n < 20; n++) {
      const maze = new Maze(31, 31, 3);
      maze.generate();
      const field = fieldFor(maze);
      const ds = maze.pads.map(p => field.dist[p.y * maze.w + p.x]).sort((a, b) => a - b);
      expect(ds).toHaveLength(3);
      for (const p of maze.pads) {
        expect(Math.hypot(p.x - GameConfig.PLAYER.START_X, p.y - GameConfig.PLAYER.START_Y)).toBeGreaterThan(GameConfig.MAZE.MIN_DISTANCE_FROM_START);
      }
      expect(new Set(ds).size).toBe(3);
    }
  });

  it('spreads snowmen across the whole route', () => {
    for (let n = 0; n < 20; n++) {
      const maze = new Maze(31, 31);
      maze.generate();
      const enemies = new EnemyController(maze, { x: GameConfig.PLAYER.START_X, y: GameConfig.PLAYER.START_Y });
      const field = fieldFor(maze);
      const ds = enemies.entities.map(e => field.dist[Math.floor(e.y) * maze.w + Math.floor(e.x)]);
      expect(ds).toHaveLength(GameConfig.ENEMIES.COUNT);
      const reach = Math.max(...field.dist);
      // Some in the first third of the route and some in the last third
      expect(ds.some(d => d < reach / 3)).toBe(true);
      expect(ds.some(d => d > (reach * 2) / 3)).toBe(true);
    }
  });
});

describe('sharing snowman spawns', () => {
  it('serializes where snowmen started, not where they have wandered', async () => {
    const { MazeEncoder } = await import('../modules/MazeEncoder.js');
    const maze = new Maze(21, 21);
    maze.generate();
    const enemies = new EnemyController(maze, { x: GameConfig.PLAYER.START_X, y: GameConfig.PLAYER.START_Y });
    const starts = enemies.entities.map(e => ({ x: e.x, y: e.y }));
    enemies.entities.forEach(e => { e.x += 1; e.y += 1; }); // wandered off
    const data = new MazeEncoder().serializeGameState({ maze, enemies, config: {} });
    expect(data.enemies.spawns).toEqual(starts);
  });
});
