// tests/defenses-event-handlers.test.js - Test defenses event handling without duplicates
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Defenses } from '../modules/defenses.js';
import { Maze } from '../modules/maze.js';
import { PlayerController } from '../modules/player.js';
import { EnemyController } from '../modules/enemies.js';
import { EventSystemManager } from '../modules/EventSystemManager.js';

describe('Defenses Event Handling', () => {
  let maze, player, enemies, defenses, audio, hud, eventSystem;

  beforeEach(() => {
    // Set up test environment
    maze = new Maze(11, 11, 1);
    maze.generate();

    player = new PlayerController(maze);
    enemies = new EnemyController(maze, player);

    audio = { beep: vi.fn() };
    hud = {
      bars: {
        taser: { style: { transform: '' } },
        stun: { style: { transform: '' } },
        tranq: { style: { transform: '' } }
      }
    };

    defenses = new Defenses(player, enemies, audio, hud);
    eventSystem = new EventSystemManager();
    defenses.setEventManager(eventSystem);
  });

  it('should activate device via EventSystemManager mousedown', () => {
    // Mock pointer lock
    global.document.pointerLockElement = document.body;

    // Spy on activate method
    const activateSpy = vi.spyOn(defenses, 'activate');

    // Emit mousedown event through EventSystemManager
    eventSystem.emit('mousedown', {
      button: 0,
      event: { target: document.body }
    });

    expect(activateSpy).toHaveBeenCalledOnce();

    // Cleanup
    global.document.pointerLockElement = null;
  });

  it('should activate device via EventSystemManager keydown (Space)', () => {
    const activateSpy = vi.spyOn(defenses, 'activate');
    const preventDefaultSpy = vi.fn();

    // Emit keydown event through EventSystemManager
    eventSystem.emit('keydown', {
      code: 'Space',
      event: { preventDefault: preventDefaultSpy }
    });

    expect(activateSpy).toHaveBeenCalledOnce();
    expect(preventDefaultSpy).toHaveBeenCalledOnce();
  });

  it('should not activate device on mousedown without pointer lock', () => {
    // Ensure no pointer lock
    global.document.pointerLockElement = null;

    const activateSpy = vi.spyOn(defenses, 'activate');

    eventSystem.emit('mousedown', {
      button: 0,
      event: { target: document.body }
    });

    expect(activateSpy).not.toHaveBeenCalled();
  });

  it('should not activate device on right-click (button !== 0)', () => {
    global.document.pointerLockElement = document.body;

    const activateSpy = vi.spyOn(defenses, 'activate');

    eventSystem.emit('mousedown', {
      button: 2, // Right-click
      event: { target: document.body }
    });

    expect(activateSpy).not.toHaveBeenCalled();

    global.document.pointerLockElement = null;
  });

  it('should not activate device on click on UI elements', () => {
    global.document.pointerLockElement = document.body;

    const activateSpy = vi.spyOn(defenses, 'activate');

    // Create mock UI element
    const configButton = document.createElement('button');
    configButton.id = 'configButton';

    eventSystem.emit('mousedown', {
      button: 0,
      event: { target: configButton }
    });

    expect(activateSpy).not.toHaveBeenCalled();

    global.document.pointerLockElement = null;
  });

  it('should work with EventSystemManager only (no window listeners)', () => {
    // This test verifies that event handling works through EventSystemManager
    // without needing fallback window event listeners

    global.document.pointerLockElement = document.body;
    const activateSpy = vi.spyOn(defenses, 'activate');

    // Emit event through EventSystemManager
    eventSystem.emit('mousedown', {
      button: 0,
      event: { target: document.body }
    });

    expect(activateSpy).toHaveBeenCalledOnce();

    global.document.pointerLockElement = null;
  });
});

describe('Defenses UI Click Detection', () => {
  let defenses, maze, player, enemies, audio, hud;

  beforeEach(() => {
    maze = new Maze(11, 11, 1);
    maze.generate();
    player = new PlayerController(maze);
    enemies = new EnemyController(maze, player);

    audio = { beep: vi.fn() };
    hud = {
      bars: {
        taser: { style: { transform: '' } },
        stun: { style: { transform: '' } },
        tranq: { style: { transform: '' } }
      }
    };

    defenses = new Defenses(player, enemies, audio, hud);
  });

  it('should detect click on config button', () => {
    const configButton = document.createElement('button');
    configButton.id = 'configButton';

    const event = { target: configButton };
    expect(defenses.isClickOnUI(event)).toBe(true);
  });

  it('should detect click on config panel', () => {
    const configPanel = document.createElement('div');
    configPanel.id = 'configPanel';

    const event = { target: configPanel };
    expect(defenses.isClickOnUI(event)).toBe(true);
  });

  it('should detect click on HUD', () => {
    const hud = document.createElement('div');
    hud.id = 'hud';
    document.body.appendChild(hud);

    const hudElement = document.createElement('div');
    hud.appendChild(hudElement);

    const event = { target: hudElement };
    expect(defenses.isClickOnUI(event)).toBe(true);

    document.body.removeChild(hud);
  });

  it('should detect click on touch controls', () => {
    const touchControl = document.createElement('div');
    touchControl.className = 'touch-controls';
    document.body.appendChild(touchControl);

    const element = document.createElement('div');
    touchControl.appendChild(element);

    const event = { target: element };
    expect(defenses.isClickOnUI(event)).toBe(true);

    document.body.removeChild(touchControl);
  });

  it('should detect click on button elements', () => {
    const button = document.createElement('button');
    const event = { target: button };
    expect(defenses.isClickOnUI(event)).toBe(true);
  });

  it('should detect click on input elements', () => {
    const input = document.createElement('input');
    const event = { target: input };
    expect(defenses.isClickOnUI(event)).toBe(true);
  });

  it('should not detect click on canvas', () => {
    const canvas = document.createElement('canvas');
    const event = { target: canvas };
    expect(defenses.isClickOnUI(event)).toBe(false);
  });

  it('should handle missing target gracefully', () => {
    const event = { target: null };
    expect(defenses.isClickOnUI(event)).toBe(false);
  });
});
