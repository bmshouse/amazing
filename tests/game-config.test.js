// Test the GameConfig utility functions
import { describe, it, expect } from 'vitest';
import {
  GameConfig,
  getDeviceConfig,
  getColor,
  getRenderingConfig,
  getPlayerConfig,
  getEnemyConfig,
  getMazeConfig,
  DEVICE_MAPPING,
  DEVICE_TYPES,
  ENEMY_STATES,
  STORAGE_KEYS,
  EVENTS
} from '../modules/GameConfig.js';

describe('GameConfig', () => {
  it('should have correct structure', () => {
    expect(GameConfig).toBeDefined();
    expect(GameConfig.RENDERING).toBeDefined();
    expect(GameConfig.PLAYER).toBeDefined();
    expect(GameConfig.ENEMIES).toBeDefined();
    expect(GameConfig.DEVICES).toBeDefined();
    expect(GameConfig.COLORS).toBeDefined();
  });

  it('getDeviceConfig should return correct device config', () => {
    const disruptorConfig = getDeviceConfig(DEVICE_TYPES.DISRUPTOR);
    expect(disruptorConfig).toBeDefined();
    expect(disruptorConfig.MAX_CHARGES).toBe(10);
    expect(disruptorConfig.COOLDOWN).toBe(250);

    const frostConfig = getDeviceConfig(DEVICE_TYPES.FROST);
    expect(frostConfig).toBeDefined();
    expect(frostConfig.MAX_CHARGES).toBe(5);

    const pacifierConfig = getDeviceConfig(DEVICE_TYPES.PACIFIER);
    expect(pacifierConfig).toBeDefined();
    expect(pacifierConfig.MAX_CHARGES).toBe(3);
  });

  it('getColor should return correct color values', () => {
    const exitDoor = getColor('exit_door');
    expect(exitDoor).toBe('#a8f8abff');

    const entity = getColor('entity');
    expect(entity).toBe('#f0134aff');
  });

  it('getRenderingConfig should return rendering config', () => {
    const renderingConfig = getRenderingConfig();
    expect(renderingConfig).toBeDefined();
    expect(renderingConfig.INTERNAL_WIDTH).toBe(960);
    expect(renderingConfig.INTERNAL_HEIGHT).toBe(540);
    expect(renderingConfig.FOV).toBeDefined();
  });

  it('getPlayerConfig should return player config', () => {
    const playerConfig = getPlayerConfig();
    expect(playerConfig).toBeDefined();
    expect(playerConfig.SPEED).toBeDefined();
    expect(playerConfig.TURN_SPEED).toBeDefined();
    expect(playerConfig.COLLISION_RADIUS).toBe(0.3);
  });

  it('getEnemyConfig should return enemy config', () => {
    const enemyConfig = getEnemyConfig();
    expect(enemyConfig).toBeDefined();
    expect(enemyConfig.COUNT).toBe(10);
    expect(enemyConfig.SPEED).toBeDefined();
    expect(enemyConfig.STUNNED_DURATION).toBe(1500);
  });

  it('getMazeConfig should return maze config', () => {
    const mazeConfig = getMazeConfig();
    expect(mazeConfig).toBeDefined();
    expect(mazeConfig.DEFAULT_SIZE).toBe(21);
    expect(mazeConfig.CELL_WALL).toBe(1);
    expect(mazeConfig.CELL_OPEN).toBe(0);
  });

  // Pins the literal values that saved data and locale keys depend on (device ids double as their UI names)
  describe('Identifier constants', () => {
    it('should keep device ids stable', () => {
      expect(DEVICE_TYPES).toEqual({ DISRUPTOR: 'disruptor', FROST: 'frost', PACIFIER: 'pacifier' });
    });

    it('should keep enemy states stable', () => {
      expect(ENEMY_STATES).toEqual({ IDLE: 'idle', STUNNED: 'stunned', SLOWED: 'slowed', TRANQ: 'tranq' });
    });

    it('should keep localStorage keys stable so existing saves load', () => {
      expect(Object.values(STORAGE_KEYS).sort()).toEqual([
        'amazing_audio', 'amazing_difficulty', 'amazing_language', 'amazing_sensitivity', 'amazing_use3d'
      ]);
    });

    it('should define unique event names', () => {
      const names = Object.values(EVENTS);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
