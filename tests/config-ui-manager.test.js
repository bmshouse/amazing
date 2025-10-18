import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigUIManager } from '../modules/ConfigUIManager.js';

describe('ConfigUIManager', () => {
  let configManager, mockElements, mockDifficultyConfig, mockI18n, mockShareManager;

  beforeEach(() => {
    // Create comprehensive mock DOM elements
    mockElements = {
      configPanel: {
        style: { display: '' },
        classList: { add: vi.fn(), remove: vi.fn() },
        contains: vi.fn(() => false)
      },
      configButton: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      difficultyRating: { textContent: '' },
      estimatedTime: { textContent: '' },
      mazeSize: { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() },
      mazeSizeValue: { textContent: '' },
      rechargePads: { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() },
      rechargePadsValue: { textContent: '' },
      enemyCount: { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() },
      enemyCountValue: { textContent: '' },
      enemySpeed: { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() },
      enemySpeedValue: { textContent: '' }
    };

    // Mock document for global event listeners
    global.document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      getElementById: vi.fn((id) => {
        if (id === 'enableSmartPush') return { checked: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'enableDisruptor') return { checked: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'disruptorCharges') return { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'disruptorChargesValue') return { textContent: '' };
        if (id === 'enableImmobilizer') return { checked: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'immobilizerCharges') return { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'immobilizerChargesValue') return { textContent: '' };
        if (id === 'enablePacifier') return { checked: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'pacifierCharges') return { value: '', addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'pacifierChargesValue') return { textContent: '' };
        if (id === 'resetDifficulty') return { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'applyDifficulty') return { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'gameplayTab') return { classList: { add: vi.fn(), remove: vi.fn() } };
        if (id === 'devicesTab') return { classList: { add: vi.fn(), remove: vi.fn() } };
        return null;
      })
    };

    mockDifficultyConfig = {
      getConfig: vi.fn(() => ({
        preset: 'normal',
        maze: { size: 21, rechargePads: 3 },
        enemies: { count: 10, speedMultiplier: 1.0, smartPush: false },
        devices: {
          disruptor: { enabled: true, charges: 5 },
          immobilizer: { enabled: true, charges: 5 },
          pacifier: { enabled: true, charges: 5 }
        }
      })),
      getDifficultyRating: vi.fn(() => 5.0),
      getEstimatedTime: vi.fn(() => 10),
      applyPreset: vi.fn(),
      updateConfig: vi.fn(),
      updateDevice: vi.fn(),
      reset: vi.fn()
    };

    mockI18n = {
      t: vi.fn((key, params) => {
        if (key === 'game.difficulty.rating') return `Rating: ${params?.rating || 0}`;
        if (key === 'game.difficulty.estimated_time') return `~${params?.minutes || 0} min`;
        if (key === 'config.maze.size_value') return `${params?.size || 0}x${params?.size || 0}`;
        if (key.startsWith('config.enemies.speed_values.')) return 'Normal';
        if (key === 'game.difficulty.fallback.custom') return 'Custom';
        return `[${key}]`;
      }),
      getTranslation: vi.fn((key) => {
        if (key.startsWith('config.enemies.speed_values.')) return 'Normal';
        return `[${key}]`;
      })
    };

    mockShareManager = {
      hideChallengePanel: vi.fn()
    };

    configManager = new ConfigUIManager(mockElements, mockDifficultyConfig, mockI18n, mockShareManager);
  });

  describe('Constructor', () => {
    it('should create ConfigUIManager instance', () => {
      expect(configManager).toBeDefined();
    });

    it('should store references to dependencies', () => {
      expect(configManager.elements).toBeDefined();
      expect(configManager.difficultyConfig).toBe(mockDifficultyConfig);
      expect(configManager.i18n).toBe(mockI18n);
      expect(configManager.shareManager).toBe(mockShareManager);
    });

    it('should initialize with closed panel state', () => {
      expect(configManager.isPanelOpen).toBe(false);
    });

    it('should throw error if elements not provided', () => {
      expect(() => new ConfigUIManager()).toThrow();
    });

    it('should throw error if difficultyConfig not provided', () => {
      expect(() => new ConfigUIManager(mockElements)).toThrow();
    });
  });

  describe('Panel Management', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should open config panel', () => {
      configManager.togglePanel();
      expect(configManager.isPanelOpen).toBe(true);
      expect(mockElements.configPanel.style.display).toBe('block');
    });

    it('should close config panel', () => {
      configManager.togglePanel(); // Open
      configManager.closePanel();
      expect(configManager.isPanelOpen).toBe(false);
    });

    it('should toggle panel state', () => {
      expect(configManager.isPanelOpen).toBe(false);
      configManager.togglePanel();
      expect(configManager.isPanelOpen).toBe(true);
      configManager.togglePanel();
      expect(configManager.isPanelOpen).toBe(false);
    });

    it('should use CSS transitions for panel animation', async () => {
      vi.useFakeTimers();

      configManager.togglePanel();

      // Fast-forward time by 20ms
      vi.advanceTimersByTime(20);

      expect(mockElements.configPanel.classList.add).toHaveBeenCalledWith('show');

      vi.useRealTimers();
    });

    it('should close challenge panel when opening config panel', () => {
      configManager.togglePanel();
      expect(mockShareManager.hideChallengePanel).toHaveBeenCalled();
    });

    it('should handle panel close with transition', () => {
      vi.useFakeTimers();

      configManager.togglePanel(); // Open
      configManager.togglePanel(); // Close

      expect(mockElements.configPanel.classList.remove).toHaveBeenCalledWith('show');

      // Fast-forward time by 350ms
      vi.advanceTimersByTime(350);

      expect(mockElements.configPanel.style.display).toBe('none');

      vi.useRealTimers();
    });
  });

  describe('Difficulty UI Updates', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should update difficulty rating display', () => {
      mockDifficultyConfig.getDifficultyRating.mockReturnValue(7.5);
      configManager.updateUI();
      expect(mockI18n.t).toHaveBeenCalledWith('game.difficulty.rating', { rating: 7.5 });
      expect(mockElements.difficultyRating.textContent).toBe('Rating: 7.5');
    });

    it('should update estimated time display', () => {
      mockDifficultyConfig.getEstimatedTime.mockReturnValue(15);
      configManager.updateUI();
      expect(mockI18n.t).toHaveBeenCalledWith('game.difficulty.estimated_time', { minutes: 15 });
      expect(mockElements.estimatedTime.textContent).toBe('~15 min');
    });

    it('should update maze size slider and value', () => {
      const config = { maze: { size: 31, rechargePads: 3 }, enemies: {}, devices: {} };
      mockDifficultyConfig.getConfig.mockReturnValue(config);

      configManager.updateUI();

      expect(mockElements.mazeSize.value).toBe('31');
      expect(mockElements.mazeSizeValue.textContent).toBe('31x31');
    });

    it('should update all sliders and values', () => {
      const config = {
        maze: { size: 21, rechargePads: 3 },
        enemies: { count: 10, speedMultiplier: 1.0, smartPush: false },
        devices: {
          disruptor: { enabled: true, charges: 5 },
          immobilizer: { enabled: true, charges: 5 },
          pacifier: { enabled: true, charges: 5 }
        }
      };
      mockDifficultyConfig.getConfig.mockReturnValue(config);

      configManager.updateUI();

      expect(mockElements.mazeSize.value).toBe('21');
      expect(mockElements.rechargePads.value).toBe('3');
      expect(mockElements.enemyCount.value).toBe('10');
      expect(mockElements.enemySpeed.value).toBe('1');
    });

    it('should update enemy speed with translation', () => {
      const config = {
        maze: {},
        enemies: { speedMultiplier: 1.5 },
        devices: {}
      };
      mockDifficultyConfig.getConfig.mockReturnValue(config);

      configManager.updateUI();

      expect(mockElements.enemySpeed.value).toBe('1.5');
    });

    it('should handle custom speed values', () => {
      const config = {
        maze: {},
        enemies: { speedMultiplier: 1.234 },
        devices: {}
      };
      mockDifficultyConfig.getConfig.mockReturnValue(config);
      mockI18n.getTranslation.mockReturnValue('[config.enemies.speed_values.1.234]');

      configManager.updateUI();

      expect(mockElements.enemySpeedValue.textContent).toBe('Custom');
    });

    it('should update device checkboxes and values', () => {
      // Create mutable mocks for device controls
      const deviceMocks = {
        disruptorEnable: { checked: false },
        disruptorCharges: { value: '' },
        disruptorChargesValue: { textContent: '' },
        immobilizerEnable: { checked: false },
        immobilizerCharges: { value: '' },
        immobilizerChargesValue: { textContent: '' },
        pacifierEnable: { checked: false },
        pacifierCharges: { value: '' },
        pacifierChargesValue: { textContent: '' }
      };

      document.getElementById = vi.fn((id) => {
        if (id === 'enableDisruptor') return deviceMocks.disruptorEnable;
        if (id === 'disruptorCharges') return deviceMocks.disruptorCharges;
        if (id === 'disruptorChargesValue') return deviceMocks.disruptorChargesValue;
        if (id === 'enableImmobilizer') return deviceMocks.immobilizerEnable;
        if (id === 'immobilizerCharges') return deviceMocks.immobilizerCharges;
        if (id === 'immobilizerChargesValue') return deviceMocks.immobilizerChargesValue;
        if (id === 'enablePacifier') return deviceMocks.pacifierEnable;
        if (id === 'pacifierCharges') return deviceMocks.pacifierCharges;
        if (id === 'pacifierChargesValue') return deviceMocks.pacifierChargesValue;
        if (id === 'enableSmartPush') return { checked: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'resetDifficulty') return { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'applyDifficulty') return { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        if (id === 'gameplayTab') return { classList: { add: vi.fn(), remove: vi.fn() } };
        if (id === 'devicesTab') return { classList: { add: vi.fn(), remove: vi.fn() } };
        return null;
      });

      const config = {
        maze: {},
        enemies: {},
        devices: {
          disruptor: { enabled: true, charges: 7 },
          immobilizer: { enabled: false, charges: 3 },
          pacifier: { enabled: true, charges: 10 }
        }
      };
      mockDifficultyConfig.getConfig.mockReturnValue(config);

      configManager.updateUI();

      expect(deviceMocks.disruptorEnable.checked).toBe(true);
      expect(deviceMocks.disruptorCharges.value).toBe('7');
      expect(deviceMocks.immobilizerEnable.checked).toBe(false);
    });

    it('should highlight active preset button', () => {
      const mockPresetButtons = [
        { classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() }, dataset: { preset: 'easy' } },
        { classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() }, dataset: { preset: 'normal' } },
        { classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() }, dataset: { preset: 'hard' } }
      ];

      document.querySelectorAll = vi.fn((selector) => {
        if (selector === '.preset-btn') return mockPresetButtons;
        return [];
      });

      const config = { preset: 'hard', maze: {}, enemies: {}, devices: {} };
      mockDifficultyConfig.getConfig.mockReturnValue(config);

      configManager.updateUI();

      expect(mockPresetButtons[0].classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockPresetButtons[1].classList.toggle).toHaveBeenCalledWith('active', false);
      expect(mockPresetButtons[2].classList.toggle).toHaveBeenCalledWith('active', true);
    });
  });

  describe('Slider Event Handlers', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should handle maze size change', () => {
      const event = { target: { value: '25' } };
      const callback = mockElements.mazeSize.addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      callback(event);

      expect(mockDifficultyConfig.updateConfig).toHaveBeenCalledWith('maze', 'size', 25);
    });

    it('should ensure maze size is odd', () => {
      const event = { target: { value: '24' } };
      const callback = mockElements.mazeSize.addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      callback(event);

      expect(mockDifficultyConfig.updateConfig).toHaveBeenCalledWith('maze', 'size', 25);
    });

    it('should handle recharge pads change', () => {
      const event = { target: { value: '5' } };
      const callback = mockElements.rechargePads.addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      callback(event);

      expect(mockDifficultyConfig.updateConfig).toHaveBeenCalledWith('maze', 'rechargePads', 5);
    });

    it('should handle enemy count change', () => {
      const event = { target: { value: '15' } };
      const callback = mockElements.enemyCount.addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      callback(event);

      expect(mockDifficultyConfig.updateConfig).toHaveBeenCalledWith('enemies', 'count', 15);
    });

    it('should handle enemy speed change', () => {
      const event = { target: { value: '1.5' } };
      const callback = mockElements.enemySpeed.addEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      callback(event);

      expect(mockDifficultyConfig.updateConfig).toHaveBeenCalledWith('enemies', 'speedMultiplier', 1.5);
    });
  });

  describe('Reset and Apply', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should reset difficulty to defaults', () => {
      configManager.handleReset();
      expect(mockDifficultyConfig.reset).toHaveBeenCalled();
    });

    it('should update current difficulty after reset', () => {
      configManager.handleReset();
      expect(mockDifficultyConfig.getConfig).toHaveBeenCalled();
    });

    it('should call onApply callback when apply is triggered', () => {
      const applySpy = vi.fn();
      configManager.onApply = applySpy;

      configManager.handleApply();

      expect(applySpy).toHaveBeenCalled();
    });

    it('should close panel after apply', () => {
      configManager.togglePanel(); // Open
      configManager.handleApply();

      expect(configManager.isPanelOpen).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should remove all event listeners on destroy', () => {
      configManager.initialize();
      configManager.destroy();

      expect(mockElements.configButton.removeEventListener).toHaveBeenCalled();
      expect(document.removeEventListener).toHaveBeenCalled();
    });

    it('should clear event listener references', () => {
      configManager.initialize();
      expect(configManager.eventListeners.length).toBeGreaterThan(0);

      configManager.destroy();

      expect(configManager.eventListeners.length).toBe(0);
    });
  });

  describe('Outside Click Handling', () => {
    beforeEach(() => {
      configManager.initialize();
    });

    it('should close panel when clicking outside', () => {
      configManager.togglePanel(); // Open panel

      const clickEvent = { target: document.body };
      const documentClickHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      mockElements.configPanel.contains.mockReturnValue(false);
      documentClickHandler(clickEvent);

      expect(configManager.isPanelOpen).toBe(false);
    });

    it('should not close panel when clicking inside', () => {
      configManager.togglePanel(); // Open panel

      const clickEvent = { target: mockElements.configPanel };
      const documentClickHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      mockElements.configPanel.contains.mockReturnValue(true);
      documentClickHandler(clickEvent);

      expect(configManager.isPanelOpen).toBe(true);
    });
  });
});
