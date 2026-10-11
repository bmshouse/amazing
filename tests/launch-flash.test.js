// tests/launch-flash.test.js - small muzzle flash for darts, and the Disruptor's reach matching the head
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranqDevice } from '../modules/devices/TranqDevice.js';
import { StunDevice } from '../modules/devices/StunDevice.js';
import { TaserDevice } from '../modules/devices/TaserDevice.js';
import { SpriteRenderer } from '../modules/SpriteRenderer.js';
import { EnemyController } from '../modules/enemies.js';
import { Maze } from '../modules/maze.js';
import { GameConfig, ENEMY_STATES } from '../modules/GameConfig.js';

const audio = { beep: () => {} };
const projectileSystem = { addProjectile: () => {} };

describe('Muzzle flash', () => {
  let player, onActivation;
  beforeEach(() => {
    player = { x: 2, y: 3, a: 0 };
    onActivation = vi.fn();
  });

  it.each([
    ['Pacifier', () => new TranqDevice()],
    ['Immobilizer', () => new StunDevice()]
  ])('%s launches flag the flash as a muzzle flash, half a unit out', (_name, make) => {
    expect(make().activate(player, null, audio, onActivation, projectileSystem)).toBe(true);
    const [x, y, , muzzle] = onActivation.mock.calls[0];
    expect(muzzle).toBe(true);
    expect(x).toBeCloseTo(2.5); // far enough out that the flash doesn't swamp the screen
    expect(y).toBeCloseTo(3);
  });

  it('keeps the Disruptor flash as it was, since that is its hit feedback', () => {
    const enemyController = { raycastForEnemy: () => null };
    new TaserDevice().activate(player, enemyController, audio, onActivation);
    const [x, , , muzzle] = onActivation.mock.calls[0];
    expect(muzzle).toBeUndefined();
    expect(x).toBeCloseTo(2.8);
  });

  it('is much smaller and briefer than a hit burst', () => {
    const { PARTICLES, RENDERING } = GameConfig;
    expect(PARTICLES.SPAWN_COUNT_ON_LAUNCH).toBeLessThan(PARTICLES.SPAWN_COUNT_ON_HIT);
    expect(PARTICLES.LAUNCH_FLASH_LIFE).toBeLessThan(350);
    expect(PARTICLES.LAUNCH_FLASH_SIZE).toBeLessThan(RENDERING.PARTICLE_SIZE);
  });

  describe('particle size', () => {
    let renderer;
    beforeEach(() => {
      renderer = new SpriteRenderer({ getContext: () => ({}) });
      vi.spyOn(renderer, '_drawBillboard').mockImplementation(() => {});
    });

    it('draws a particle at its own size when it has one', () => {
      renderer.drawParticle({ x: 3, y: 3, color: '#fff', size: 0.025 }, { x: 0, y: 0, a: 0 }, 640, 360);
      expect(renderer._drawBillboard.mock.calls[0][2]).toBe(0.025);
    });

    it('falls back to the default particle size', () => {
      renderer.drawParticle({ x: 3, y: 3, color: '#fff' }, { x: 0, y: 0, a: 0 }, 640, 360);
      expect(renderer._drawBillboard.mock.calls[0][2]).toBe(GameConfig.RENDERING.PARTICLE_SIZE);
    });
  });
});

describe('Disruptor reach', () => {
  let maze, enemies;
  beforeEach(() => {
    maze = new Maze(12, 3, 0);
    maze.grid = [Array(12).fill(1), [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], Array(12).fill(1)];
    enemies = new EnemyController(maze, { x: 1.5, y: 1.5 });
    enemies.entities = [{ x: 2.8, y: 1.5, state: ENEMY_STATES.IDLE, speed: 0, speedMul: 0 }];
  });

  const zap = () => {
    enemies.player = { x: 1.5, y: 1.5, a: 0 };
    new TaserDevice().activate(enemies.player, enemies, audio, () => {});
    return enemies.entities[0].state;
  };

  it('stuns a snowman right on the beam', () => {
    expect(zap()).toBe(ENEMY_STATES.STUNNED);
  });

  it('stuns one the beam grazes the head of', () => {
    enemies.entities[0].y = 1.5 + GameConfig.RENDERING.ENEMY_HIT_RADIUS - 0.02;
    expect(zap()).toBe(ENEMY_STATES.STUNNED);
  });

  it('misses one that passes beside the head, as the darts do', () => {
    // Inside the old 0.15 reach, but clear of the 0.1 head
    enemies.entities[0].y = 1.5 + 0.13;
    expect(zap()).toBe(ENEMY_STATES.IDLE);
  });
});
