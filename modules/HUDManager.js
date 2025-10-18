/**
 * HUDManager - Manages all HUD (Heads-Up Display) elements and updates
 *
 * Responsibilities:
 * - Timer display updates
 * - Victory panel management
 * - Charge bars updates
 * - Subtitle/speak functionality
 * - Tutorial screen management
 * - Target time display for challenges
 * - Device visibility management
 */
export class HUDManager {
  /**
   * Creates a new HUDManager instance
   * @param {Object} elements - DOM element references
   * @param {Object} i18n - I18nManager instance for translations
   * @param {Object} options - Configuration options
   * @param {boolean} options.strict - Whether to throw errors for missing elements (default: true)
   */
  constructor(elements, i18n, options = {}) {
    if (!elements) {
      throw new Error('HUDManager requires DOM elements');
    }

    this.elements = elements;
    this.i18n = i18n;
    this.options = { strict: true, ...options };
    this._speakTimeout = null;

    // Validate required elements in strict mode
    if (this.options.strict) {
      this._validateElements();
    } else {
      this._warnMissingElements();
    }
  }

  /**
   * Validates that all required elements are present
   * @private
   */
  _validateElements() {
    const required = ['timer', 'subtitles', 'tutorial', 'victoryPanel', 'bars'];
    const missing = required.filter(key => !this.elements[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required HUD elements: ${missing.join(', ')}`);
    }
  }

  /**
   * Warns about missing elements in non-strict mode
   * @private
   */
  _warnMissingElements() {
    const recommended = [
      'timer', 'subtitles', 'tutorial', 'victoryPanel', 'bars',
      'targetTimeDisplay', 'restartButton', 'chargeRows'
    ];

    const missing = recommended.filter(key => !this.elements[key]);

    if (missing.length > 0) {
      console.warn(`HUDManager: Missing recommended elements: ${missing.join(', ')}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Updates the timer display
   * @param {string} timeString - Formatted time string (MM:SS)
   */
  updateTimer(timeString) {
    if (this.elements.timer) {
      this.elements.timer.textContent = timeString;
    }
  }

  /**
   * Formats milliseconds as MM:SS
   * @param {number} milliseconds - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Shows the target time display for challenge mode
   * @param {string} timeString - Formatted time string (MM:SS)
   */
  showTargetTime(timeString) {
    if (this.elements.targetTimeDisplay) {
      this.elements.targetTimeDisplay.style.display = '';
      if (this.elements.targetTime) {
        this.elements.targetTime.textContent = timeString;
      }
    }
  }

  /**
   * Hides the target time display
   */
  hideTargetTime() {
    if (this.elements.targetTimeDisplay) {
      this.elements.targetTimeDisplay.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CHARGE BAR METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Updates all charge bars
   * @param {number} taserRatio - Taser charge ratio (0-1)
   * @param {number} stunRatio - Stun charge ratio (0-1)
   * @param {number} tranqRatio - Tranq charge ratio (0-1)
   */
  updateChargeBars(taserRatio, stunRatio, tranqRatio) {
    const clamp = (val) => Math.max(0, Math.min(1, val));

    if (this.elements.bars) {
      if (this.elements.bars.taser) {
        this.elements.bars.taser.style.transform = `scaleX(${clamp(taserRatio)})`;
      }
      if (this.elements.bars.stun) {
        this.elements.bars.stun.style.transform = `scaleX(${clamp(stunRatio)})`;
      }
      if (this.elements.bars.tranq) {
        this.elements.bars.tranq.style.transform = `scaleX(${clamp(tranqRatio)})`;
      }
    }
  }

  /**
   * Updates device charge row visibility based on enabled state
   * @param {Object} deviceConfig - Device configuration with enabled flags
   */
  updateDeviceVisibility(deviceConfig) {
    if (!this.elements.chargeRows) return;

    const devices = ['taser', 'stun', 'tranq'];
    devices.forEach(device => {
      if (this.elements.chargeRows[device]) {
        const enabled = deviceConfig[device]?.enabled ?? true;
        this.elements.chargeRows[device].style.display = enabled ? '' : 'none';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VICTORY PANEL METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Shows the victory panel with game stats
   * @param {Object} victoryData - Victory data
   * @param {string} victoryData.mazeSize - Maze size (e.g., "21x21")
   * @param {string} victoryData.completionTime - Formatted completion time
   * @param {string} victoryData.difficulty - Difficulty name
   * @param {string} [victoryData.targetTime] - Challenge target time (optional)
   * @param {boolean} [victoryData.beatTarget] - Whether player beat the target
   * @param {boolean} [victoryData.isClose] - Whether time was close to target
   * @param {boolean} [victoryData.isTie] - Whether time exactly matched target
   * @param {string} [victoryData.timeDiff] - Formatted time difference
   * @param {string} [victoryData.shareButtonText] - Custom share button text
   * @param {string} [victoryData.restartButtonText] - Custom restart button text
   */
  showVictoryPanel(victoryData) {
    if (!this.elements.victoryPanel) return;

    // Show the panel
    this.elements.victoryPanel.style.display = '';

    // Clear previous classes
    if (this.elements.victoryTimeItem) {
      this.elements.victoryTimeItem.classList.remove('stat-beat-target', 'stat-close');
    }

    // Update basic stats
    if (this.elements.victoryMazeSize) {
      this.elements.victoryMazeSize.textContent = victoryData.mazeSize;
    }
    if (this.elements.victoryTime) {
      this.elements.victoryTime.textContent = victoryData.completionTime;
    }
    if (this.elements.victoryDifficulty) {
      this.elements.victoryDifficulty.textContent = victoryData.difficulty;
    }

    // Handle challenge mode data
    if (victoryData.targetTime) {
      // Show target time
      if (this.elements.victoryTargetTimeItem) {
        this.elements.victoryTargetTimeItem.style.display = '';
      }
      if (this.elements.victoryTargetTime) {
        this.elements.victoryTargetTime.textContent = victoryData.targetTime;
      }

      // Update title and message based on performance
      if (victoryData.isTie) {
        // Perfect tie
        if (this.elements.victoryTitle && this.i18n) {
          this.elements.victoryTitle.textContent = this.i18n.t('game.messages.victory_tie_title');
        }
        if (this.elements.victoryCta && this.i18n) {
          this.elements.victoryCta.innerHTML = this.i18n.t('game.messages.victory_tie');
        }
        if (this.elements.victoryTimeItem) {
          this.elements.victoryTimeItem.classList.add('stat-close');
        }
      } else if (victoryData.beatTarget) {
        // Beat the target
        if (this.elements.victoryTitle && this.i18n) {
          this.elements.victoryTitle.textContent = this.i18n.t('game.messages.victory_beat_record_title');
        }
        if (this.elements.victoryCta && this.i18n) {
          this.elements.victoryCta.innerHTML = this.i18n.t('game.messages.victory_beat_record', {
            diff: victoryData.timeDiff
          });
        }
        if (this.elements.victoryTimeItem) {
          this.elements.victoryTimeItem.classList.add('stat-beat-target');
        }

        // Update share button text if provided
        if (victoryData.shareButtonText && this.elements.victoryShareButton) {
          const shareSpan = this.elements.victoryShareButton.querySelector('span');
          if (shareSpan) {
            shareSpan.textContent = victoryData.shareButtonText;
          }
        }
      } else if (victoryData.isClose) {
        // Close but didn't beat
        if (this.elements.victoryTitle && this.i18n) {
          this.elements.victoryTitle.textContent = this.i18n.t('game.messages.victory_close_title');
        }
        if (this.elements.victoryCta && this.i18n) {
          this.elements.victoryCta.innerHTML = this.i18n.t('game.messages.victory_close', {
            diff: victoryData.timeDiff
          });
        }
        if (this.elements.victoryTimeItem) {
          this.elements.victoryTimeItem.classList.add('stat-close');
        }
      } else {
        // Didn't beat, not close
        if (this.elements.victoryTitle && this.i18n) {
          this.elements.victoryTitle.textContent = this.i18n.t('game.messages.victory_title');
        }
        if (this.elements.victoryCta && this.i18n) {
          this.elements.victoryCta.innerHTML = this.i18n.t('game.messages.victory_missed', {
            diff: victoryData.timeDiff
          });
        }
      }

      // Update restart button text if provided
      if (victoryData.restartButtonText && this.elements.victoryRestartButton) {
        const restartSpan = this.elements.victoryRestartButton.querySelector('span');
        if (restartSpan) {
          restartSpan.textContent = victoryData.restartButtonText;
        }
      }
    } else {
      // Normal mode - hide target time, reset classes
      if (this.elements.victoryTargetTimeItem) {
        this.elements.victoryTargetTimeItem.style.display = 'none';
      }
      if (this.elements.victoryTimeItem) {
        this.elements.victoryTimeItem.classList.remove('stat-beat-target', 'stat-close');
      }
      if (this.elements.victoryTitle && this.i18n) {
        this.elements.victoryTitle.textContent = this.i18n.t('game.messages.victory_title');
      }
    }
  }

  /**
   * Hides the victory panel
   */
  hideVictoryPanel() {
    if (this.elements.victoryPanel) {
      this.elements.victoryPanel.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TUTORIAL METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Shows the tutorial screen
   */
  showTutorial() {
    if (this.elements.tutorial) {
      this.elements.tutorial.style.display = '';
    }
  }

  /**
   * Hides the tutorial screen
   */
  hideTutorial() {
    if (this.elements.tutorial) {
      this.elements.tutorial.style.display = 'none';
    }
  }

  /**
   * Updates the tutorial title using i18n key
   * @param {string} i18nKey - Translation key for the title
   */
  updateTutorialTitle(i18nKey) {
    if (this.elements.tutorial && this.i18n) {
      const titleElement = this.elements.tutorial.querySelector('h2');
      if (titleElement) {
        titleElement.textContent = this.i18n.t(i18nKey);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RESTART BUTTON METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Shows the restart button
   */
  showRestartButton() {
    if (this.elements.restartButton) {
      this.elements.restartButton.style.display = 'block';
    }
  }

  /**
   * Hides the restart button
   */
  hideRestartButton() {
    if (this.elements.restartButton) {
      this.elements.restartButton.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBTITLE/SPEAK METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Displays a subtitle message that auto-hides after a duration
   * @param {string} text - Text to display
   * @param {number} duration - Duration in milliseconds (default: 1200)
   */
  speak(text, duration = 1200) {
    if (!this.elements.subtitles) return;

    // Show the subtitle
    this.elements.subtitles.textContent = text;
    this.elements.subtitles.style.display = '';

    // Clear previous timeout
    if (this._speakTimeout !== null) {
      clearTimeout(this._speakTimeout);
    }

    // Set new timeout
    this._speakTimeout = setTimeout(() => {
      if (this.elements.subtitles) {
        this.elements.subtitles.textContent = '';
        this.elements.subtitles.style.display = 'none';
      }
      this._speakTimeout = null;
    }, duration);
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cleans up resources and timers
   */
  destroy() {
    if (this._speakTimeout !== null) {
      clearTimeout(this._speakTimeout);
      this._speakTimeout = null;
    }
  }
}
