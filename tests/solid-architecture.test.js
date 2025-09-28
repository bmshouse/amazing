// Test the new SOLID architecture
import { describe, it, expect } from 'vitest';
import { GameConfig } from '../modules/GameConfig.js';
import { DeviceFactory } from '../modules/devices/DeviceFactory.js';
import { RaycastRenderer } from '../modules/RaycastRenderer.js';
import { GameState } from '../modules/GameState.js';

describe('SOLID Architecture', () => {
  it('GameConfig provides centralized constants', () => {
    expect(GameConfig.PLAYER.SPEED).toBe(2.4);
    expect(GameConfig.DEVICES.TASER.MAX_CHARGES).toBe(8);
    expect(GameConfig.COLORS.EXIT_DOOR).toBe('#a8f8abff');
  });

  it('DeviceFactory creates device instances', () => {
    const taser = DeviceFactory.createDevice('taser');
    expect(taser.name).toBe('taser');
    expect(taser.maxCharges).toBe(8);
    expect(taser.canActivate()).toBe(true);

    const allDevices = DeviceFactory.createAllDevices();
    expect(Object.keys(allDevices)).toEqual(['taser', 'stun', 'tranq']);
  });

  it('GameState manages game lifecycle', () => {
    const gameState = new GameState();
    expect(gameState.isStarted()).toBe(false);
    expect(gameState.isWon()).toBe(false);

    gameState.startGame();
    expect(gameState.isStarted()).toBe(true);

    gameState.winGame();
    expect(gameState.isWon()).toBe(true);
    expect(gameState.isStarted()).toBe(false);
  });

  it('Devices follow Open/Closed Principle', () => {
    const devices = DeviceFactory.getAvailableDevices();
    expect(devices.length).toBeGreaterThan(0);

    // Each device should have consistent interface
    devices.forEach(deviceType => {
      const device = DeviceFactory.createDevice(deviceType);
      expect(typeof device.activate).toBe('function');
      expect(typeof device.canActivate).toBe('function');
      expect(typeof device.getChargeRatio).toBe('function');
    });
  });

  it('Dependency Inversion - high level modules depend on abstractions', () => {
    // RaycastRenderer depends on canvas interface, not concrete implementation
    const mockCanvas = {
      getContext: () => ({
        fillStyle: '',
        fillRect: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        globalAlpha: 1,
        globalCompositeOperation: 'source-over'
      })
    };

    const mockTextures = {
      wall: { width: 64, height: 64 },
      brick: { width: 64, height: 64 },
      door: { width: 64, height: 64 }
    };

    expect(() => {
      new RaycastRenderer(mockCanvas, mockTextures);
    }).not.toThrow();
  });

  it('Single Responsibility - each class has one reason to change', () => {
    // GameState only manages game state
    const gameState = new GameState();
    const methods = Object.getOwnPropertyNames(GameState.prototype).filter(m => m !== 'constructor');
    const stateMethods = methods.filter(m => m.includes('Game') || m.includes('State') || m.includes('started') || m.includes('won'));
    expect(stateMethods.length).toBeGreaterThan(0);

    // DeviceFactory only creates devices
    expect(typeof DeviceFactory.createDevice).toBe('function');
    expect(typeof DeviceFactory.createAllDevices).toBe('function');
    expect(typeof DeviceFactory.getAvailableDevices).toBe('function');
  });
});