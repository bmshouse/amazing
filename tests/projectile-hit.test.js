// tests/projectile-hit.test.js - projectiles hit the snowman's drawn body and can't skip over it
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectileSystem } from '../modules/ProjectileSystem.js';
import { EnemyController } from '../modules/enemies.js';
import { Maze } from '../modules/maze.js';
import { GameConfig, DEVICE_TYPES, ENEMY_STATES } from '../modules/GameConfig.js';

// One open row: a straight corridor along y = 1.5
const makeCorridor = () => {
  const maze = new Maze(12, 3, 0);
  maze.grid = [
    Array(12).fill(1),
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    Array(12).fill(1)
  ];
  return maze;
};

describe('Projectile hits', () => {
  let maze, enemies, projectiles, hits;
  const head = GameConfig.RENDERING.ENEMY_HIT_RADIUS; // darts fly at head height

  const shoot = ({ y = 1.5, x = 2.5, v = 5.0, r = 0.05, dt = 16, frames = 200 } = {}) => {
    projectiles.addProjectile({
      x, y, a: 0, v, r, color: '#fff', type: DEVICE_TYPES.TRANQ, born: performance.now(),
      device: { applyEffect: (e) => { hits.push(e); } }
    });
    for (let i = 0; i < frames && projectiles.getProjectiles().length; i++) projectiles.update(dt);
  };

  beforeEach(() => {
    maze = makeCorridor();
    enemies = new EnemyController(maze, { x: 1.5, y: 1.5 });
    enemies.entities = [{ x: 6.5, y: 1.5, state: ENEMY_STATES.IDLE, speed: 0, speedMul: 0 }];
    projectiles = new ProjectileSystem(maze, enemies);
    hits = [];
  });

  it('hits a snowman whose head the dart clips, though it misses the centre point', () => {
    // 0.12 off-centre: outside the dart's own 0.05 radius, but the dart touches the 0.1 head
    enemies.entities[0].y = 1.5 + 0.12;
    shoot();
    expect(hits).toHaveLength(1);
  });

  it('misses a snowman the dart visibly passes beside', () => {
    // 0.18 off-centre clears the head (0.1) plus the dart (0.05), though it is inside the wide base
    enemies.entities[0].y = 1.5 + head + 0.05 + 0.03;
    shoot();
    expect(hits).toHaveLength(0);
  });

  it('cannot skip over a snowman during a long frame', () => {
    // 50ms at speed 5 is a 0.25 step: from 6.2 straight past the snowman at 6.5
    shoot({ x: 6.2, dt: 50, frames: 1 });
    expect(hits).toHaveLength(1);
  });

  it('removes the dart on a hit', () => {
    shoot();
    expect(projectiles.getProjectiles()).toHaveLength(0);
  });

  it('hits the nearer of two snowmen in the path', () => {
    const far = { x: 8.5, y: 1.5, state: ENEMY_STATES.IDLE, speed: 0, speedMul: 0 };
    enemies.entities.push(far);
    shoot();
    expect(hits).toEqual([enemies.entities[0]]);
  });

  it('still stops at a wall when no snowman is in the way', () => {
    enemies.entities = [];
    shoot();
    expect(projectiles.getProjectiles()).toHaveLength(0);
    expect(hits).toHaveLength(0);
  });

  describe('miss feedback', () => {
    let misses;
    beforeEach(() => {
      misses = [];
      projectiles.setMissCallback((x, y, color) => misses.push({ x, y, color }));
    });

    it('reports where a dart ended against the wall, in the open cell before it', () => {
      enemies.entities = [];
      shoot({ y: 1.5 });
      expect(misses).toHaveLength(1);
      // the corridor's open cells end at x = 11
      expect(misses[0].x).toBeGreaterThan(10.7);
      expect(misses[0].x).toBeLessThan(11);
      expect(misses[0].y).toBeCloseTo(1.5);
      expect(misses[0].color).toBe('#fff');
    });

    it('reports the spot when a long frame carries the dart well into the wall', () => {
      enemies.entities = [];
      shoot({ x: 10.9, dt: 50, frames: 1 }); // a 0.25 step: ends 0.15 inside the wall
      expect(misses).toHaveLength(1);
      expect(maze.cellAt(misses[0].x, misses[0].y)).toBe(0);
      expect(misses[0].x).toBeGreaterThan(10.9);
    });

    it('reports a dart that times out', () => {
      enemies.entities = [];
      projectiles.addProjectile({ x: 3.5, y: 1.5, a: 0, v: 0, r: 0.05, color: '#abc', type: DEVICE_TYPES.TRANQ, born: performance.now() - 20_000 });
      projectiles.update(16);
      expect(misses).toEqual([{ x: 3.5, y: 1.5, color: '#abc' }]);
    });

    it('does not report a dart that hit a snowman', () => {
      shoot();
      expect(hits).toHaveLength(1);
      expect(misses).toHaveLength(0);
    });

    it('is fine without a miss callback', () => {
      enemies.entities = [];
      projectiles.setMissCallback(null);
      expect(() => shoot()).not.toThrow();
    });
  });
});
