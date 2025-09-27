// Test the game timing and restart behavior
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../modules/GameState.js';

describe('Game Timing and Restart', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  it('initial state should not be started', () => {
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.isWon()).toBe(false);
  });

  it('startGame should start the timer', () => {
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);
    expect(gameState.isWon()).toBe(false);
  });

  it('restartGame should immediately start timer (legacy behavior)', () => {
    gameState.restartGame();
    expect(gameState.isStarted()).toBe(true);
    expect(gameState.isWon()).toBe(false);
  });

  it('resetForRestart should NOT start timer until explicitly started', () => {
    // First start a game
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // Reset for restart should stop the timer and wait
    gameState.resetForRestart();
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.isWon()).toBe(false);

    // Timer should only start when explicitly started again
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);
  });

  it('resetForRestart should clear elapsed time', () => {
    gameState.startGame();

    // Simulate some elapsed time
    gameState.updateElapsed();

    gameState.resetForRestart();

    // Elapsed time should be reset
    expect(gameState.getState().elapsed).toBe(0);
    expect(gameState.getState().startTime).toBe(0);
  });

  it('formatted time should work correctly', () => {
    gameState.startGame();

    // Should start at 00:00
    const initialTime = gameState.getFormattedTime();
    expect(initialTime).toMatch(/^\d{2}:\d{2}$/);
  });
});