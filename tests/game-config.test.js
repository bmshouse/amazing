// Test the GameConfig utility functions
import { describe, it, expect } from 'vitest';
import {
  GameConfig,
  getDeviceConfig,
  getColor,
  getRenderingConfig,
  getPlayerConfig,
  getEnemyConfig,
  getMazeConfig
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
    const taserConfig = getDeviceConfig('taser');
    expect(taserConfig).toBeDefined();
    expect(taserConfig.MAX_CHARGES).toBe(8);
    expect(taserConfig.COOLDOWN).toBe(250);

    const stunConfig = getDeviceConfig('stun');
    expect(stunConfig).toBeDefined();
    expect(stunConfig.MAX_CHARGES).toBe(6);

    const tranqConfig = getDeviceConfig('tranq');
    expect(tranqConfig).toBeDefined();
    expect(tranqConfig.MAX_CHARGES).toBe(4);
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
});
