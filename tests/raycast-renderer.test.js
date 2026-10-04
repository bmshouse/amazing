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
    expect(() => renderer.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, maze, 64, 36)).not.toThrow();
  });

  describe('recharge pad floor tiles', () => {
    const solidTexture = (r, g, b) => ({
      width: 1,
      height: 1,
      getContext: () => ({ getImageData: () => ({ data: [r, g, b, 255] }) })
    });
    const channels = (px) => [px & 255, (px >> 8) & 255, (px >> 16) & 255];

    it('builds a per-cell pad lookup and reuses it until the pad list changes', () => {
      const m = makeMaze();
      m.pads = [{ x: 2, y: 1 }];
      const grid = renderer.getFloorMarkers(m);
      expect(grid.cells[1 * m.w + 2]).toBe(1);
      expect(grid.cells.reduce((a, b) => a + b, 0)).toBe(1);
      expect(renderer.getFloorMarkers(m)).toBe(grid);

      m.pads = [{ x: 1, y: 3 }];
      expect(renderer.getFloorMarkers(m)).not.toBe(grid);
    });

    it('returns no lookup for a maze without pads', () => {
      const m = makeMaze();
      m.pads = [];
      expect(renderer.getFloorMarkers(m)).toBeNull();
    });

    it('paints the pad texture on the floor cell where the pad is, and plain floor elsewhere', () => {
      const W = 40, H = 40;
      const m = makeMaze();
      m.pads = [{ x: 2, y: 1 }];
      const r = new RaycastRenderer({ getContext: () => ({}) }, {
        floor: solidTexture(120, 120, 120),
        ceiling: solidTexture(120, 120, 120),
        pad: solidTexture(0, 255, 0)
      });
      r.frame = { pixels: new Uint32Array(W * H) };

      // Facing east from the middle of cell (1, 1): the bottom-centre pixel looks at roughly (2.5, 1.5)
      r.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, m, W, H);
      const [red, green] = channels(r.frame.pixels[(H - 1) * W + W / 2]);
      expect(green).toBeGreaterThan(200);
      expect(red).toBeLessThan(60);

      // Same view with no pad shows the (tinted, so dimmer) floor colour instead of the bright pad green
      m.pads = [];
      r.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, m, W, H);
      const [r2, g2] = channels(r.frame.pixels[(H - 1) * W + W / 2]);
      expect(g2).toBeLessThan(150);
      expect(r2).toBeGreaterThan(30);
    });
  });

  describe('exit glow', () => {
    const solidTexture = (r, g, b) => ({
      width: 1,
      height: 1,
      getContext: () => ({ getImageData: () => ({ data: [r, g, b, 255] }) })
    });
    const channels = (px) => [px & 255, (px >> 8) & 255, (px >> 16) & 255];
    const makeGlowRenderer = (W, H) => {
      const r = new RaycastRenderer({ getContext: () => ({}) }, {
        wall: solidTexture(100, 100, 100),
        brick: solidTexture(100, 100, 100),
        door: solidTexture(100, 100, 100),
        floor: solidTexture(100, 100, 100),
        ceiling: solidTexture(100, 100, 100)
      });
      r.frame = { pixels: new Uint32Array(W * H) };
      return r;
    };

    it('marks the exit walkway cell as a floor marker', () => {
      const m = makeMaze();
      m.pads = [];
      m.exit = { x: 3, y: 2, wallX: 4, wallY: 2 };
      const grid = renderer.getFloorMarkers(m);
      expect(grid.cells[2 * m.w + 3]).toBe(2);
    });

    it('keeps the door bright at a distance where a plain wall has faded away', () => {
      const W = 8, H = 64;
      const r = makeGlowRenderer(W, H);
      const hit = { dist: 15, wallU: 0.5, side: 1, cellType: 2, mapX: 4, mapY: 2 };
      r.renderWallColumn(hit, 0, W, H);
      const [, doorGreen] = channels(r.frame.pixels[(H >> 1) * W]);

      r.renderWallColumn({ ...hit, cellType: 1 }, 0, W, H);
      const [, wallGreen] = channels(r.frame.pixels[(H >> 1) * W]);

      expect(doorGreen).toBeGreaterThan(wallGreen + 30);
    });

    it('lights the floor tile in front of the door', () => {
      const W = 40, H = 40;
      const m = makeMaze();
      m.pads = [];
      m.exit = { x: 2, y: 1, wallX: 3, wallY: 1 };
      const r = makeGlowRenderer(W, H);

      // Facing east from (1.5, 1.5): the bottom-centre pixel looks at roughly (2.5, 1.5), the exit's walkway cell
      r.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, m, W, H);
      const [litRed] = channels(r.frame.pixels[(H - 1) * W + W / 2]);

      m.exit = { x: 3, y: 3, wallX: 4, wallY: 3 };
      r.renderFloorAndCeiling({ x: 1.5, y: 1.5, a: 0 }, m, W, H);
      const [plainRed] = channels(r.frame.pixels[(H - 1) * W + W / 2]);

      expect(litRed).toBeGreaterThan(plainRed + 20);
    });
  });
});
