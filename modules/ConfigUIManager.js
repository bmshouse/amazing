/**
 * ConfigUIManager - Manages configuration panel UI and difficulty settings
 *
 * Responsibilities:
 * - Config panel toggle/close with animations
 * - Difficulty UI updates (rating, time estimates)
 * - Tab switching (Gameplay/Devices)
 * - Preset button handling
 * - Slider event handlers for difficulty settings
 * - Device configuration (enable/disable, charges)
 * - Reset/Apply button functionality
 */
export class ConfigUIManager {
  /**
   * Creates a new ConfigUIManager instance
   * @param {Object} elements - DOM element references
   * @param {Object} difficultyConfig - DifficultyConfig instance
   * @param {Object} i18n - I18nManager instance for translations
   * @param {Object} shareManager - ShareManager instance (optional)
   */
  constructor(elements, difficultyConfig, i18n, shareManager = null) {
    if (!elements) {
      throw new Error('ConfigUIManager requires DOM elements');
    }
    if (!difficultyConfig) {
      throw new Error('ConfigUIManager requires DifficultyConfig instance');
    }

    this.elements = elements;
    this.difficultyConfig = difficultyConfig;
    this.i18n = i18n;
    this.shareManager = shareManager;

    this.isPanelOpen = false;
    this.eventListeners = []; // Track listeners for cleanup
    this.currentDifficulty = null;

    // Callbacks
    this.onApply = null; // Callback when Apply button is clicked
    this.onClose = null; // Callback when panel is closed
  }

  /**
   * Initializes event listeners for all config UI elements
   */
  initialize() {
    this._setupPanelListeners();
    this._setupTabListeners();
    this._setupPresetListeners();
    this._setupSliderListeners();
    this._setupDeviceListeners();
    this._setupActionListeners();
    this._setupOutsideClickListener();

    // Initial UI update
    this.updateUI();
  }

  // ═══════════════════════════════════════════════════════════════
  // PANEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Toggles the config panel open/closed
   */
  togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;

