import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyConfig } from '../modules/DifficultyConfig.js';

describe('DifficultyConfig', () => {
  let difficultyConfig;

  beforeEach(() => {
    difficultyConfig = new DifficultyConfig();
  });

  it('initializes with default configuration', () => {
    const config = difficultyConfig.getConfig();
    expect(config.preset).toBe('normal');
    expect(config.maze.size).toBe(21);
    expect(config.enemies.count).toBe(10);
    expect(config.devices.disruptor.enabled).toBe(true);
  });

  it('applies preset configurations correctly', () => {
    // Test easy preset
    difficultyConfig.applyPreset('easy');
    let config = difficultyConfig.getConfig();
    expect(config.preset).toBe('easy');
    expect(config.maze.size).toBe(15);
    expect(config.enemies.count).toBe(5);
    expect(config.devices.disruptor.charges).toBe(12);

    // Test hard preset
    difficultyConfig.applyPreset('hard');
    config = difficultyConfig.getConfig();
    expect(config.preset).toBe('hard');
    expect(config.maze.size).toBe(31);
    expect(config.enemies.count).toBe(15);
    expect(config.devices.disruptor.charges).toBe(6);
  });

  it('switches to custom preset when manually changing values', () => {
    difficultyConfig.applyPreset('normal');
    expect(difficultyConfig.getConfig().preset).toBe('normal');

    difficultyConfig.updateConfig('maze', 'size', 25);
    expect(difficultyConfig.getConfig().preset).toBe('custom');
  });

  it('validates configuration values correctly', () => {
    // Test maze size validation (must be odd)
    difficultyConfig.updateConfig('maze', 'size', 20);
    const errors = difficultyConfig.validateConfig();
    expect(difficultyConfig.getConfig().maze.size).toBe(21); // Corrected to odd
    expect(errors.length).toBeGreaterThan(0);
  });

  it('calculates difficulty rating appropriately', () => {
    // Easy preset should have lower rating
    difficultyConfig.applyPreset('easy');
    const easyRating = difficultyConfig.getDifficultyRating();

    // Hard preset should have higher rating
    difficultyConfig.applyPreset('hard');
    const hardRating = difficultyConfig.getDifficultyRating();

    expect(hardRating).toBeGreaterThan(easyRating);
  });

  it('estimates completion time based on configuration', () => {
    // Easy preset should estimate shorter time
    difficultyConfig.applyPreset('easy');
    const easyTime = difficultyConfig.getEstimatedTime();

    // Hard preset should estimate longer time
    difficultyConfig.applyPreset('hard');
    const hardTime = difficultyConfig.getEstimatedTime();

    expect(hardTime).toBeGreaterThan(easyTime);
  });

  it('returns enabled devices correctly', () => {
    // All devices enabled by default
    let enabledDevices = difficultyConfig.getEnabledDevices();
    expect(enabledDevices).toEqual(['disruptor', 'immobilizer', 'pacifier']);

    // Disable one device
    difficultyConfig.updateDevice('pacifier', 'enabled', false);
    enabledDevices = difficultyConfig.getEnabledDevices();
    expect(enabledDevices).toEqual(['disruptor', 'immobilizer']);
  });

  it('updates device properties correctly', () => {
    difficultyConfig.updateDevice('disruptor', 'charges', 15);
    const config = difficultyConfig.getConfig();
    expect(config.devices.disruptor.charges).toBe(15);
    expect(config.preset).toBe('custom');
  });

  it('resets to default configuration', () => {
    // Make some changes
    difficultyConfig.updateConfig('maze', 'size', 31);
    difficultyConfig.updateDevice('disruptor', 'charges', 15);

    // Reset
    difficultyConfig.reset();
    const config = difficultyConfig.getConfig();
    expect(config.preset).toBe('normal');
    expect(config.maze.size).toBe(21);
    expect(config.devices.disruptor.charges).toBe(8);
  });

  it('validates that at least one device remains enabled', () => {
    // Disable all devices
    difficultyConfig.updateDevice('disruptor', 'enabled', false);
    difficultyConfig.updateDevice('immobilizer', 'enabled', false);
    difficultyConfig.updateDevice('pacifier', 'enabled', false);

    // Validation should re-enable at least one device
    const errors = difficultyConfig.validateConfig();
    const enabledDevices = difficultyConfig.getEnabledDevices();
    expect(enabledDevices.length).toBeGreaterThan(0);
    expect(errors).toContain('At least one device must be enabled');
  });

  it('exports and imports configuration correctly', () => {
    // Make some custom changes
    difficultyConfig.updateConfig('maze', 'size', 27);
    difficultyConfig.updateDevice('disruptor', 'charges', 12);

    // Export configuration
    const exported = difficultyConfig.exportConfig();
    expect(typeof exported).toBe('string');

    // Create new instance and import
    const newConfig = new DifficultyConfig();
    const imported = newConfig.importConfig(exported);
    expect(imported).toBe(true);

    // Verify configuration matches
    const originalConfig = difficultyConfig.getConfig();
    const importedConfig = newConfig.getConfig();
    expect(importedConfig.maze.size).toBe(originalConfig.maze.size);
    expect(importedConfig.devices.disruptor.charges).toBe(originalConfig.devices.disruptor.charges);
  });
});