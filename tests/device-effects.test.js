// tests/device-effects.test.js - each device has its own flair: impact bursts, bolt, styled darts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { particleState, emitHit, emitMiss, emitZap, clipToWalls, bloom } from '../modules/Effects.js';
import { TaserDevice } from '../modules/devices/TaserDevice.js';
import { SpriteRenderer } from '../modules/SpriteRenderer.js';
import { Model3DRenderer } from '../modules/rendering/Model3DRenderer.js';
import { GameConfig, DEVICE_TYPES } from '../modules/GameConfig.js';
import * as THREE from '../libs/three.module.js';

const collect = (fn) => {
  const spawned = [];
  fn((x, y, color, life, size, extra) => spawned.push({ x, y, color, life, size, ...extra }));
  return spawned;
};

describe('particleState', () => {
  const base = { x: 1, y: 2, born: 1000, life: 500, size: 0.04 };

  it('leaves a plain particle where it was spawned, at full size and opacity', () => {
    expect(particleState(base, 1400)).toEqual({ x: 1, y: 2, size: 0.04, h: undefined, alpha: 1 });
  });

  it('moves along its velocity', () => {
    const s = particleState({ ...base, vx: 2, vy: -1 }, 1500);
    expect(s.x).toBeCloseTo(2);
    expect(s.y).toBeCloseTo(1.5);
  });

  it('slows with drag, never going further than v / drag', () => {
    const s = particleState({ ...base, vx: 1, drag: 4 }, 1000 + 10000);
    expect(s.x - 1).toBeLessThan(1 / 4 + 1e-9);
    expect(s.x - 1).toBeGreaterThan(0.2);
  });

  it('rises, falls under gravity and rests on the floor', () => {
    const p = { ...base, h: 0.45, vh: 1, gravity: 4 };
    expect(particleState(p, 1000).h).toBeCloseTo(0.45);
    expect(particleState(p, 1250).h).toBeGreaterThan(0.45); // 0.45 + 0.25 - 0.125
    expect(particleState({ ...p, life: 5000 }, 1000 + 3000).h).toBeCloseTo(0.02); // clamped at the floor
  });

  it('grows and fades across its life', () => {
    const p = { ...base, grow: 3, fade: true };
    expect(particleState(p, 1000)).toMatchObject({ size: 0.04, alpha: 1 });
    const mid = particleState(p, 1250);
    expect(mid.size).toBeCloseTo(0.08);
    expect(mid.alpha).toBeCloseTo(0.5);
    expect(particleState(p, 5000)).toMatchObject({ alpha: 0 });
  });

  it('copes with a particle that has no birth time or life', () => {
    expect(particleState({ x: 1, y: 2 }, 1234)).toMatchObject({ x: 1, y: 2, alpha: 1 });
  });
});

describe('impact effects', () => {
  const hit = (type, heading) => collect((spawn) => emitHit(type, 3, 4, '#abcdef', spawn, heading));
  const speedOf = (p) => Math.hypot(p.vx, p.vy, p.vh);

  it('Disruptor throws fast, falling star sparks', () => {
    const sparks = hit(DEVICE_TYPES.TASER);
    expect(sparks.length).toBeGreaterThanOrEqual(8);
    sparks.forEach(p => {
      expect(p.shape).toBe('star');
      expect(p.gravity).toBeGreaterThan(0);
      expect(speedOf(p)).toBeGreaterThan(0.5);
    });
  });

  it('Immobilizer sends out an even ring', () => {
    const ring = hit(DEVICE_TYPES.STUN).filter(p => p.color === '#abcdef');
    expect(ring.length).toBeGreaterThanOrEqual(8);
    ring.forEach(p => expect(speedOf(p)).toBeCloseTo(speedOf(ring[0])));
    expect(ring.reduce((sum, p) => sum + p.vy, 0)).toBeCloseTo(0); // spread all the way round
    expect(ring.reduce((sum, p) => sum + p.vh, 0)).toBeCloseTo(0);
  });

  it('opens the ring facing the shooter, across the heading and up, with no motion along it', () => {
    const heading = Math.PI / 3;
    const ring = hit(DEVICE_TYPES.STUN, heading).filter(p => p.color === '#abcdef');
    const along = (p) => p.vx * Math.cos(heading) + p.vy * Math.sin(heading);
    ring.forEach(p => expect(along(p)).toBeCloseTo(0));
    expect(Math.max(...ring.map(p => p.vh))).toBeGreaterThan(1); // reaches straight up
  });

  it('Pacifier puffs drifting, swelling mist', () => {
    const mist = hit(DEVICE_TYPES.TRANQ).filter(p => p.grow > 1);
    expect(mist.length).toBeGreaterThanOrEqual(5);
    mist.forEach(p => {
      expect(p.vh).toBeGreaterThan(0);
      expect(p.life).toBeGreaterThan(600);
      expect(p.fade).toBe(true);
    });
  });

  it('keeps the plain burst for an unknown device', () => {
    const burst = hit('mystery');
    expect(burst).toHaveLength(GameConfig.PARTICLES.SPAWN_COUNT_ON_HIT);
    burst.forEach(p => expect(p.vx).toBeUndefined());
  });

  it('every effect stays within the particle budget', () => {
    for (const type of Object.values(DEVICE_TYPES)) {
      expect(hit(type).length).toBeLessThan(GameConfig.PARTICLES.MAX_PARTICLES / 4);
    }
  });

  it('a miss lifts a pale puff and a zap makes small sparks', () => {
    const puff = collect((spawn) => emitMiss(1, 1, spawn));
    expect(puff).toHaveLength(GameConfig.PARTICLES.SPAWN_COUNT_ON_MISS);
    puff.forEach(p => expect(p.color).toBe(GameConfig.COLORS.PARTICLE_MISS));
    const zap = collect((spawn) => emitZap(1, 1, '#ffd166', spawn));
    zap.forEach(p => expect(p.size).toBeLessThan(GameConfig.RENDERING.PARTICLE_SIZE));
  });
});