    if (this.isPanelOpen) {
      // Close challenge panel if open
      if (this.shareManager) {
        this.shareManager.hideChallengePanel();
      }

      this.elements.configPanel.style.display = 'block';
      setTimeout(() => {
        this.elements.configPanel.classList.add('show');
      }, 10);
    } else {
      this.elements.configPanel.classList.remove('show');
      setTimeout(() => {
        this.elements.configPanel.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Closes the config panel
   */
  closePanel() {
    if (this.isPanelOpen) {
      this.isPanelOpen = false;
      this.elements.configPanel.classList.remove('show');
      setTimeout(() => {
        this.elements.configPanel.style.display = 'none';
      }, 300);

      if (this.onClose) {
        this.onClose();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI UPDATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Updates all difficulty UI elements based on current configuration
   */
  updateUI() {
    this.currentDifficulty = this.difficultyConfig.getConfig();

    // Update difficulty rating and estimated time
    if (this.elements.difficultyRating && this.i18n) {
      this.elements.difficultyRating.textContent = this.i18n.t('game.difficulty.rating', {
        rating: this.difficultyConfig.getDifficultyRating()
      });
    }

    if (this.elements.estimatedTime && this.i18n) {
      this.elements.estimatedTime.textContent = this.i18n.t('game.difficulty.estimated_time', {
        minutes: this.difficultyConfig.getEstimatedTime()
      });
    }

    // Update maze settings
    this._updateMazeUI();

    // Update enemy settings
    this._updateEnemyUI();

    // Update device settings
    this._updateDeviceUI();

    // Update preset buttons
    this._updatePresetButtons();
  }

  /**
   * Updates maze-related UI elements
   * @private
   */
  _updateMazeUI() {
    if (!this.currentDifficulty.maze) return;

    if (this.elements.mazeSize) {
      this.elements.mazeSize.value = String(this.currentDifficulty.maze.size);
    }

    if (this.elements.mazeSizeValue && this.i18n) {
      this.elements.mazeSizeValue.textContent = this.i18n.t('config.maze.size_value', {
        size: this.currentDifficulty.maze.size
      });
    }

    if (this.elements.rechargePads) {
      this.elements.rechargePads.value = String(this.currentDifficulty.maze.rechargePads);
    }

    if (this.elements.rechargePadsValue) {
      this.elements.rechargePadsValue.textContent = this.currentDifficulty.maze.rechargePads;
    }
  }

  /**
   * Updates enemy-related UI elements
   * @private
   */
  _updateEnemyUI() {
    if (!this.currentDifficulty.enemies) return;

    if (this.elements.enemyCount) {
      this.elements.enemyCount.value = String(this.currentDifficulty.enemies.count);
    }

    if (this.elements.enemyCountValue) {
      this.elements.enemyCountValue.textContent = this.currentDifficulty.enemies.count;
    }

    if (this.elements.enemySpeed) {
      this.elements.enemySpeed.value = String(this.currentDifficulty.enemies.speedMultiplier);
    }

    if (this.elements.enemySpeedValue && this.i18n) {
      const speedKey = `config.enemies.speed_values.${this.currentDifficulty.enemies.speedMultiplier}`;
      const translation = this.i18n.getTranslation(speedKey);
      this.elements.enemySpeedValue.textContent = translation !== `[${speedKey}]`
        ? this.i18n.t(speedKey)
        : this.i18n.t('game.difficulty.fallback.custom');
    }

    // Smart push toggle
    const smartPushCheckbox = document.getElementById('enableSmartPush');
    if (smartPushCheckbox) {
      smartPushCheckbox.checked = this.currentDifficulty.enemies.smartPush || false;
    }
  }

  /**
   * Updates device-related UI elements
   * @private
   */
  _updateDeviceUI() {
    if (!this.currentDifficulty.devices) return;

    ['disruptor', 'immobilizer', 'pacifier'].forEach(deviceType => {
      const device = this.currentDifficulty.devices[deviceType];
      if (!device) return;

      const enableCheckbox = document.getElementById(`enable${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`);
      const chargeSlider = document.getElementById(`${deviceType}Charges`);
      const chargeValue = document.getElementById(`${deviceType}ChargesValue`);

      if (enableCheckbox) {
        enableCheckbox.checked = device.enabled;
      }

      if (chargeSlider) {
        chargeSlider.value = String(device.charges);
      }

      if (chargeValue) {
        chargeValue.textContent = String(device.charges);
      }
    });
  }

  /**
   * Updates preset button states
   * @private
   */
  _updatePresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === this.currentDifficulty.preset);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT LISTENER SETUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sets up panel open/close event listeners
   * @private
   */
  _setupPanelListeners() {
    if (this.elements.configButton) {
      const handler = (e) => {
        e.stopPropagation();
        this.togglePanel();
      };

      this.elements.configButton.addEventListener('click', handler);
      this.eventListeners.push({
        element: this.elements.configButton,
        event: 'click',
        handler
      });
    }
  }

  /**
   * Sets up outside click listener to close panel
   * @private
   */
  _setupOutsideClickListener() {
    const handler = (e) => {
      if (this.isPanelOpen &&
          !this.elements.configPanel.contains(e.target) &&
          e.target !== this.elements.configButton) {
        this.closePanel();
      }
    };

    document.addEventListener('click', handler);
    this.eventListeners.push({
      element: document,
      event: 'click',
      handler
    });
  }

  /**
   * Sets up tab switching event listeners
   * @private
   */
  _setupTabListeners() {
    const tabs = document.querySelectorAll('.config-tab');
    tabs.forEach(tab => {
      const handler = () => {
        const targetTab = tab.dataset.tab;

        // Update tab buttons
        document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab content
        document.querySelectorAll('.config-tab-content').forEach(content => {
          content.classList.remove('active');
        });

        const tabContent = document.getElementById(targetTab + 'Tab');
        if (tabContent) {
          tabContent.classList.add('active');
        }
      };

      tab.addEventListener('click', handler);
      this.eventListeners.push({
        element: tab,
        event: 'click',
        handler
      });
    });
  }

  /**
   * Sets up preset button event listeners
   * @private
   */
  _setupPresetListeners() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      const handler = () => {
        const preset = btn.dataset.preset;
        this.difficultyConfig.applyPreset(preset);
        this.updateUI();
      };

      btn.addEventListener('click', handler);
      this.eventListeners.push({
        element: btn,
        event: 'click',
        handler
      });
    });
  }

  /**
   * Sets up slider event listeners for difficulty settings
   * @private
   */
  _setupSliderListeners() {
    // Maze size slider
    if (this.elements.mazeSize) {
      const handler = (e) => {
        let size = parseInt(e.target.value);
        if (size % 2 === 0) size += 1; // Ensure odd number
        this.difficultyConfig.updateConfig('maze', 'size', size);
        this.updateUI();
      };

      this.elements.mazeSize.addEventListener('input', handler);
      this.eventListeners.push({
        element: this.elements.mazeSize,
        event: 'input',
        handler
      });
    }

    // Recharge pads slider
    if (this.elements.rechargePads) {
      const handler = (e) => {
        const count = parseInt(e.target.value);
        this.difficultyConfig.updateConfig('maze', 'rechargePads', count);
        this.updateUI();
      };

      this.elements.rechargePads.addEventListener('input', handler);
      this.eventListeners.push({
        element: this.elements.rechargePads,
        event: 'input',
        handler
      });
    }

    // Enemy count slider
    if (this.elements.enemyCount) {
      const handler = (e) => {
        const count = parseInt(e.target.value);
        this.difficultyConfig.updateConfig('enemies', 'count', count);
        this.updateUI();
      };

      this.elements.enemyCount.addEventListener('input', handler);
      this.eventListeners.push({
        element: this.elements.enemyCount,
        event: 'input',
        handler
      });
    }

    // Enemy speed slider
    if (this.elements.enemySpeed) {
      const handler = (e) => {
        const speed = parseFloat(e.target.value);
        this.difficultyConfig.updateConfig('enemies', 'speedMultiplier', speed);
        this.updateUI();
      };

      this.elements.enemySpeed.addEventListener('input', handler);
      this.eventListeners.push({
        element: this.elements.enemySpeed,
        event: 'input',
        handler
      });
    }

    // Smart push toggle
    const smartPushCheckbox = document.getElementById('enableSmartPush');
    if (smartPushCheckbox) {
      const handler = (e) => {
        this.difficultyConfig.updateConfig('enemies', 'smartPush', e.target.checked);
        this.updateUI();
      };

      smartPushCheckbox.addEventListener('change', handler);
      this.eventListeners.push({
        element: smartPushCheckbox,
        event: 'change',
        handler
      });
    }
  }

  /**
   * Sets up device toggle and charge slider event listeners
   * @private
   */
  _setupDeviceListeners() {
    ['disruptor', 'immobilizer', 'pacifier'].forEach(deviceType => {
      const enableCheckbox = document.getElementById(`enable${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`);
      const chargeSlider = document.getElementById(`${deviceType}Charges`);

      if (enableCheckbox) {
        const handler = (e) => {
          this.difficultyConfig.updateDevice(deviceType, 'enabled', e.target.checked);
          this.updateUI();
        };

        enableCheckbox.addEventListener('change', handler);
        this.eventListeners.push({
          element: enableCheckbox,
          event: 'change',
          handler
        });
      }

      if (chargeSlider) {
        const handler = (e) => {
          const charges = parseInt(e.target.value);
          this.difficultyConfig.updateDevice(deviceType, 'charges', charges);
          this.updateUI();
        };

        chargeSlider.addEventListener('input', handler);
        this.eventListeners.push({
          element: chargeSlider,
          event: 'input',
          handler
        });
      }
    });
  }

  /**
   * Sets up Reset and Apply button event listeners
   * @private
   */
  _setupActionListeners() {
    const resetButton = document.getElementById('resetDifficulty');
    if (resetButton) {
      const handler = () => {
        this.handleReset();
      };

      resetButton.addEventListener('click', handler);
      this.eventListeners.push({
        element: resetButton,
        event: 'click',
        handler
      });
    }

    const applyButton = document.getElementById('applyDifficulty');
    if (applyButton) {
      const handler = () => {
        this.handleApply();
      };

      applyButton.addEventListener('click', handler);
      this.eventListeners.push({
        element: applyButton,
        event: 'click',
        handler
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handles reset button click
   */
  handleReset() {
    this.difficultyConfig.reset();
    this.currentDifficulty = this.difficultyConfig.getConfig();
    this.updateUI();
  }

  /**
   * Handles apply button click
   */
  handleApply() {
    if (this.onApply) {
      this.onApply();
    }
    this.closePanel();
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Removes all event listeners and cleans up resources
   */
  destroy() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}
