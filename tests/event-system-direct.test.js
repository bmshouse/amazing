// Test direct usage of EventSystemManager and InputManager (bypassing EventManager wrapper)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventSystemManager } from '../modules/EventSystemManager.js';
import { InputManager } from '../modules/InputManager.js';

describe('Direct EventSystemManager Usage', () => {
  let eventSystem;

  beforeEach(() => {
    eventSystem = new EventSystemManager();
  });

  afterEach(() => {
    if (eventSystem) {
      eventSystem.destroy();
    }
  });

  it('should create EventSystemManager instance', () => {
    expect(eventSystem).toBeDefined();
    expect(typeof eventSystem.on).toBe('function');
    expect(typeof eventSystem.off).toBe('function');
    expect(typeof eventSystem.emit).toBe('function');
  });

  it('should subscribe and emit events', () => {
    const callback = vi.fn();
    eventSystem.on('test-event', callback);

    eventSystem.emit('test-event', { data: 'test' });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should unsubscribe from events', () => {
    const callback = vi.fn();
    eventSystem.on('test-event', callback);
    eventSystem.off('test-event', callback);

    eventSystem.emit('test-event', { data: 'test' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple subscribers', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    eventSystem.on('test-event', callback1);
    eventSystem.on('test-event', callback2);

    eventSystem.emit('test-event', { data: 'test' });

    expect(callback1).toHaveBeenCalledOnce();
    expect(callback2).toHaveBeenCalledOnce();
  });

  it('should support custom game events', () => {
    const callback = vi.fn();
    eventSystem.on('gamestart', callback);

    eventSystem.emit('gamestart');

    expect(callback).toHaveBeenCalled();
  });
});

describe('Direct InputManager Usage', () => {
  let inputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  afterEach(() => {
    if (inputManager) {
      inputManager.destroy();
    }
  });

  it('should create InputManager instance', () => {
    expect(inputManager).toBeDefined();
    expect(typeof inputManager.isKeyPressed).toBe('function');
    expect(typeof inputManager.getMovementInput).toBe('function');
    expect(typeof inputManager.getMouseMovement).toBe('function');
  });

  it('should have method for checking key presses', () => {
    // Test the API exists
    expect(typeof inputManager.isKeyPressed).toBe('function');

    // By default, no keys are pressed
    expect(inputManager.isKeyPressed('KeyW')).toBe(false);
  });

  it('should return movement input object', () => {
    const input = inputManager.getMovementInput();

    // Verify structure
    expect(input).toHaveProperty('forward');
    expect(input).toHaveProperty('back');
    expect(input).toHaveProperty('left');
    expect(input).toHaveProperty('right');
    expect(input).toHaveProperty('turnLeft');
    expect(input).toHaveProperty('turnRight');

    // All should be boolean
    expect(typeof input.forward).toBe('boolean');
    expect(typeof input.back).toBe('boolean');
    expect(typeof input.left).toBe('boolean');
    expect(typeof input.right).toBe('boolean');
  });

  it('should handle pointer lock state', () => {
    expect(inputManager.isPointerLocked()).toBe(false);
  });

  it('should get mouse movement', () => {
    const movement = inputManager.getMouseMovement();
    expect(movement).toHaveProperty('dx');
    expect(movement).toHaveProperty('dy');
    expect(typeof movement.dx).toBe('number');
    expect(typeof movement.dy).toBe('number');
  });

  it('should set movement joystick input', () => {
    // Test the API exists and doesn't throw
    expect(() => {
      inputManager.setMovementJoystickInput(0.5, 0.5, true);
    }).not.toThrow();
  });

  it('should clear input state', () => {
    // Set some joystick input
    inputManager.setMovementJoystickInput(0.5, 0.5, true);

    // Clear it
    expect(() => {
      inputManager.clearInputState();
    }).not.toThrow();

    // After clearing, input should be reset
    const input = inputManager.getMovementInput();
    expect(input.forward).toBe(false);
    expect(input.back).toBe(false);
    expect(input.left).toBe(false);
    expect(input.right).toBe(false);
  });

  it('should reset touch input', () => {
    inputManager.setMovementJoystickInput(0.8, 0.8, true);

    expect(() => {
      inputManager.resetTouchInput();
    }).not.toThrow();
  });
});

describe('EventSystemManager and InputManager Integration', () => {
  let eventSystem, inputManager;

  beforeEach(() => {
    eventSystem = new EventSystemManager();
    inputManager = new InputManager();
  });

  afterEach(() => {
    if (eventSystem) eventSystem.destroy();
    if (inputManager) inputManager.destroy();
  });

  it('should work together for game events', () => {
    // Test that EventSystem and InputManager can coexist
    const gamestartCallback = vi.fn();
    eventSystem.on('gamestart', gamestartCallback);

    // Emit game event
    eventSystem.emit('gamestart');

    // EventSystem should notify listeners
    expect(gamestartCallback).toHaveBeenCalled();

    // InputManager should still work independently
    const input = inputManager.getMovementInput();
    expect(input).toBeDefined();
  });

  it('should handle gamestart event', () => {
    const gamestartCallback = vi.fn();
    eventSystem.on('gamestart', gamestartCallback);

    eventSystem.emit('gamestart');

    expect(gamestartCallback).toHaveBeenCalledOnce();
  });

  it('should handle gameend event', () => {
    const gameendCallback = vi.fn();
    eventSystem.on('gameend', gameendCallback);

    eventSystem.emit('gameend');

    expect(gameendCallback).toHaveBeenCalledOnce();
  });

  it('should handle deviceconfig event', () => {
    const deviceconfigCallback = vi.fn();
    eventSystem.on('deviceconfig', deviceconfigCallback);

    const deviceConfig = {
      devices: {
        disruptor: { enabled: true, charges: 8 },
        immobilizer: { enabled: true, charges: 6 },
        pacifier: { enabled: true, charges: 4 }
      },
      mapping: {
        disruptor: 'taser',
        immobilizer: 'stun',
        pacifier: 'tranq'
      }
    };

    eventSystem.emit('deviceconfig', deviceConfig);

    expect(deviceconfigCallback).toHaveBeenCalledWith(deviceConfig);
  });

  it('should support pointer lock request', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // Mock requestPointerLock
    canvas.requestPointerLock = vi.fn();

    inputManager.requestPointerLock(canvas);

    expect(canvas.requestPointerLock).toHaveBeenCalled();

    document.body.removeChild(canvas);
  });
});
