// modules/ShareManager.js - Manages sharing UI and interactions
import { ChallengeManager } from './ChallengeManager.js';
import { DEVICE_MAPPING } from './GameConfig.js';
import { logger } from './Logger.js';

// ShareManager module loaded (using logger in class methods)

export class ShareManager {
  constructor(i18nManager) {
    this.i18n = i18nManager;
    this.challengeManager = new ChallengeManager();
    this.currentGameData = null;
    this.shareURL = null;

    // DOM elements
    this.shareButton = null;
    this.sharePanel = null;
    this.challengeBanner = null;

    // Event callbacks
    this.onShareClosed = null;
    this.onPlayAgain = null;
    this.onCloseConfigPanel = null; // Callback to close config panel from main.js
  }

  /**
   * Initialize the share manager and bind UI events
   */
  initialize() {
    logger.info('ShareManager initializing');
    this.bindDOMElements();
    this.bindEvents();

    // Note: onChallengeLoaded callback should be set by main.js BEFORE calling initialize()
    // This ensures the callback is available when challengeManager.initialize() checks for URL

    this.challengeManager.initialize();

    this.challengeManager.onChallengeError = (message, error) => {
      this.showError(message);
      logger.error('Challenge error:', error);
    };

    // Check for Web Share API support
    if (navigator.share) {
      const webShareButton = document.getElementById('webShareButton');
      if (webShareButton) {
        webShareButton.style.display = 'flex';
      }
    }

    logger.info('ShareManager initialized');
  }

