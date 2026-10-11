// tests/enemy-pathfinding.test.js - enemies follow maze corridors instead of pushing into walls
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyController } from '../modules/enemies.js';
import { Maze } from '../modules/maze.js';
import { GameConfig, ENEMY_STATES } from '../modules/GameConfig.js';

// Snake corridor: row 1 and row 3 are joined only through (5, 2)
//   1111111
//   1000001
//   1111101
//   1000001
//   1111111
const makeSnakeMaze = () => {
  const maze = new Maze(7, 5, 0);
  maze.grid = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ];
  return maze;
};

const makeEnemy = (x, y) => ({
  x, y, state: ENEMY_STATES.IDLE, stateTime: performance.now(), speed: GameConfig.ENEMIES.SPEED, speedMul: 1
});

describe('Enemy path-finding', () => {
  let maze, player, enemies;

  beforeEach(() => {
    maze = makeSnakeMaze();
    player = { x: 3.5, y: 3.5 };
    enemies = new EnemyController(maze, player);
    enemies.entities = [];
  });

  it('walks around a wall to reach a player who is close by path but behind the wall', () => {
    // Straight-line distance is ~2.8 through the wall; the real route is 4 cells
    const enemy = makeEnemy(5.5, 1.5);
    enemies.entities.push(enemy);

    let reached = false;
    for (let i = 0; i < 600 && !reached; i++) {
      enemies.update(16, maze);
      expect(maze.cellAt(enemy.x, enemy.y)).toBe(0);
      reached = Math.hypot(player.x - enemy.x, player.y - enemy.y) < GameConfig.ENEMIES.COLLISION_DISTANCE;
    }
    expect(reached).toBe(true);
    expect(enemy.chasing).toBe(true);
  });

  it('does not chase when the player is farther away by path than the chase distance', () => {
    // Straight-line ~2 units, but the path is 10 cells
    player.x = 1.5; player.y = 3.5;
    const enemy = makeEnemy(1.5, 1.5);
    enemies.entities.push(enemy);

    enemies.update(16, maze);
    expect(enemy.chasing).toBe(false);
  });

  it('wanders along open cells at a reduced speed when the player is unreachable', () => {
    maze.grid[2][5] = 1; // seal the only link so the player's corridor is cut off
    player.x = 1.5; player.y = 3.5;
    const enemy = makeEnemy(1.5, 1.5);
    enemies.entities.push(enemy);
    const start = { x: enemy.x, y: enemy.y };

    for (let i = 0; i < 200; i++) {
      enemies.update(16, maze);
      expect(maze.cellAt(enemy.x, enemy.y)).toBe(0);
    }
    const travelled = Math.hypot(enemy.x - start.x, enemy.y - start.y);
    expect(travelled).toBeGreaterThan(0.5);
    // 200 frames * 16ms * speed * wander factor is the most it can have moved
    const maxTravel = (200 * 16 / 1000) * GameConfig.ENEMIES.SPEED * GameConfig.ENEMIES.WANDER_SPEED_FACTOR;
    expect(travelled).toBeLessThanOrEqual(maxTravel + 1e-6);
  });

  it('never chases a tranquilized enemy', () => {
    const enemy = { ...makeEnemy(5.5, 1.5), state: ENEMY_STATES.TRANQ, speedMul: 0 };
    enemies.entities.push(enemy);
    enemies.update(16, maze);
    expect(enemy.chasing).toBe(false);
    expect(enemy.x).toBe(5.5);
    expect(enemy.y).toBe(1.5);
  });

  it('rebuilds the flow field only when the player changes cell', () => {
    enemies.entities.push(makeEnemy(5.5, 1.5));
    enemies.update(16, maze);
    const first = enemies.flowField;
    player.x += 0.2; // same cell
    enemies.update(16, maze);
    expect(enemies.flowField).toBe(first);
    player.x = 4.5; // new cell
    enemies.update(16, maze);
    expect(enemies.flowField).not.toBe(first);
  });

  it('copes with a player standing in a wall cell (no chasing, no crash)', () => {
    player.x = 0.5; player.y = 0.5;
    const enemy = makeEnemy(5.5, 1.5);
    enemies.entities.push(enemy);
    expect(() => enemies.update(16, maze)).not.toThrow();
    expect(enemy.chasing).toBe(false);
  });

  describe('disabled enemies in a corridor', () => {
    // Player stands right next to an enemy inside the one-cell-wide corridor
    const collide = (state, speedMul) => {
      player.x = 3.5; player.y = 1.5;
      const enemy = { ...makeEnemy(3.9, 1.5), state, speedMul };
      enemies.entities.push(enemy);
      let boops = 0;
      enemies.onBoop = () => { boops++; };
      const start = { x: player.x, y: player.y };
      enemies.update(16, maze);
      return { moved: player.x !== start.x || player.y !== start.y, boops };
    };

    it('lets the player walk through a stunned enemy', () => {
      expect(collide(ENEMY_STATES.STUNNED, 0)).toEqual({ moved: false, boops: 0 });
    });

    it('lets the player walk through a tranquilized enemy', () => {
      expect(collide(ENEMY_STATES.TRANQ, 0)).toEqual({ moved: false, boops: 0 });
    });

    it('still pushes the player back from active and slowed enemies', () => {
      expect(collide(ENEMY_STATES.IDLE, 1)).toMatchObject({ moved: true, boops: 1 });
      enemies.entities = [];
      expect(collide(ENEMY_STATES.SLOWED, 0.35)).toMatchObject({ moved: true, boops: 1 });
    });

    it('pushes again once a stunned enemy recovers', () => {
      player.x = 3.5; player.y = 1.5;
      const enemy = { ...makeEnemy(3.9, 1.5), state: ENEMY_STATES.STUNNED, speedMul: 0, stateTime: performance.now() - 10_000 };
      enemies.entities.push(enemy);
      let boops = 0;
      enemies.onBoop = () => { boops++; };
      enemies.update(16, maze); // stun duration long expired: back to idle, boop resumes
      expect(enemy.state).toBe(ENEMY_STATES.IDLE);
      expect(boops).toBe(1);
    });
  });

  describe('smart push', () => {
    // Player deep in the lower corridor (8 cells from the start by path); the start is
    // up-left through a wall, but the way back goes east, up through (5, 2), then west.
    const bump = (smart) => {
      GameConfig.ENEMIES.SMART_PUSH_ENABLED = smart;
      player.x = 3.5; player.y = 3.5;
      enemies.entities.push({ ...makeEnemy(3.9, 3.5), speedMul: 0 });
      enemies.update(16, maze);
    };
    afterEach(() => { GameConfig.ENEMIES.SMART_PUSH_ENABLED = false; });

    it('pushes along the corridor toward the start, not straight at it through walls', () => {
      bump(true);
      expect(player.x).toBeGreaterThan(3.5);
      expect(maze.cellAt(player.x, player.y)).toBe(0);
    });

    it('still pushes radially away from the snowman when disabled', () => {
      bump(false);
      expect(player.x).toBeLessThan(3.5);
    });

    it('rebuilds the start field when the maze changes', () => {
      bump(true);
      const first = enemies.startField;
      enemies.reset(maze);
      expect(enemies.startField).toBeNull();
      expect(first).not.toBeNull();
    });
  });

  describe('snowman heading', () => {
    it('gives every spawned enemy a numeric heading', () => {
      const bigMaze = new Maze(21, 21, 0);
      bigMaze.generate();
      const spawned = new EnemyController(bigMaze, { x: 1.5, y: 1.5 });
      expect(spawned.entities.length).toBeGreaterThan(0);
      spawned.entities.forEach(e => expect(Number.isFinite(e.heading)).toBe(true));
    });

    it('swings toward the direction of travel while chasing around a corner', () => {
      const enemy = { ...makeEnemy(5.5, 1.5), heading: 0 }; // facing east, but the route turns south
      enemies.entities.push(enemy);
      for (let i = 0; i < 40; i++) enemies.update(16, maze);
      expect(enemy.heading).toBeGreaterThan(Math.PI / 2 - 0.2);
      expect(enemy.heading).toBeLessThan(Math.PI / 2 + 0.2);
    });

    it('turns no faster than the configured turn rate', () => {
      const enemy = { ...makeEnemy(5.5, 1.5), heading: 0 };
      enemies.entities.push(enemy);
      enemies.update(16, maze);
      const maxTurn = GameConfig.ENEMIES.TURN_RATE * 16 / 1000;
      expect(Math.abs(enemy.heading)).toBeLessThanOrEqual(maxTurn + 1e-9);
      expect(enemy.heading).toBeGreaterThan(0);
    });

    it('keeps its heading when it cannot move', () => {
      const enemy = { ...makeEnemy(5.5, 1.5), state: ENEMY_STATES.TRANQ, speedMul: 0, heading: 1.25 };
      enemies.entities.push(enemy);
      for (let i = 0; i < 10; i++) enemies.update(16, maze);
      expect(enemy.heading).toBe(1.25);
    });

    it('takes the short way round when the target is across the +/-PI seam', () => {
      const enemy = { ...makeEnemy(5.5, 1.5), heading: Math.PI - 0.05 };
      enemies.entities.push(enemy);
      maze.grid[2][5] = 1; // block the way south so it keeps wandering/turning west or east
      enemies.faceMovement(enemy, 5.5, 1.5, 0); // zero dt: no turn
      expect(enemy.heading).toBeCloseTo(Math.PI - 0.05);
      enemy.x = 5.4; // moved west: desired heading is PI, a tiny turn
      enemies.faceMovement(enemy, 5.5, 1.5, 100);
      expect(enemy.heading).toBeCloseTo(Math.PI);
    });
  });
});
