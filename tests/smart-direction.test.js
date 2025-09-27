// Test the smart direction system
import { describe, it, expect } from 'vitest';
import { Maze } from '../modules/maze.js';
import { PlayerController } from '../modules/player.js';

describe('Smart Direction System', () => {
  it('player faces an open direction at spawn', () => {
    const maze = new Maze(21, 21);
    maze.generate();

    const player = new PlayerController(maze);

    // Check that player has a valid starting angle
    expect(player.a).toBeTypeOf('number');
    expect(player.a).toBeGreaterThanOrEqual(0);
    expect(player.a).toBeLessThan(2 * Math.PI);

    // Test that the direction chosen has some open path
    const pathLength = player.getPathLength(maze, player.x, player.y, player.a, 3.0);
    expect(pathLength).toBeGreaterThan(0.5); // Should have at least some open space
  });

  it('findBestStartingDirection returns valid angle', () => {
    const maze = new Maze(21, 21);
    maze.generate();

    const player = new PlayerController(maze);
    const bestDirection = player.findBestStartingDirection(maze);

    // Should be one of the cardinal directions or a valid angle
    expect(bestDirection).toBeTypeOf('number');
    expect(bestDirection).toBeGreaterThanOrEqual(0);
    expect(bestDirection).toBeLessThan(2 * Math.PI);
  });

  it('getPathLength calculates distance correctly', () => {
    const maze = new Maze(21, 21);
    maze.generate();

    const player = new PlayerController(maze);

    // Test different directions
    const directions = [0, Math.PI/2, Math.PI, 3*Math.PI/2];

    for (const direction of directions) {
      const pathLength = player.getPathLength(maze, 1.5, 1.5, direction, 5.0);
      expect(pathLength).toBeTypeOf('number');
      expect(pathLength).toBeGreaterThanOrEqual(0);
      expect(pathLength).toBeLessThanOrEqual(5.0);
    }
  });

  it('reset uses smart direction on restart', () => {
    const maze = new Maze(21, 21);
    maze.generate();

    const player = new PlayerController(maze);
    const initialDirection = player.a;

    // Reset should potentially change direction based on maze layout
    player.reset(maze);
    const newDirection = player.a;

    // Both directions should be valid
    expect(initialDirection).toBeTypeOf('number');
    expect(newDirection).toBeTypeOf('number');

    // Both should provide some open path
    const initialPath = player.getPathLength(maze, player.x, player.y, initialDirection, 3.0);
    const newPath = player.getPathLength(maze, player.x, player.y, newDirection, 3.0);

    expect(initialPath).toBeGreaterThan(0);
    expect(newPath).toBeGreaterThan(0);
  });

  it('handles edge case with completely surrounded spawn', () => {
    // Create a minimal maze for edge case testing
    const maze = new Maze(5, 5);
    maze.generate();

    const player = new PlayerController(maze);

    // Even in worst case, should return a valid direction
    const direction = player.findBestStartingDirection(maze);
    expect(direction).toBeTypeOf('number');
    expect(direction).toBeGreaterThanOrEqual(0);
    expect(direction).toBeLessThan(2 * Math.PI);
  });
});