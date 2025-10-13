// tests/enemy-pushback.test.js - Tests for enemy pushback behavior
import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyController } from '../modules/enemies.js';
import { Maze } from '../modules/maze.js';
import { GameConfig } from '../modules/GameConfig.js';

describe('Enemy Pushback Behavior', () => {
  let maze;
  let player;
  let enemies;

  beforeEach(() => {
    // Create a simple 5x5 maze for testing
    maze = new Maze(5, 5, 0);
    // Don't generate - manually create an open maze for predictable tests
    maze.grid = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1]
    ];
    maze.exit = { x: 3, y: 3, wallX: 4, wallY: 3 };

    // Create a player at a known position in walkable space
    player = {
      x: 2.0,
      y: 2.0
    };

    // Create enemy controller
    enemies = new EnemyController(maze, player);
  });

  describe('isPlayerBetweenEnemyAndExit', () => {
    it('should return true when player is closer to exit than enemy by path', () => {
      // In the 3x3 open maze, everyone at row 1-3, col 1-3 can reach any point
      // Exit at (3, 3), Player at (2, 2), Enemy at (1, 1)
      const enemy = { x: 1.5, y: 1.5 };  // Grid (1,1) - 4 steps from (3,3)
      const testPlayer = { x: 2.5, y: 2.5 }; // Grid (2,2) - 2 steps from (3,3)
      const exit = { x: 3, y: 3 };  // Grid (3,3)

      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, testPlayer, exit);
      expect(result).toBe(true);
    });

    it('should return false when enemy is closer to exit than player by path', () => {
      // Enemy at (3, 3) is 0 steps from exit
      // Player at (1, 1) is 4 steps from exit
      const enemy = { x: 2.5, y: 2.5 };  // Grid (2,2) - 2 steps from (3,3)
      const testPlayer = { x: 1.5, y: 1.5 };  // Grid (1,1) - 4 steps from (3,3)
      const exit = { x: 3, y: 3 };  // Grid (3,3)

      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, testPlayer, exit);
      expect(result).toBe(false);
    });

    it('should return false when player and enemy are equidistant from exit by path', () => {
      // Both at same distance from exit (3,3)
      const enemy = { x: 1.5, y: 3.5 };  // Grid (1,3) - 2 steps from (3,3)
      const testPlayer = { x: 3.5, y: 1.5 };  // Grid (3,1) - 2 steps from (3,3)
      const exit = { x: 3, y: 3 };  // Grid (3,3)

      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, testPlayer, exit);
      expect(result).toBe(false);
    });

    it('should handle player at exit position', () => {
      const enemy = { x: 1.5, y: 1.5 };
      const testPlayer = { x: 4.5, y: 4.5 };
      const exit = { x: 4.5, y: 4.5 };

      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, testPlayer, exit);
      expect(result).toBe(true);
    });

    it('should handle enemy at exit position', () => {
      const enemy = { x: 4.5, y: 4.5 };
      const testPlayer = { x: 2.5, y: 2.5 };
      const exit = { x: 4.5, y: 4.5 };

      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, testPlayer, exit);
      expect(result).toBe(false);
    });
  });

  describe('Pushback Direction Logic', () => {
    beforeEach(() => {
      // Clear default enemies and add a single test enemy
      enemies.entities = [];
    });

    it('should pull player toward enemy when player is closer to exit by path', () => {
      // Setup: Player closer to exit by path, enemy behind player
      // Exit at (3, 3), Player at (2.3, 2.3), Enemy at (1.8, 1.8)
      player.x = 2.3;
      player.y = 2.3;

      // Position enemy within collision distance (< 0.6) but farther from exit by path
      const enemy = {
        x: 1.9,  // 0.4 away from player in X
        y: 1.9,  // 0.4 away from player in Y (total distance ~0.56)
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };
      enemies.entities.push(enemy);

      // Exit at (3, 3) - player is closer by path
      maze.exit = { x: 3, y: 3, wallX: 4, wallY: 3 };

      const initialPlayerX = player.x;
      const initialPlayerY = player.y;

      // Verify collision will trigger
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      expect(dist).toBeLessThan(GameConfig.ENEMIES.COLLISION_DISTANCE);

      // Verify player is closer to exit by path
      const playerPathDist = enemies.calculatePathDistance(player.x, player.y, maze.exit.x, maze.exit.y, maze);
      const enemyPathDist = enemies.calculatePathDistance(enemy.x, enemy.y, maze.exit.x, maze.exit.y, maze);
      expect(playerPathDist).toBeLessThan(enemyPathDist);

      // Update enemies (this triggers pushback logic)
      enemies.update(16, maze);

      // Player should be pulled toward enemy (away from exit)
      // Enemy is at lower x,y so player should move to lower x,y
      expect(player.x).toBeLessThan(initialPlayerX);
      expect(player.y).toBeLessThan(initialPlayerY);
    });

    it('should push player away from enemy when enemy is closer to exit', () => {
      // Setup: Player at (1.5,1.5), Enemy at (3,3), Exit at (4,4)
      // Enemy is closer to exit
      player.x = 1.5;
      player.y = 1.5;

      const enemy = {
        x: 3.0,
        y: 3.0,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };
      enemies.entities.push(enemy);

      // Set exit position
      maze.exit = { x: 4.5, y: 4.5, wallX: 4, wallY: 4 };

      // Position enemy close enough to trigger pushback
      enemy.x = player.x + 0.3;
      enemy.y = player.y + 0.3;

      const initialPlayerX = player.x;
      const initialPlayerY = player.y;

      // Update enemies (this triggers pushback logic)
      enemies.update(16, maze);

      // Player should be pushed away from enemy (normal behavior)
      // Since enemy is at (1.8, 1.8) and player was at (1.5, 1.5)
      // Player should move away from enemy (lower x and y values)
      expect(player.x).toBeLessThan(initialPlayerX);
      expect(player.y).toBeLessThan(initialPlayerY);
    });

    it('should handle case when no exit is defined (fallback to normal push)', () => {
      // Setup with no exit
      player.x = 2.0;
      player.y = 2.0;

      // Position enemy within collision distance, above and to the right
      const enemy = {
        x: 2.3,  // 0.3 away from player
        y: 2.3,  // 0.3 away from player (total distance ~0.42)
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };
      enemies.entities.push(enemy);

      // Set exit to null
      maze.exit = null;

      const initialPlayerX = player.x;
      const initialPlayerY = player.y;

      // Verify collision will trigger
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      expect(dist).toBeLessThan(GameConfig.ENEMIES.COLLISION_DISTANCE);

      // Update enemies (should use normal push behavior as fallback)
      enemies.update(16, maze);

      // Player should be pushed away from enemy (normal behavior)
      // Since no exit is defined, should default to push away
      // Enemy at (2.3, 2.3), player at (2.0, 2.0) -> push toward lower x,y (away from enemy)
      expect(player.x).toBeLessThan(initialPlayerX);
      expect(player.y).toBeLessThan(initialPlayerY);
    });

    it('should not apply pushback when enemy is too far away', () => {
      // Setup with enemy far from player
      player.x = 1.5;
      player.y = 1.5;

      const enemy = {
        x: 4.5,
        y: 4.5,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };
      enemies.entities.push(enemy);

      maze.exit = { x: 5.5, y: 5.5, wallX: 5, wallY: 5 };

      const initialPlayerX = player.x;
      const initialPlayerY = player.y;

      // Update enemies
      enemies.update(16, maze);

      // Player position should not change (enemy too far)
      expect(player.x).toBe(initialPlayerX);
      expect(player.y).toBe(initialPlayerY);
    });
  });

  describe('Performance Optimizations', () => {
    it('should use fast line-of-sight check when both have clear view to exit', () => {
      // Setup simple open maze where both can see exit
      player.x = 2.0;
      player.y = 2.0;

      const enemy = {
        x: 1.5,
        y: 1.5,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };

      maze.exit = { x: 3, y: 3, wallX: 4, wallY: 3 };

      // Verify both have line of sight
      expect(enemies.hasLineOfSight(player.x, player.y, maze.exit.x, maze.exit.y, maze)).toBe(true);
      expect(enemies.hasLineOfSight(enemy.x, enemy.y, maze.exit.x, maze.exit.y, maze)).toBe(true);

      // This should use fast path (straight-line distance)
      const start = performance.now();
      const result = enemies.isPlayerBetweenEnemyAndExit(enemy, player, maze.exit);
      const elapsed = performance.now() - start;

      // Should be very fast (< 1ms)
      expect(elapsed).toBeLessThan(1);
      expect(result).toBe(true); // Player is closer
    });

    it('should cache pathfinding results for repeated calculations', () => {
      // Setup maze with walls
      maze.grid = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1]
      ];
      maze.w = 7;
      maze.h = 6;
      maze.exit = { x: 5, y: 4, wallX: 6, wallY: 4 };

      player.x = 2.0;
      player.y = 1.5;

      const enemy = { x: 2.3, y: 1.8, state: 'idle', stateTime: performance.now(), speed: 1, speedMul: 1 };

      // First call - will calculate and cache
      const start1 = performance.now();
      const result1 = enemies.isPlayerBetweenEnemyAndExit(enemy, player, maze.exit);
      const elapsed1 = performance.now() - start1;

      // Second call - should use cache
      const start2 = performance.now();
      const result2 = enemies.isPlayerBetweenEnemyAndExit(enemy, player, maze.exit);
      const elapsed2 = performance.now() - start2;

      // Second call should be much faster (cached)
      expect(elapsed2).toBeLessThan(elapsed1);
      expect(result1).toBe(result2); // Results should be identical
    });
  });

  describe('Maze Pathfinding Scenarios', () => {
    it('should correctly handle case where player must move away from exit to reach it', () => {
      // Setup a maze where player must go around a wall
      // Wall blocks direct path to exit
      maze.grid = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 1],  // Player at (2,1), Wall at (4,1)
        [1, 0, 0, 0, 1, 0, 1],  //
        [1, 0, 0, 0, 0, 0, 1],  // Opening at (4,3)
        [1, 0, 0, 0, 1, 0, 1],  // Exit at (5,4)
        [1, 1, 1, 1, 1, 1, 1]
      ];
      maze.w = 7;
      maze.h = 6;

      // Player at (2, 1) - close to exit by straight-line but far by path
      player.x = 2.0;
      player.y = 1.5;

      // Enemy at (2, 3) - farther by straight-line but actually on the path to exit
      const enemy = {
        x: 2.3,  // Close enough for collision
        y: 1.8,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };
      enemies.entities.push(enemy);

      // Exit at (5, 4)
      maze.exit = { x: 5, y: 4, wallX: 6, wallY: 4 };

      const initialPlayerX = player.x;
      const initialPlayerY = player.y;

      // Straight-line distances:
      // Player to exit: sqrt((5-2)^2 + (4-1.5)^2) = sqrt(9 + 6.25) = 3.9
      // Enemy to exit: sqrt((5-2.3)^2 + (4-1.8)^2) = sqrt(7.29 + 4.84) = 3.48
      // By straight-line: enemy appears closer to exit

      // But actual path distances (going around wall):
      // Player: must go down then right = ~7 units
      // Enemy: must go down then right = ~6 units (actually farther!)

      // Verify collision will trigger
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      expect(dist).toBeLessThan(GameConfig.ENEMIES.COLLISION_DISTANCE);

      // Calculate actual path distances using BFS
      const playerPathDist = enemies.calculatePathDistance(player.x, player.y, maze.exit.x, maze.exit.y, maze);
      const enemyPathDist = enemies.calculatePathDistance(enemy.x, enemy.y, maze.exit.x, maze.exit.y, maze);

      // Verify that by PATH distance, enemy is actually closer (or equal)
      // Both must go around the wall, so they have similar path lengths
      // This is the correct way to measure "between" in a maze
      expect(enemyPathDist).toBeLessThanOrEqual(playerPathDist);

      // Update enemies
      enemies.update(16, maze);

      // With path-based distance (new implementation):
      // Enemy is actually closer to exit by path, so should PUSH away (normal behavior)
      // Player should be pushed away from enemy (NOT pulled)
      expect(player.x).toBeLessThan(initialPlayerX);
      expect(player.y).toBeLessThan(initialPlayerY);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple enemies with different positions', () => {
      // Clear default enemies
      enemies.entities = [];

      player.x = 3.0;
      player.y = 3.0;

      // Enemy 1: Closer to exit (should pull)
      const enemy1 = {
        x: 2.7,
        y: 2.7,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };

      // Enemy 2: Farther from exit (should push - but too far to trigger)
      const enemy2 = {
        x: 1.0,
        y: 1.0,
        state: 'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      };

      enemies.entities.push(enemy1, enemy2);
      maze.exit = { x: 4.5, y: 4.5, wallX: 4, wallY: 4 };

      // Update should not throw errors
      expect(() => enemies.update(16, maze)).not.toThrow();
    });

    it('should handle tranquilized enemies (no pushback movement)', () => {
      enemies.entities = [];

      player.x = 2.5;
      player.y = 2.5;

      const enemy = {
        x: 2.3,
        y: 2.3,
        state: 'tranq',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 0
      };

      enemies.entities.push(enemy);
      maze.exit = { x: 4.5, y: 4.5, wallX: 4, wallY: 4 };

      const initialEnemyX = enemy.x;
      const initialEnemyY = enemy.y;

      // Update enemies
      enemies.update(16, maze);

      // Tranquilized enemy should not move toward player
      // (though pushback on collision still works)
      expect(Math.abs(enemy.x - initialEnemyX)).toBeLessThan(0.1);
      expect(Math.abs(enemy.y - initialEnemyY)).toBeLessThan(0.1);
    });
  });
});
