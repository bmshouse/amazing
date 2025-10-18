import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HUDManager } from '../modules/HUDManager.js';

describe('HUDManager', () => {
  let hudManager, mockElements, mockI18n;

  beforeEach(() => {
    // Create comprehensive mock DOM elements
    mockElements = {
      timer: { textContent: '' },
      targetTimeDisplay: { style: { display: '' } },
      targetTime: { textContent: '' },
      subtitles: { textContent: '', style: { display: '' } },
      tutorial: {
        style: { display: '' },
        querySelector: vi.fn(() => ({ textContent: '' }))
      },
      victoryPanel: { style: { display: '' } },
      victoryTitle: { textContent: '' },
      victoryMazeSize: { textContent: '' },
      victoryTime: { textContent: '' },
      victoryTimeItem: {
        style: { display: '' },
        classList: { add: vi.fn(), remove: vi.fn() }
      },
      victoryTargetTime: { textContent: '' },
      victoryTargetTimeItem: { style: { display: '' } },
      victoryDifficulty: { textContent: '' },
      victoryCta: { innerHTML: '' },
      victoryShareButton: {
        querySelector: vi.fn(() => ({ textContent: '' }))
      },
      victoryRestartButton: {
        querySelector: vi.fn(() => ({ textContent: '' }))
      },
      restartButton: { style: { display: '' } },
      bars: {
        taser: { style: { transform: '' } },
        stun: { style: { transform: '' } },
        tranq: { style: { transform: '' } }
      },
      chargeRows: {
        taser: { style: { display: '' } },
        stun: { style: { display: '' } },
        tranq: { style: { display: '' } }
      }
    };

    mockI18n = {
      t: vi.fn((key, params) => {
        // Simple mock translations
        if (key === 'game.messages.victory_title') return 'Victory!';
        if (key === 'game.messages.found_exit') return 'Exit found!';
        if (key === 'game.messages.victory_beat_record_title') return 'New Record!';
        if (key === 'game.messages.victory_close_title') return 'So Close!';
        if (key === 'game.messages.victory_tie_title') return 'Perfect Tie!';
        if (key === 'game.messages.ready_again') return 'Ready for another challenge?';
        return `[${key}]`;
      })
    };

    hudManager = new HUDManager(mockElements, mockI18n);
  });

  describe('Constructor', () => {
    it('should create HUDManager instance', () => {
      expect(hudManager).toBeDefined();
    });

    it('should store DOM element references', () => {
      expect(hudManager.elements).toBeDefined();
      expect(hudManager.elements.timer).toBe(mockElements.timer);
    });

    it('should store i18n reference', () => {
      expect(hudManager.i18n).toBe(mockI18n);
    });

    it('should throw error if elements not provided', () => {
      expect(() => new HUDManager()).toThrow();
    });

    it('should throw error if required elements missing', () => {
      expect(() => new HUDManager({}, mockI18n)).toThrow();
    });
  });

  describe('Timer Management', () => {
    it('should update timer display', () => {
      hudManager.updateTimer('12:34');
      expect(mockElements.timer.textContent).toBe('12:34');
    });

    it('should format time correctly (minutes and seconds)', () => {
      expect(hudManager.formatTime(0)).toBe('00:00');
      expect(hudManager.formatTime(1000)).toBe('00:01');
      expect(hudManager.formatTime(60000)).toBe('01:00');
      expect(hudManager.formatTime(125000)).toBe('02:05');
      expect(hudManager.formatTime(599000)).toBe('09:59');
    });

    it('should handle negative time values', () => {
      expect(hudManager.formatTime(-1000)).toBe('00:00');
    });

    it('should show target time display', () => {
      hudManager.showTargetTime('05:30');
      expect(mockElements.targetTimeDisplay.style.display).toBe('');
      expect(mockElements.targetTime.textContent).toBe('05:30');
    });

    it('should hide target time display', () => {
      hudManager.hideTargetTime();
      expect(mockElements.targetTimeDisplay.style.display).toBe('none');
    });
  });

  describe('Charge Bars', () => {
    it('should update all charge bars', () => {
      hudManager.updateChargeBars(1.0, 0.5, 0.0);
      expect(mockElements.bars.taser.style.transform).toBe('scaleX(1)');
      expect(mockElements.bars.stun.style.transform).toBe('scaleX(0.5)');
      expect(mockElements.bars.tranq.style.transform).toBe('scaleX(0)');
    });

    it('should handle fractional charge values', () => {
      hudManager.updateChargeBars(0.75, 0.333, 0.125);
      expect(mockElements.bars.taser.style.transform).toBe('scaleX(0.75)');
      expect(mockElements.bars.stun.style.transform).toBe('scaleX(0.333)');
      expect(mockElements.bars.tranq.style.transform).toBe('scaleX(0.125)');
    });

    it('should clamp charge values between 0 and 1', () => {
      hudManager.updateChargeBars(1.5, -0.5, 2.0);
      expect(mockElements.bars.taser.style.transform).toBe('scaleX(1)');
      expect(mockElements.bars.stun.style.transform).toBe('scaleX(0)');
      expect(mockElements.bars.tranq.style.transform).toBe('scaleX(1)');
    });
  });

  describe('Device Visibility', () => {
    it('should show enabled device charge rows', () => {
      hudManager.updateDeviceVisibility({
        taser: { enabled: true },
        stun: { enabled: true },
        tranq: { enabled: true }
      });
      expect(mockElements.chargeRows.taser.style.display).toBe('');
      expect(mockElements.chargeRows.stun.style.display).toBe('');
      expect(mockElements.chargeRows.tranq.style.display).toBe('');
    });

    it('should hide disabled device charge rows', () => {
      hudManager.updateDeviceVisibility({
        taser: { enabled: true },
        stun: { enabled: false },
        tranq: { enabled: false }
      });
      expect(mockElements.chargeRows.taser.style.display).toBe('');
      expect(mockElements.chargeRows.stun.style.display).toBe('none');
      expect(mockElements.chargeRows.tranq.style.display).toBe('none');
    });

    it('should handle missing device configs', () => {
      expect(() => {
        hudManager.updateDeviceVisibility({});
      }).not.toThrow();
    });
  });

  describe('Victory Panel', () => {
    it('should show victory panel with basic stats', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal'
      });

      expect(mockElements.victoryPanel.style.display).toBe('');
      expect(mockElements.victoryMazeSize.textContent).toBe('21x21');
      expect(mockElements.victoryTime.textContent).toBe('05:30');
      expect(mockElements.victoryDifficulty.textContent).toBe('Normal');
    });

    it('should show victory panel with challenge comparison', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal',
        targetTime: '06:00',
        beatTarget: true,
        timeDiff: '30 seconds'
      });

      expect(mockElements.victoryTargetTimeItem.style.display).toBe('');
      expect(mockElements.victoryTargetTime.textContent).toBe('06:00');
      expect(mockElements.victoryTimeItem.classList.add).toHaveBeenCalledWith('stat-beat-target');
    });

    it('should hide target time when not in challenge mode', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal'
      });

      expect(mockElements.victoryTargetTimeItem.style.display).toBe('none');
    });

    it('should update victory title based on performance', () => {
      // Beat target
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal',
        targetTime: '06:00',
        beatTarget: true
      });
      expect(mockI18n.t).toHaveBeenCalledWith('game.messages.victory_beat_record_title');

      // Close but didn't beat
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:58',
        difficulty: 'Normal',
        targetTime: '06:00',
        beatTarget: false,
        isClose: true
      });
      expect(mockI18n.t).toHaveBeenCalledWith('game.messages.victory_close_title');
    });

    it('should hide victory panel', () => {
      hudManager.hideVictoryPanel();
      expect(mockElements.victoryPanel.style.display).toBe('none');
    });

    it('should clear victory panel classes', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal'
      });

      expect(mockElements.victoryTimeItem.classList.remove).toHaveBeenCalledWith('stat-beat-target', 'stat-close');
    });

    it('should update share button text for challenge victories', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal',
        targetTime: '06:00',
        beatTarget: true,
        shareButtonText: 'Share Victory!'
      });

      expect(mockElements.victoryShareButton.querySelector).toHaveBeenCalledWith('span');
    });

    it('should update restart button text for challenge mode', () => {
      hudManager.showVictoryPanel({
        mazeSize: '21x21',
        completionTime: '05:30',
        difficulty: 'Normal',
        targetTime: '06:00',
        restartButtonText: 'Try Again'
      });

      expect(mockElements.victoryRestartButton.querySelector).toHaveBeenCalledWith('span');
    });
  });

  describe('Tutorial Management', () => {
    it('should show tutorial screen', () => {
      hudManager.showTutorial();
      expect(mockElements.tutorial.style.display).toBe('');
    });

    it('should hide tutorial screen', () => {
      hudManager.hideTutorial();
      expect(mockElements.tutorial.style.display).toBe('none');
    });

    it('should update tutorial title', () => {
      const mockTitle = { textContent: '' };
      mockElements.tutorial.querySelector.mockReturnValue(mockTitle);

      hudManager.updateTutorialTitle('game.messages.ready_again');

      expect(mockI18n.t).toHaveBeenCalledWith('game.messages.ready_again');
      expect(mockTitle.textContent).toBe('Ready for another challenge?');
    });
  });

  describe('Restart Button', () => {
    it('should show restart button', () => {
      hudManager.showRestartButton();
      expect(mockElements.restartButton.style.display).toBe('block');
    });

    it('should hide restart button', () => {
      hudManager.hideRestartButton();
      expect(mockElements.restartButton.style.display).toBe('none');
    });
  });

  describe('Subtitle/Speak System', () => {
    it('should display subtitle text', () => {
      hudManager.speak('Test message');
      expect(mockElements.subtitles.textContent).toBe('Test message');
      expect(mockElements.subtitles.style.display).toBe('');
    });

    it('should clear subtitle after default timeout', (done) => {
      hudManager.speak('Test message');

      setTimeout(() => {
        expect(mockElements.subtitles.textContent).toBe('');
        expect(mockElements.subtitles.style.display).toBe('none');
        done();
      }, 1300); // Default timeout is 1200ms
    });

    it('should support custom timeout duration', (done) => {
      hudManager.speak('Test message', 500);

      setTimeout(() => {
        expect(mockElements.subtitles.textContent).toBe('');
        done();
      }, 600);
    });

    it('should cancel previous timeout on new message', () => {
      hudManager.speak('Message 1');
      hudManager.speak('Message 2');

      expect(mockElements.subtitles.textContent).toBe('Message 2');
    });

    it('should handle empty messages gracefully', () => {
      expect(() => {
        hudManager.speak('');
      }).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should provide formatTime as public method', () => {
      expect(typeof hudManager.formatTime).toBe('function');
    });

    it('should handle edge cases in formatTime', () => {
      expect(hudManager.formatTime(0)).toBe('00:00');
      expect(hudManager.formatTime(999)).toBe('00:00'); // Less than 1 second
      expect(hudManager.formatTime(3599000)).toBe('59:59'); // 59:59
      expect(hudManager.formatTime(3600000)).toBe('60:00'); // 1 hour
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully in non-strict mode', () => {
      const partialElements = { timer: { textContent: '' } };
      const manager = new HUDManager(partialElements, mockI18n, { strict: false });

      expect(() => {
        manager.updateChargeBars(1, 1, 1);
      }).not.toThrow();
    });

    it('should log warnings when elements are missing in non-strict mode', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const partialElements = { timer: { textContent: '' } };

      new HUDManager(partialElements, mockI18n, { strict: false });

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should clear speak timeout on destroy', () => {
      hudManager.speak('Test message');
      hudManager.destroy();

      // Timeout should be cleared
      expect(hudManager._speakTimeout).toBe(null);
    });

    it('should not throw if destroy is called multiple times', () => {
      expect(() => {
        hudManager.destroy();
        hudManager.destroy();
      }).not.toThrow();
    });
  });
});
