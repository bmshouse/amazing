// Test for timer reset behavior when pressing 'R'
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../modules/GameState.js';

describe('Timer Reset Behavior', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  it('should show 00:00 immediately after reset', () => {
    // Start the game
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // Reset the game (simulating 'R' key press)
    gameState.resetForRestart();

    // Timer should immediately show 00:00
    expect(gameState.getFormattedTime()).toBe('00:00');
    expect(gameState.isStarted()).toBe(false);
  });

  it('should show 00:00 when not started', () => {
    // Game is not started
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.getFormattedTime()).toBe('00:00');
  });

  it('should reset state properly', () => {
    // Start the game
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // Reset using resetForRestart (called when 'R' is pressed)
    gameState.resetForRestart();

    // Check all state is reset
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.isWon()).toBe(false);
    expect(gameState.getFormattedTime()).toBe('00:00');

    // Should be able to start again
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);
  });

  it('should handle restart vs reset correctly', () => {
    // Start game
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // restartGame() should keep game running but reset timer
    gameState.restartGame();
    expect(gameState.isStarted()).toBe(true);

    // resetForRestart() should stop game and reset timer
    gameState.resetForRestart();
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.getFormattedTime()).toBe('00:00');
  });

  it('should maintain consistent timer state', () => {
    // Multiple reset calls should be stable
    expect(gameState.getFormattedTime()).toBe('00:00');

    gameState.resetForRestart();
    expect(gameState.getFormattedTime()).toBe('00:00');

    gameState.resetForRestart();
    expect(gameState.getFormattedTime()).toBe('00:00');
  });
});