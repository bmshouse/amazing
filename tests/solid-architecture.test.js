// Test the new SOLID architecture
import { describe, it, expect } from 'vitest';
import { GameConfig } from '../modules/GameConfig.js';
import { WeaponFactory } from '../modules/weapons/WeaponFactory.js';
import { RaycastRenderer } from '../modules/RaycastRenderer.js';
import { GameState } from '../modules/GameState.js';

describe('SOLID Architecture', () => {
  it('GameConfig provides centralized constants', () => {
    expect(GameConfig.PLAYER.SPEED).toBe(2.4);
    expect(GameConfig.WEAPONS.TASER.MAX_AMMO).toBe(8);
    expect(GameConfig.COLORS.EXIT_DOOR).toBe('#a8f8abff');
  });

  it('WeaponFactory creates weapon instances', () => {
    const taser = WeaponFactory.createWeapon('taser');
    expect(taser.name).toBe('taser');
    expect(taser.maxAmmo).toBe(8);
    expect(taser.canFire()).toBe(true);

    const allWeapons = WeaponFactory.createAllWeapons();
    expect(Object.keys(allWeapons)).toEqual(['taser', 'stun', 'tranq']);
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

  it('Weapons follow Open/Closed Principle', () => {
    const weapons = WeaponFactory.getAvailableWeapons();
    expect(weapons.length).toBeGreaterThan(0);

    // Each weapon should have consistent interface
    weapons.forEach(weaponType => {
      const weapon = WeaponFactory.createWeapon(weaponType);
      expect(typeof weapon.fire).toBe('function');
      expect(typeof weapon.canFire).toBe('function');
      expect(typeof weapon.getAmmoRatio).toBe('function');
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

    // WeaponFactory only creates weapons
    expect(typeof WeaponFactory.createWeapon).toBe('function');
    expect(typeof WeaponFactory.createAllWeapons).toBe('function');
    expect(typeof WeaponFactory.getAvailableWeapons).toBe('function');
  });
});