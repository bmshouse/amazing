// Test the buildGameData utility function
import { describe, it, expect, beforeEach } from 'vitest';
import { buildGameData } from '../main.js';
import { Maze } from '../modules/maze.js';
import { PlayerController } from '../modules/player.js';
import { EnemyController } from '../modules/enemies.js';
import { Defenses } from '../modules/defenses.js';
import { DifficultyConfig } from '../modules/DifficultyConfig.js';

describe('buildGameData', () => {
  let maze, player, enemies, defenses, currentDifficulty, audio, hud;

  beforeEach(() => {
    // Set up minimal test environment
    maze = new Maze(11, 11, 1);
    maze.generate();

    player = new PlayerController(maze);
    enemies = new EnemyController(maze, player);

    // Mock audio and hud
    audio = { beep: () => {} };
    hud = {
      bars: {
        taser: { style: { transform: '' } },
        stun: { style: { transform: '' } },
        tranq: { style: { transform: '' } }
      }
    };

    defenses = new Defenses(player, enemies, audio, hud);

    const difficultyConfig = new DifficultyConfig();
    currentDifficulty = difficultyConfig.getConfig();
  });

  it('should be a function', () => {
    expect(typeof buildGameData).toBe('function');
  });

  it('should return object with maze property', () => {
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result).toHaveProperty('maze');
    expect(result.maze).toBe(maze);
  });

  it('should return object with enemies property', () => {
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result).toHaveProperty('enemies');
    expect(result.enemies).toBe(enemies);
  });

  it('should return object with config property', () => {
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result).toHaveProperty('config');
    expect(result.config).toHaveProperty('difficultyPreset');
    expect(result.config).toHaveProperty('enemyCount');
    expect(result.config).toHaveProperty('enemySpeed');
    expect(result.config).toHaveProperty('devices');
  });

  it('should include device charges in config', () => {
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result.config.devices).toHaveProperty('taserCharges');
    expect(result.config.devices).toHaveProperty('stunCharges');
    expect(result.config.devices).toHaveProperty('tranqCharges');
    expect(typeof result.config.devices.taserCharges).toBe('number');
    expect(typeof result.config.devices.stunCharges).toBe('number');
    expect(typeof result.config.devices.tranqCharges).toBe('number');
  });

  it('should include device enabled state in config', () => {
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result.config.devices).toHaveProperty('taserEnabled');
    expect(result.config.devices).toHaveProperty('stunEnabled');
    expect(result.config.devices).toHaveProperty('tranqEnabled');
    expect(typeof result.config.devices.taserEnabled).toBe('boolean');
    expect(typeof result.config.devices.stunEnabled).toBe('boolean');
    expect(typeof result.config.devices.tranqEnabled).toBe('boolean');
  });

  it('should include completionTime property', () => {
    const testTime = 120000;
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: testTime,
      playerName: 'Test'
    });

    expect(result).toHaveProperty('completionTime');
    expect(result.completionTime).toBe(testTime);
  });

  it('should include playerName property', () => {
    const testName = 'TestPlayer';
    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: testName
    });

    expect(result).toHaveProperty('playerName');
    expect(result.playerName).toBe(testName);
  });

  it('should use actual enemy count from game state', () => {
    // Remove some enemies
    enemies.entities.pop();
    enemies.entities.pop();
    const expectedCount = enemies.entities.length;

    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result.config.enemyCount).toBe(expectedCount);
  });

  it('should use maxCharges from devices (not current charges)', () => {
    // Consume some charges
    defenses.devices.taser.charges = 3;
    defenses.devices.taser.maxCharges = 8;

    const result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });

    expect(result.config.devices.taserCharges).toBe(8); // maxCharges, not current
  });

  it('should fallback difficulty preset to name or default', () => {
    // Test with preset
    currentDifficulty.preset = 'normal';
    let result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test'
    });
    expect(result.config.difficultyPreset).toBe('normal');

    // Test with name when no preset
    delete currentDifficulty.preset;
    currentDifficulty.name = 'custom';
    result = buildGameData({
      maze,
      enemies,
      defenses,
      currentDifficulty,
      completionTime: 60000,
      playerName: 'Test',
      fallbackDifficulty: 'Normal'
    });
    expect(result.config.difficultyPreset).toBe('custom');
  });
});