describe('bloom', () => {
  const { PROJECTILE_MIN_DISTANCE } = GameConfig.RENDERING;

  it('is nothing at the camera cut-off and full once the dart is well clear', () => {
    expect(bloom(PROJECTILE_MIN_DISTANCE)).toBe(0);
    expect(bloom(PROJECTILE_MIN_DISTANCE + GameConfig.EFFECTS.BLOOM_DISTANCE)).toBe(1);
    expect(bloom(50)).toBe(1);
  });

  it('grows steadily in between', () => {
    expect(bloom(PROJECTILE_MIN_DISTANCE + GameConfig.EFFECTS.BLOOM_DISTANCE / 2)).toBeCloseTo(0.5);
  });
});

describe('clipToWalls', () => {
  const maze = { cellAt: (x) => (Math.floor(x) === 4 ? 1 : 0) };

  it('stops a segment at the wall', () => {
    const end = clipToWalls(maze, 2.5, 1.5, 6.5, 1.5);
    expect(end.x).toBeLessThan(4);
    expect(end.x).toBeGreaterThan(3);
    expect(end.y).toBeCloseTo(1.5);
  });

  it('leaves a clear segment alone', () => {
    expect(clipToWalls(maze, 0.5, 1.5, 2.5, 1.5)).toEqual({ x: 2.5, y: 1.5 });
  });
});

