// tests/projectile-render.test.js - in-flight darts are drawn by both renderers
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteRenderer } from '../modules/SpriteRenderer.js';
import { Model3DRenderer } from '../modules/rendering/Model3DRenderer.js';
import { GameConfig } from '../modules/GameConfig.js';
import * as THREE from '../libs/three.module.js';

const player = { x: 0.5, y: 0.5, a: 0 };
const dart = (x, extra = {}) => ({ x, y: 0.5, a: 0, v: 5, r: 0.05, color: '#a29bfe', ...extra });
const BEADS = 1 + GameConfig.RENDERING.PROJECTILE_TRAIL.length;
const openMaze = { exit: null, cellAt: () => 0 };
// Wall across x in [3, 4)
const wallMaze = { exit: null, cellAt: (x) => (Math.floor(x) === 3 ? 1 : 0) };

describe('2D dart rendering', () => {
  let ctx, renderer;

  beforeEach(() => {
    ctx = {
      globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
      beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), moveTo: vi.fn(), stroke: vi.fn()
    };
    renderer = new SpriteRenderer({ getContext: () => ctx });
  });

  it('draws a bead plus its trail', () => {
    renderer.drawProjectile(dart(2), player, 640, 360, openMaze);
    expect(ctx.ellipse).toHaveBeenCalledTimes(BEADS);
  });

  it('draws the trail fainter than the head, and the head last', () => {
    const alphas = [];
    ctx.ellipse.mockImplementation(() => alphas.push(ctx.globalAlpha));
    renderer.drawProjectile(dart(2), player, 640, 360, openMaze);
    expect(alphas).toHaveLength(BEADS);
    expect(Math.max(...alphas)).toBe(alphas[alphas.length - 1]);
    expect(alphas[0]).toBeLessThan(alphas[alphas.length - 1]);
  });

  it('sits below the horizon, at dart height under the eye', () => {
    const ys = [];
    ctx.ellipse.mockImplementation((_x, y) => ys.push(y));
    renderer.drawProjectile(dart(2), player, 640, 360, openMaze);
    expect(ys[ys.length - 1]).toBeGreaterThan(360 / 2); // lower on screen than the crosshair
  });

  it('hides a dart behind a wall', () => {
    renderer.drawProjectile(dart(5), player, 640, 360, wallMaze);
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('does not draw a dart that has only just left the player', () => {
    renderer.drawProjectile(dart(0.5 + GameConfig.RENDERING.PROJECTILE_MIN_DISTANCE - 0.05), player, 640, 360, openMaze);
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('draws darts through renderSprites', () => {
    renderer.renderSprites(player, openMaze, { entities: [] }, [], 640, 360, {}, [dart(2)]);
    expect(ctx.ellipse).toHaveBeenCalledTimes(BEADS);
  });

  it('still renders without a projectile list', () => {
    expect(() => renderer.renderSprites(player, openMaze, { entities: [] }, [], 640, 360, {})).not.toThrow();
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('draws far to near, so a dart behind a snowman is covered by it', () => {
    const order = [];
    vi.spyOn(renderer, 'drawEnemy').mockImplementation(() => order.push('enemy'));
    vi.spyOn(renderer, 'drawProjectile').mockImplementation(() => order.push('dart'));
    const enemy = { x: 2, y: 0.5 };
    renderer.renderSprites(player, openMaze, { entities: [enemy] }, [], 640, 360, {}, [dart(3)]);
    renderer.renderSprites(player, openMaze, { entities: [enemy] }, [], 640, 360, {}, [dart(1)]);
    expect(order).toEqual(['dart', 'enemy', 'enemy', 'dart']);
  });
});

describe('3D dart rendering', () => {
  let r;

  beforeEach(() => {
    r = new Model3DRenderer({}, 640, 360);
    r.THREE = THREE;
    r.scene = new THREE.Scene();
    r.enabled = true;
  });

  it('adds a bead-and-trail group at dart height', () => {
    const p = dart(2);
    r.updateProjectiles([p], player, openMaze);
    const group = r.projectilePool.get(p);
    expect(group.children).toHaveLength(BEADS);
    expect(group.position.x).toBe(2);
    expect(group.position.y).toBe(GameConfig.RENDERING.PROJECTILE_HEIGHT);
    expect(group.position.z).toBe(0.5);
    expect(r.scene.children).toContain(group);
  });

  it('lays the trail out behind the dart, along its flight direction', () => {
    const p = dart(2, { a: Math.PI / 2 }); // flying toward +y
    r.updateProjectiles([p], player, openMaze);
    const [head, ...trail] = r.projectilePool.get(p).children;
    expect(head.position.z).toBeCloseTo(0);
    trail.forEach(bead => {
      expect(bead.position.z).toBeLessThan(0); // behind: smaller y
      expect(bead.position.x).toBeCloseTo(0);
    });
  });

  it('keeps one group per dart and follows it', () => {
    const p = dart(2);
    r.updateProjectiles([p], player, openMaze);
    const group = r.projectilePool.get(p);
    p.x = 2.4;
    r.updateProjectiles([p], player, openMaze);
    expect(r.projectilePool.get(p)).toBe(group);
    expect(group.position.x).toBe(2.4);
    expect(r.projectilePool.size).toBe(1);
  });

  it('removes the group once the dart is gone', () => {
    const p = dart(2);
    r.updateProjectiles([p], player, openMaze);
    const group = r.projectilePool.get(p);
    r.updateProjectiles([], player, openMaze);
    expect(r.projectilePool.size).toBe(0);
    expect(r.scene.children).not.toContain(group);
  });

  it('hides a dart behind a wall and shows it again in the open', () => {
    const p = dart(5);
    r.updateProjectiles([p], player, wallMaze);
    expect(r.projectilePool.get(p).visible).toBe(false);
    r.updateProjectiles([p], player, openMaze);
    expect(r.projectilePool.get(p).visible).toBe(true);
  });

  it('hides a dart until it is clear of the camera, then shows it', () => {
    const p = dart(0.5 + GameConfig.RENDERING.PROJECTILE_MIN_DISTANCE - 0.05);
    r.updateProjectiles([p], player, openMaze);
    expect(r.projectilePool.get(p).visible).toBe(false);
    p.x += 0.1;
    r.updateProjectiles([p], player, openMaze);
    expect(r.projectilePool.get(p).visible).toBe(true);
  });

  it('shares materials and geometry between darts of one colour', () => {
    const a = dart(2), b = dart(1.5);
    r.updateProjectiles([a, b], player, openMaze);
    const [headA] = r.projectilePool.get(a).children;
    const [headB] = r.projectilePool.get(b).children;
    expect(headA.material).toBe(headB.material);
    expect(headA.geometry).toBe(headB.geometry);
  });

  it('does nothing while the renderer is disabled', () => {
    r.enabled = false;
    r.updateProjectiles([dart(2)], player, openMaze);
    expect(r.projectilePool.size).toBe(0);
  });
});
