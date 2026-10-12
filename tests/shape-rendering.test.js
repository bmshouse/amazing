// Test the shape rendering system
import { describe, it, expect, beforeEach } from 'vitest';
import { SpriteRenderer } from '../modules/SpriteRenderer.js';
import { ENEMY_STATES, GameConfig } from '../modules/GameConfig.js';

describe('Shape Rendering System', () => {
  let canvas, renderer, mockPlayer;

  beforeEach(() => {
    // Create a mock canvas
    canvas = {
      getContext: () => ({
        globalAlpha: 1,
        fillStyle: '',
        beginPath: () => {},
        ellipse: () => {},
        fillRect: () => {},
        fill: () => {},
        moveTo: () => {},
        bezierCurveTo: () => {}
      })
    };

    renderer = new SpriteRenderer(canvas);

    mockPlayer = {
      x: 5,
      y: 5,
      a: 0
    };
  });

  it('has shape drawing methods', () => {
    expect(typeof renderer._drawShape).toBe('function');
    expect(typeof renderer._drawEllipseShape).toBe('function');
    expect(typeof renderer._drawRectangleShape).toBe('function');
    expect(typeof renderer._drawSnowmanShape).toBe('function');
  });

  it('drawExitDoor uses rectangle shape', () => {
    const exitData = { wallX: 1, wallY: 1 };

    // Should not throw an error
    expect(() => {
      renderer.drawExitDoor(exitData, mockPlayer, 800, 600, '#ff0000');
    }).not.toThrow();
  });

  describe('exit marker handover', () => {
    // 5x5 room, exit walkway cell (3, 2), door cell (4, 2)
    const makeRoom = () => {
      const grid = Array.from({ length: 5 }, () => Array(5).fill(1));
      for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) grid[y][x] = 0;
      grid[2][4] = 2;
      return {
        grid,
        cellAt: (x, y) => grid[Math.floor(y)]?.[Math.floor(x)] ?? 1
      };
    };
    const exitData = { x: 3, y: 2, wallX: 4, wallY: 2 };

    it('skips the marker when the glowing door is in view', () => {
      const calls = [];
      renderer._drawBillboard = (...args) => calls.push(args);
      renderer.drawExitDoor(exitData, { x: 1.5, y: 2.5, a: 0 }, 800, 600, '#00ff00', makeRoom());
      expect(calls).toHaveLength(0);
    });

    it('draws the marker, on the door face, when walls hide the door', () => {
      const calls = [];
      renderer._drawBillboard = (...args) => calls.push(args);
      const room = makeRoom();
      room.grid[2][2] = 1; // pillar between the player and the door
      renderer.drawExitDoor(exitData, { x: 1.5, y: 2.5, a: 0 }, 800, 600, '#00ff00', room);
      expect(calls).toHaveLength(1);
      const [x, y] = calls[0];
      // Door face is the boundary between walkway cell x=3 and door cell x=4
      expect(x).toBeCloseTo(4);
      expect(y).toBeCloseTo(2.5);
    });
  });

  describe('snowman face', () => {
    const origin = { x: 0, y: 0, a: 0 };

    it('reports front 1 when the snowman looks straight at the player', () => {
      const f = renderer.getSnowmanFacing({ x: 2, y: 0, heading: Math.PI }, origin);
      expect(f.front).toBeCloseTo(1);
      expect(f.side).toBeCloseTo(0);
    });

    it('reports front -1 when it faces away', () => {
      const f = renderer.getSnowmanFacing({ x: 2, y: 0, heading: 0 }, origin);
      expect(f.front).toBeCloseTo(-1);
      expect(f.side).toBeCloseTo(0);
    });

    it('reports which side of the screen it looks toward', () => {
      // Player looks along +x, so +y is screen-right
      expect(renderer.getSnowmanFacing({ x: 2, y: 0, heading: Math.PI / 2 }, origin).side).toBeCloseTo(1);
      expect(renderer.getSnowmanFacing({ x: 2, y: 0, heading: -Math.PI / 2 }, origin).side).toBeCloseTo(-1);
    });

    it('looks at the player when it has no heading', () => {
      const f = renderer.getSnowmanFacing({ x: 2, y: 1 }, origin);
      expect(f.front).toBeCloseTo(1);
      expect(f.side).toBeCloseTo(0);
    });

    describe('drawing', () => {
      let counts;
      beforeEach(() => {
        counts = {};
        const count = (name) => () => { counts[name] = (counts[name] || 0) + 1; };
        renderer.ctx = {
          ellipse: count('ellipse'), fillRect: count('fillRect'), fill: count('fill'), stroke: count('stroke'),
          beginPath: () => {}, moveTo: () => {}, lineTo: count('lineTo'), closePath: () => {}
        };
      });
      const draw = (facing, state = ENEMY_STATES.IDLE, size = 40) =>
        renderer._drawSnowmanShape(100, 100, size, '#fff', 1, { facing, state });

      it('draws only the body when the snowman is tiny', () => {
        draw({ side: 0, front: 1 }, ENEMY_STATES.IDLE, 2);
        expect(counts.ellipse).toBe(3);
        expect(counts.fillRect).toBeUndefined();
      });

      it('draws eyes and nose from the front but not from behind', () => {
        draw({ side: 0, front: 1 });
        const front = counts.ellipse;
        counts = {};
        draw({ side: 0, front: -1 });
        const back = counts.ellipse;
        expect(front).toBeGreaterThan(back);
        expect(back).toBe(10); // three spheres (base, shade, lit patch each) plus the scarf band only
      });

      it('points a triangular nose out sideways when turned', () => {
        draw({ side: 1, front: 0 });
        expect(counts.lineTo).toBeGreaterThan(0);
      });

      it('draws X eyes when stunned and flat lines when asleep', () => {
        draw({ side: 0, front: 1 }, ENEMY_STATES.STUNNED);
        expect(counts.stroke).toBe(2); // one X per eye
        counts = {};
        draw({ side: 0, front: 1 }, ENEMY_STATES.TRANQ);
        expect(counts.fillRect).toBe(3); // scarf tail plus two closed eyes
      });
    });
  });

  describe('snowman grounding', () => {
    // Where the base sphere's lowest point lands for a snowman d units straight ahead
    const baseBottom = (d, H) => {
      const calls = [];
      renderer.ctx = {
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fill: () => {},
        fillRect: () => {}, stroke: () => {}, ellipse: (...args) => calls.push(args)
      };
      renderer.drawEnemy({ x: d, y: 0, heading: Math.PI, state: ENEMY_STATES.IDLE }, { x: 0, y: 0, a: 0 }, 800, H, null, {}, null, -Math.PI * 250); // now where the hop is at its lowest
      const [, cy, , ry] = calls[0]; // first ellipse is the base sphere's body fill
      return cy + ry;
    };

    it('stands the snowman on the floor line at any distance', () => {
      for (const d of [1.5, 3, 6, 12]) {
        const H = 600;
        const floorY = H / 2 + 0.5 * (H / d); // the floor is half a wall-height below the horizon
        expect(baseBottom(d, H)).toBeCloseTo(floorY, 0);
      }
    });
  });

  it('draws the head across eye level so the crosshair hits it, as in 3D', () => {
    const H = 600, d = 4;
    const calls = [];
    renderer.ctx = {
      beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fill: () => {},
      fillRect: () => {}, stroke: () => {}, ellipse: (...args) => calls.push(args)
    };
    renderer.drawEnemy({ x: d, y: 0, heading: Math.PI, state: ENEMY_STATES.IDLE }, { x: 0, y: 0, a: 0 }, 800, H, null, {}, null, -Math.PI * 250); // now where the hop is at its lowest
    const [, cy, , ry] = calls[6]; // third sphere's (the head's) body fill
    expect(cy - ry).toBeLessThan(H / 2);
    expect(cy + ry).toBeGreaterThan(H / 2);
  });

  it('spins a stunned snowman and hops an idle one, like the 3D model', () => {
    const player = { x: 0, y: 0, a: 0 };
    const faces = [], ys = [];
    renderer._drawShape = (shape, x, y, size, color, alpha, options) => { faces.push(options.facing); ys.push(y); };
    const period = GameConfig.RENDERING.SNOWMAN_SPIN_PERIOD;
    for (const now of [0, period * Math.PI / 2]) {
      renderer.drawEnemy({ x: 4, y: 0, state: ENEMY_STATES.STUNNED }, player, 800, 600, null, {}, null, now);
    }
    expect(faces[0].front).toBeCloseTo(1);
    expect(faces[1].side).toBeCloseTo(1);

    ys.length = 0;
    const hop = GameConfig.RENDERING.SNOWMAN_HOP_PERIOD;
    for (const now of [-hop * Math.PI / 2, hop * Math.PI / 2]) {
      renderer.drawEnemy({ x: 4, y: 0, state: ENEMY_STATES.IDLE }, player, 800, 600, null, {}, null, now);
    }
    expect(ys[1]).toBeLessThan(ys[0]); // higher on screen at the top of the hop
  });

  it('drawEnemy uses snowman shape', () => {
    const enemy = { x: 3, y: 3, state: 'normal' };
    const maze = { cellAt: () => 0 }; // Open space
    const colors = { entity: '#0000ff' };

    // Should not throw an error
    expect(() => {
      renderer.drawEnemy(enemy, mockPlayer, 800, 600, maze, colors, '#ff0000');
    }).not.toThrow();
  });

  it('drawParticle uses ellipse shape', () => {
    const particle = { x: 4, y: 4, color: '#00ff00' };

    // Should not throw an error
    expect(() => {
      renderer.drawParticle(particle, mockPlayer, 800, 600);
    }).not.toThrow();
  });

  it('drawParticle uses heart shape for boop particles', () => {
    // Import GameConfig to get the boop particle color
    const GameConfig = { COLORS: { PARTICLE_BOOP: '#ff69b4' } };
    const boopParticle = { x: 4, y: 4, color: GameConfig.COLORS.PARTICLE_BOOP };

    // Should not throw an error
    expect(() => {
      renderer.drawParticle(boopParticle, mockPlayer, 800, 600);
    }).not.toThrow();
  });

  it('caps boop heart size when the snowman is right up close', () => {
    const sizes = [];
    renderer._drawShape = (...args) => sizes.push(args[3]);
    const boop = GameConfig.COLORS.PARTICLE_BOOP;
    renderer.drawParticle({ x: 5.1, y: 5, color: boop }, mockPlayer, 800, 600);
    renderer.drawParticle({ x: 5.1, y: 5, color: '#00ff00' }, mockPlayer, 800, 600);
    expect(sizes[0]).toBeCloseTo(GameConfig.PARTICLES.BOOP_HEART_MAX_SIZE * 600);
    expect(sizes[1]).toBeGreaterThan(sizes[0]); // other particles stay uncapped
  });

  it('has heart shape drawing method', () => {
    expect(typeof renderer._drawHeartShape).toBe('function');
  });
});