describe('Disruptor bolt', () => {
  const audio = { beep: () => {} };
  const player = { x: 2, y: 3, a: 0 };

  it('reaches the snowman it hit', () => {
    const onBolt = vi.fn();
    const enemyController = { raycastForEnemy: () => ({ x: 3.2, y: 3.05 }) };
    new TaserDevice().activate(player, enemyController, audio, () => {}, null, onBolt);
    expect(onBolt).toHaveBeenCalledWith(2, 3, 3.2, 3.05, GameConfig.DEVICES.TASER.COLOR, true);
  });

  it('runs out to the end of its reach on a miss', () => {
    const onBolt = vi.fn();
    new TaserDevice().activate(player, { raycastForEnemy: () => null }, audio, () => {}, null, onBolt);
    const [, , x2, y2, , hit] = onBolt.mock.calls[0];
    expect(x2).toBeCloseTo(2 + GameConfig.DEVICES.TASER.RANGE);
    expect(y2).toBeCloseTo(3);
    expect(hit).toBe(false);
  });

  it('still works with no bolt listener', () => {
    expect(new TaserDevice().activate(player, { raycastForEnemy: () => null }, audio, () => {})).toBe(true);
  });

  describe('rendering', () => {
    let ctx, renderer;
    beforeEach(() => {
      ctx = {
        globalAlpha: 1, strokeStyle: '', lineWidth: 1,
        save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn()
      };
      renderer = new SpriteRenderer({ getContext: () => ctx });
    });
    const bolt = (extra = {}) => ({ x2: 3, y2: 3, color: '#ffd166', born: performance.now(), life: 1000, ...extra });

    it('strokes a glow and a bright core through a jagged path', () => {
      renderer.renderBolts([bolt()], player, 640, 360);
      expect(ctx.stroke).toHaveBeenCalledTimes(2);
      expect(ctx.lineTo).toHaveBeenCalledTimes(2 * GameConfig.EFFECTS.BOLT.SEGMENTS);
    });

    it('drops a bolt once its time is up', () => {
      const bolts = [bolt({ born: performance.now() - 5000 })];
      renderer.renderBolts(bolts, player, 640, 360);
      expect(bolts).toHaveLength(0);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips a bolt that ends behind the player', () => {
      renderer.renderBolts([bolt({ x2: 1 })], player, 640, 360);
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });
});

describe('device-styled darts', () => {
  const player = { x: 0.5, y: 0.5, a: 0 };
  const dart = (type) => ({ x: 2, y: 0.5, a: 0, v: 5, r: 0.06, color: '#00d1ff', type });
  const openMaze = { exit: null, cellAt: () => 0 };
  const style = (type) => GameConfig.EFFECTS.PROJECTILE_STYLE[type];

  describe('2D', () => {
    let ctx, renderer;
    beforeEach(() => {
      ctx = {
        globalAlpha: 1, fillStyle: '', beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn()
      };
      renderer = new SpriteRenderer({ getContext: () => ctx });
    });

    it('draws the Immobilizer orb with a halo and orbiting motes', () => {
      renderer.drawProjectile(dart(DEVICE_TYPES.STUN), player, 640, 360, openMaze);
      const s = style(DEVICE_TYPES.STUN);
      const trail = GameConfig.RENDERING.PROJECTILE_TRAIL.length;
      expect(ctx.ellipse).toHaveBeenCalledTimes(1 + trail + 1 + s.motes.count);
    });

    it('draws the Pacifier dart with a long twinkling trail and a bright core', () => {
      const fills = [];
      ctx.ellipse.mockImplementation(() => fills.push(ctx.fillStyle));
      renderer.drawProjectile(dart(DEVICE_TYPES.TRANQ), player, 640, 360, openMaze);
      const s = style(DEVICE_TYPES.TRANQ);
      expect(s.trail.length).toBeGreaterThan(GameConfig.RENDERING.PROJECTILE_TRAIL.length);
      expect(ctx.ellipse).toHaveBeenCalledTimes(s.trail.length + 2); // trail, head, core
      expect(fills).toContain(s.twinkle);
      expect(fills[fills.length - 1]).toBe(s.core.color);
    });

    it('still draws a dart of unknown type as plain bead and trail', () => {
      renderer.drawProjectile(dart(undefined), player, 640, 360, openMaze);
      expect(ctx.ellipse).toHaveBeenCalledTimes(1 + GameConfig.RENDERING.PROJECTILE_TRAIL.length);
    });
  });

  describe('3D', () => {
    let r;
    beforeEach(() => {
      r = new Model3DRenderer(document.createElement('canvas'));
      r.THREE = THREE;
      r.scene = new THREE.Scene();
      r.enabled = true;
    });

    it('builds the Immobilizer orb with a halo and motes, head first', () => {
      const p = dart(DEVICE_TYPES.STUN);
      r.updateProjectiles([p], player, openMaze);
      const group = r.projectilePool.get(p);
      const s = style(DEVICE_TYPES.STUN);
      expect(group.children).toHaveLength(1 + GameConfig.RENDERING.PROJECTILE_TRAIL.length + 1 + s.motes.count);
      expect(group.children[0]).toBe(group.userData.head);
      expect(group.userData.motes).toHaveLength(s.motes.count);
    });

    it('moves the motes around the head from frame to frame, staying close to it', () => {
      const p = { ...dart(DEVICE_TYPES.STUN), x: 5 }; // well clear of the camera, so fully grown in
      r.updateProjectiles([p], player, openMaze);
      const mote = r.projectilePool.get(p).userData.motes[0];
      const first = mote.position.clone();
      const spy = vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 120);
      r.updateProjectiles([p], player, openMaze);
      spy.mockRestore();
      expect(mote.position.distanceTo(first)).toBeGreaterThan(0.001);
      expect(mote.position.length()).toBeCloseTo(style(DEVICE_TYPES.STUN).motes.orbit * p.r);
    });

    it('keeps the halo and motes tucked in on a dart that has only just launched', () => {
      const p = { ...dart(DEVICE_TYPES.STUN), x: player.x + GameConfig.RENDERING.PROJECTILE_MIN_DISTANCE + 0.05 };
      r.updateProjectiles([p], player, openMaze);
      const { halo, motes } = r.projectilePool.get(p).userData;
      expect(halo.scale.x).toBeLessThan(p.r * style(DEVICE_TYPES.STUN).halo.scale * 0.2);
      expect(motes[0].position.length()).toBeLessThan(p.r * 0.2);
    });

    it('builds the Pacifier dart with the long trail and a core', () => {
      const p = dart(DEVICE_TYPES.TRANQ);
      r.updateProjectiles([p], player, openMaze);
      const group = r.projectilePool.get(p);
      expect(group.children).toHaveLength(style(DEVICE_TYPES.TRANQ).trail.length + 2);
      expect(group.userData.core).toBeTruthy();
    });
  });
});
