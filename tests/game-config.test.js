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
  DEVICE_MAPPING
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

  describe('DEVICE_MAPPING', () => {
    it('should define bidirectional device name mappings', () => {
      expect(DEVICE_MAPPING).toBeDefined();
      expect(DEVICE_MAPPING.DIFFICULTY_TO_GAME).toBeDefined();
      expect(DEVICE_MAPPING.GAME_TO_DIFFICULTY).toBeDefined();
    });

    it('should map difficulty config names to game device names', () => {
      expect(DEVICE_MAPPING.DIFFICULTY_TO_GAME.disruptor).toBe('taser');
      expect(DEVICE_MAPPING.DIFFICULTY_TO_GAME.immobilizer).toBe('stun');
      expect(DEVICE_MAPPING.DIFFICULTY_TO_GAME.pacifier).toBe('tranq');
    });

    it('should map game device names to difficulty config names', () => {
      expect(DEVICE_MAPPING.GAME_TO_DIFFICULTY.taser).toBe('disruptor');
      expect(DEVICE_MAPPING.GAME_TO_DIFFICULTY.stun).toBe('immobilizer');
      expect(DEVICE_MAPPING.GAME_TO_DIFFICULTY.tranq).toBe('pacifier');
    });

    it('should have consistent bidirectional mappings', () => {
      // Verify that mappings are consistent in both directions
      Object.entries(DEVICE_MAPPING.DIFFICULTY_TO_GAME).forEach(([difficultyName, gameName]) => {
        expect(DEVICE_MAPPING.GAME_TO_DIFFICULTY[gameName]).toBe(difficultyName);
      });

      Object.entries(DEVICE_MAPPING.GAME_TO_DIFFICULTY).forEach(([gameName, difficultyName]) => {
        expect(DEVICE_MAPPING.DIFFICULTY_TO_GAME[difficultyName]).toBe(gameName);
      });
    });

    it('should map to valid device types', () => {
      // Verify that game device names correspond to actual device configs
      Object.values(DEVICE_MAPPING.DIFFICULTY_TO_GAME).forEach(gameName => {
        const deviceConfig = getDeviceConfig(gameName);
        expect(deviceConfig).toBeDefined();
        expect(deviceConfig.MAX_CHARGES).toBeGreaterThan(0);
      });
    });
  });
});
