import { describe, it, expect } from 'vitest';
import { RaycastRenderer } from '../modules/RaycastRenderer.js';
import { Maze } from '../modules/maze.js';

// 5x5 room: walls on the border, open 3x3 interior, door in the east wall
const makeMaze = () => {
  const maze = new Maze(5, 5);
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) maze.grid[y][x] = 0;
  maze.grid[2][4] = 2;
  return maze;
};

const makeRenderer = () => {
  const canvas = { getContext: () => ({}) };
  return new RaycastRenderer(canvas, { wall: {}, brick: {}, door: {} });
};

describe('RaycastRenderer DDA', () => {
  const maze = makeMaze();
  const renderer = makeRenderer();

  it('hits the east wall with perpendicular distance and an X-facing side', () => {
    const hit = renderer.castRay(1.5, 1.5, 1, 0, maze);
    expect(hit.mapX).toBe(4);
    expect(hit.mapY).toBe(1);
    expect(hit.side).toBe(0);
    expect(hit.dist).toBeCloseTo(2.5);
    expect(hit.cellType).toBe(1);
  });

  it('hits the south wall as a Y-facing side', () => {
    const hit = renderer.castRay(1.5, 1.5, 0, 1, maze);
    expect(hit.side).toBe(1);
    expect(hit.dist).toBeCloseTo(2.5);
  });

  it('reports exit doors as cell type 2', () => {
    const hit = renderer.castRay(1.5, 2.5, 1, 0, maze);
    expect(hit.cellType).toBe(2);
    expect(hit.mapX).toBe(4);
    expect(hit.mapY).toBe(2);
  });

  it('keeps wall texture coordinate within [0, 1) and tracks the hit point', () => {
    const hit = renderer.castRay(1.5, 1.25, 1, 0, maze);
    expect(hit.wallU).toBeGreaterThanOrEqual(0);
    expect(hit.wallU).toBeLessThan(1);
    // Facing east (rayDirX > 0) the coordinate is mirrored: 1 - 0.25
    expect(hit.wallU).toBeCloseTo(0.75);
  });

  it('handles diagonal rays and returns the closer wall', () => {
    const hit = renderer.castRay(1.5, 1.5, 1, 1, maze);
    // Corner at (4, 4): both axes reach a wall at the same parameter 2.5 (Y/X tie resolves to Y)
    expect(hit.dist).toBeCloseTo(2.5);
  });

  it('returns null when nothing is hit within the max depth', () => {
    const open = { cellAt: () => 0 };
    expect(renderer.castRay(1.5, 1.5, 1, 0, open)).toBeNull();
  });

  it('alternates wall and brick textures by cell parity and uses the door texture for doors', () => {
    expect(renderer.selectTexture({ cellType: 1, mapX: 2, mapY: 2 })).toBe(renderer.textures.wall);
    expect(renderer.selectTexture({ cellType: 1, mapX: 2, mapY: 3 })).toBe(renderer.textures.brick);
    expect(renderer.selectTexture({ cellType: 2, mapX: 2, mapY: 3 })).toBe(renderer.textures.door);
  });

  it('shades nearby surfaces with no fog and distant ones with heavy fog', () => {
    const near = renderer.shadeFor(0.5, 1);
    const far = renderer.shadeFor(renderer.config.maxDepth, 1);
    expect(near.fog).toBeLessThan(0.01);
    expect(far.fog).toBeGreaterThan(0.8);
    expect(far.r).toBeLessThan(near.r);
  });

  it('applies the side multiplier to every channel', () => {
    const lit = renderer.shadeFor(3, 1);
    const dim = renderer.shadeFor(3, 0.5);
    expect(dim.r).toBeCloseTo(lit.r * 0.5);
    expect(dim.g).toBeCloseTo(lit.g * 0.5);
    expect(dim.b).toBeCloseTo(lit.b * 0.5);
  });

  it('skips the floor and ceiling pass when those textures are absent', () => {
    // renderer has no frame buffer here, so touching it would throw
    expect(() => renderer.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, 64, 36)).not.toThrow();
  });
});
