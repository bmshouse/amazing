// Test for timer UI display reset behavior
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../modules/GameState.js';

describe('Timer UI Reset Behavior', () => {
  let gameState;
  let mockHudTimer;
  let mockRestart;

  beforeEach(() => {
    gameState = new GameState();

    // Mock the timer element
    mockHudTimer = {
      textContent: '00:00'
    };

    // Mock the restart function behavior (simulating main.js line 514)
    mockRestart = () => {
      gameState.resetForRestart();
      // This simulates the UI update line that was added: hud.timer.textContent = gameState.getFormattedTime();
      mockHudTimer.textContent = gameState.getFormattedTime();
    };
  });

  it('should immediately update timer display to 00:00 when reset is called', () => {
    // Start game and simulate some running time
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // Set a fake timer value to simulate time passing
    mockHudTimer.textContent = '01:23';
    expect(mockHudTimer.textContent).toBe('01:23');

    // Call restart (simulating 'R' key press)
    mockRestart();

    // Timer display should immediately show 00:00
    expect(mockHudTimer.textContent).toBe('00:00');
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.getFormattedTime()).toBe('00:00');
  });

  it('should show 00:00 immediately after reset without waiting for game start', () => {
    // Simulate a game that was running
    gameState.startGame();
    mockHudTimer.textContent = '02:45';

    // Reset the game
    mockRestart();

    // Timer should show 00:00 immediately, not the old time
    expect(mockHudTimer.textContent).toBe('00:00');

    // Game is not started, so timer should remain at 00:00
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.getFormattedTime()).toBe('00:00');
  });

  it('should handle multiple resets correctly', () => {
    // First reset
    mockRestart();
    expect(mockHudTimer.textContent).toBe('00:00');

    // Start and set some time
    gameState.startGame();
    mockHudTimer.textContent = '00:30';

    // Second reset
    mockRestart();
    expect(mockHudTimer.textContent).toBe('00:00');

    // Third reset (should still work)
    mockRestart();
    expect(mockHudTimer.textContent).toBe('00:00');
  });

  it('should maintain 00:00 display until next game start', () => {
    // Reset and verify initial state
    mockRestart();
    expect(mockHudTimer.textContent).toBe('00:00');

    // Multiple calls to getFormattedTime should still return 00:00
    expect(gameState.getFormattedTime()).toBe('00:00');
    expect(gameState.getFormattedTime()).toBe('00:00');

    // Timer display should remain 00:00 until next start
    expect(mockHudTimer.textContent).toBe('00:00');
  });

  it('should work correctly when game is restarted with Enter', () => {
    // Reset first
    mockRestart();
    expect(mockHudTimer.textContent).toBe('00:00');
    expect(gameState.isStarted()).toBe(false);

    // Start game again (simulating Enter key)
    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    // Timer should start from 00:00 and begin counting
    expect(gameState.getFormattedTime()).toBe('00:00');

    // After starting, the game loop would update the timer display
    // This simulates what happens in the main game loop
    mockHudTimer.textContent = gameState.getFormattedTime();
    expect(mockHudTimer.textContent).toBe('00:00');
  });
});