  /**
   * Bind DOM elements
   */
  bindDOMElements() {
    this.shareButton = document.getElementById('shareButton');
    this.sharePanel = document.getElementById('sharePanel');
    this.challengeButton = document.getElementById('challengeButton');
    this.challengePanel = document.getElementById('challengePanel');

    // Share panel elements
    this.shareCloseButton = document.getElementById('shareCloseButton');
    this.shareUrlInput = document.getElementById('shareUrlInput');
    this.copyUrlButton = document.getElementById('copyUrlButton');
    this.webShareButton = document.getElementById('webShareButton');
    this.playAgainButton = document.getElementById('playAgainButton');

    // Challenge panel elements
    this.challengeMazeSize = document.getElementById('challengeMazeSize');
    this.challengeDifficulty = document.getElementById('challengeDifficulty');
    this.challengeEnemies = document.getElementById('challengeEnemies');
    this.challengeRechargePads = document.getElementById('challengeRechargePads');
    this.challengeTargetTime = document.getElementById('challengeTargetTime');
    this.challengeDisruptorCharges = document.getElementById('challengeDisruptorCharges');
    this.challengeImmobilizerCharges = document.getElementById('challengeImmobilizerCharges');
    this.challengePacifierCharges = document.getElementById('challengePacifierCharges');
    this.exitChallengeButton = document.getElementById('exitChallengeButton');

    // Challenge device rows (parent elements to show/hide)
    this.challengeDisruptorRow = this.challengeDisruptorCharges?.parentElement;
    this.challengeImmobilizerRow = this.challengeImmobilizerCharges?.parentElement;
    this.challengePacifierRow = this.challengePacifierCharges?.parentElement;

    // Challenge info elements
    this.shareMazeSize = document.getElementById('shareMazeSize');
    this.shareCompletionTime = document.getElementById('shareCompletionTime');
    this.shareDifficulty = document.getElementById('shareDifficulty');
    this.shareEnemies = document.getElementById('shareEnemies');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Share button - open share panel
    if (this.shareButton) {
      this.shareButton.addEventListener('click', () => {
        this.openSharePanel();
      });
    }

    // Share panel close button
    if (this.shareCloseButton) {
      this.shareCloseButton.addEventListener('click', () => {
        this.closeSharePanel();
      });
    }

    // Copy URL button
    if (this.copyUrlButton) {
      this.copyUrlButton.addEventListener('click', () => {
        this.copyShareURL();
      });
    }

    // Web Share button
    if (this.webShareButton) {
      this.webShareButton.addEventListener('click', () => {
        this.shareViaWebAPI();
      });
    }

    // Play again button
    if (this.playAgainButton) {
      this.playAgainButton.addEventListener('click', () => {
        this.handlePlayAgain();
      });
    }

    // Challenge button - toggle challenge panel
    if (this.challengeButton) {
      this.challengeButton.addEventListener('click', () => {
        this.toggleChallengePanel();
      });
    }

    // Exit challenge button
    if (this.exitChallengeButton) {
      this.exitChallengeButton.addEventListener('click', () => {
        this.exitChallenge();
      });
    }

    // Close share panel when clicking outside
    if (this.sharePanel) {
      this.sharePanel.addEventListener('click', (e) => {
        if (e.target === this.sharePanel) {
          this.closeSharePanel();
        }
      });
    }

    // Close challenge panel when clicking outside
    document.addEventListener('click', (e) => {
      if (this.challengePanel &&
          this.challengePanel.style.display === 'block' &&
          !this.challengePanel.contains(e.target) &&
          !this.challengeButton.contains(e.target)) {
        this.hideChallengePanel();
      }
    });

    // Close panels with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isSharePanelOpen()) {
          this.closeSharePanel();
        } else if (this.challengePanel && this.challengePanel.style.display === 'block') {
          this.hideChallengePanel();
        }
      }
    });
  }

  /**
   * Show the share button (called when game is completed)
   */
  showShareButton() {
    logger.debug('showShareButton called');
    if (this.shareButton) {
      this.shareButton.style.display = 'block';
      logger.info('Share button now visible');
    } else {
      logger.error('Share button element not found!');
    }
  }

  /**
   * Hide the share button
   */
  hideShareButton() {
    if (this.shareButton) {
      this.shareButton.style.display = 'none';
    }
  }

  /**
   * Prepare and show the share panel with game data
   * @param {Object} gameData - Current game state and completion data
   */
  prepareShare(gameData) {
    logger.info('ShareManager.prepareShare called');
    logger.debug('Game data received', {
      mazeSize: gameData.maze ? `${gameData.maze.w}x${gameData.maze.h}` : 'Unknown',
      completionTime: gameData.completionTime
    });
    this.currentGameData = gameData;

    try {
      // Generate shareable URL
      this.shareURL = this.challengeManager.createChallenge(gameData);
      logger.info('Generated share URL', { urlLength: this.shareURL.length });

      // Update share panel with game information
      this.updateSharePanel(gameData);

      // Show the share button
      this.showShareButton();

      logger.info('Share prepared successfully');
    } catch (error) {
      logger.error('Failed to prepare share:', error);
      this.showError(this.i18n.t('ui.errors.share_prepare_failed'));
    }
  }

  /**
   * Open the share panel
   */
  openSharePanel() {
    if (!this.sharePanel || !this.currentGameData) {
      logger.warn('Cannot open share panel - missing data or panel');
      return;
    }

    this.sharePanel.style.display = 'flex';

    // Focus the URL input for easy copying
    if (this.shareUrlInput) {
      setTimeout(() => {
        this.shareUrlInput.select();
      }, 100);
    }

    // Update translations
    if (this.i18n) {
      this.i18n.updateDOM();
    }
  }

  /**
   * Close the share panel
   */
  closeSharePanel() {
    if (this.sharePanel) {
      this.sharePanel.style.display = 'none';
    }

    if (this.onShareClosed) {
      this.onShareClosed();
    }
  }

  /**
   * Check if share panel is open
   * @returns {boolean}
   */
  isSharePanelOpen() {
    return this.sharePanel && this.sharePanel.style.display === 'flex';
  }

  /**
   * Update share panel with current game data
   * @param {Object} gameData - Game completion data
   */
  updateSharePanel(gameData) {
    const { maze, completionTime, config } = gameData;

    // Update challenge information
    if (this.shareMazeSize) {
      this.shareMazeSize.textContent = `${maze.w}x${maze.h}`;
    }

    if (this.shareCompletionTime && completionTime) {
      const minutes = Math.floor(completionTime / 60000);
      const seconds = Math.floor((completionTime % 60000) / 1000);
      this.shareCompletionTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (this.shareDifficulty) {
      this.shareDifficulty.textContent = config?.difficultyPreset || 'Normal';
    }

    if (this.shareEnemies) {
      this.shareEnemies.textContent = config?.enemyCount?.toString() || '10';
    }

    // Update share URL
    if (this.shareUrlInput && this.shareURL) {
      this.shareUrlInput.value = this.shareURL;
    }
  }

  /**
   * Copy share URL to clipboard
   */
  async copyShareURL() {
    if (!this.shareURL) {
      logger.warn('No share URL available to copy');
      return;
    }

    try {
      const success = await this.challengeManager.copyToClipboard(this.shareURL);

      if (success) {
        // Visual feedback
        if (this.copyUrlButton) {
          const originalText = this.copyUrlButton.textContent;
          this.copyUrlButton.textContent = this.i18n.t('ui.share.copied');
          this.copyUrlButton.classList.add('copied');

          setTimeout(() => {
            this.copyUrlButton.textContent = originalText;
            this.copyUrlButton.classList.remove('copied');
          }, 2000);
        }

        logger.info('Share URL copied to clipboard');
      } else {
        this.showError(this.i18n.t('ui.errors.copy_failed'));
      }
    } catch (error) {
      logger.error('Copy to clipboard failed:', error);
      this.showError(this.i18n.t('ui.errors.copy_failed_short'));
    }
  }

  /**
   * Share via Web Share API
   */
  async shareViaWebAPI() {
    if (!this.shareURL) {
      logger.warn('No share URL available for Web Share API');
      return;
    }

    try {
      const success = await this.challengeManager.shareViaWebAPI(
        this.shareURL,
        'CalmMaze Challenge'
      );

      if (success) {
        logger.info('Shared via Web Share API');
        this.closeSharePanel();
      }
    } catch (error) {
      logger.error('Web Share API failed:', error);
    }
  }

  /**
   * Handle play again button click
   */
  handlePlayAgain() {
    this.closeSharePanel();

    if (this.onPlayAgain) {
      this.onPlayAgain();
    }
  }

  /**
   * Show challenge button and prepare panel when loading a shared challenge
   * @param {Object} challengeData - Loaded challenge data
   */
  showChallengeBanner(challengeData) {
    if (!this.challengeButton) {
      return;
    }

    const { maze, enemies, challenge, devices } = challengeData;

    // Populate challenge panel details
    if (this.challengeMazeSize) {
      this.challengeMazeSize.textContent = `${maze.size}x${maze.size}`;
    }

    if (this.challengeDifficulty) {
      this.challengeDifficulty.textContent = challenge.difficulty || 'Normal';
    }

    if (this.challengeEnemies) {
      this.challengeEnemies.textContent = enemies.count || 0;
    }

    if (this.challengeRechargePads) {
      this.challengeRechargePads.textContent = maze.rechargePadCount || maze.pads?.length || 0;
    }

    if (this.challengeTargetTime && challenge.completionTime) {
      const minutes = Math.floor(challenge.completionTime / 60000);
      const seconds = Math.floor((challenge.completionTime % 60000) / 1000);
      this.challengeTargetTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Populate device charges and show/hide based on enabled state using centralized mapping
    if (devices) {
      // Map difficulty device names to DOM elements and device data
      Object.entries(DEVICE_MAPPING.DIFFICULTY_TO_GAME).forEach(([difficultyName, gameName]) => {
        const chargesProperty = `${gameName}Charges`;
        const enabledProperty = `${gameName}Enabled`;
        const chargesElement = this[`challenge${difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1)}Charges`];
        const rowElement = this[`challenge${difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1)}Row`];

        const deviceEnabled = devices[enabledProperty] ?? true; // Default to true for backwards compatibility

        if (chargesElement) {
          chargesElement.textContent = devices[chargesProperty] || 0;
        }
        if (rowElement) {
          rowElement.style.display = deviceEnabled ? '' : 'none';
        }
      });
    }

    // Show the challenge button
    this.challengeButton.style.display = '';

    // Update translations
    if (this.i18n) {
      this.i18n.updateDOM();
    }

    logger.info('Challenge button shown');
  }

  /**
   * Toggle challenge panel visibility
   */
  toggleChallengePanel() {
    if (this.challengePanel) {
      if (this.challengePanel.style.display === 'block') {
        this.hideChallengePanel();
      } else {
        this.showChallengePanel();
      }
    }
  }

  /**
   * Show challenge panel
   */
  showChallengePanel() {
    if (this.challengePanel) {
      // Close config panel if callback is set
      if (this.onCloseConfigPanel) {
        this.onCloseConfigPanel();
      }
      this.challengePanel.style.display = 'block';
      logger.info('Challenge panel opened');
    }
  }

  /**
   * Hide challenge panel
   */
  hideChallengePanel() {
    if (this.challengePanel) {
      this.challengePanel.style.display = 'none';
      logger.info('Challenge panel closed');
    }
  }

  /**
   * Exit challenge mode
   */
  exitChallenge() {
    this.challengeManager.exitChallengeMode();
    this.hideChallengePanel();

    // Hide the challenge button
    if (this.challengeButton) {
      this.challengeButton.style.display = 'none';
    }

    // Reload the page to reset to normal mode
    window.location.href = window.location.href.split('#')[0];
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    // Simple error display - could be enhanced with a proper toast system
    alert(message);
  }

  /**
   * Get the challenge manager instance
   * @returns {ChallengeManager}
   */
  getChallengeManager() {
    return this.challengeManager;
  }

  /**
   * Check if currently in challenge mode
   * @returns {boolean}
   */
  isInChallengeMode() {
    return this.challengeManager.isInChallengeMode();
  }

  /**
   * Get current challenge data
   * @returns {Object|null}
   */
  getCurrentChallenge() {
    return this.challengeManager.getCurrentChallenge();
  }
}