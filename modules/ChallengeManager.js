// modules/ChallengeManager.js - Manages challenge sharing and loading
import { MazeEncoder } from './MazeEncoder.js';
import { Maze } from './maze.js';
import { GameConfig } from './GameConfig.js';
import { logger } from './Logger.js';

export class ChallengeManager {
  constructor() {
    this.encoder = new MazeEncoder();
    this.currentChallenge = null;
    this.isPlayingChallenge = false;
    this.originalMazeGenerator = null;

    // Event callbacks
    this.onChallengeLoaded = null;
    this.onChallengeShared = null;
    this.onChallengeError = null;
  }

  /**
   * Initialize challenge manager and check for challenge URL on page load
   */
  initialize() {
    // Check if we loaded the page with a challenge URL
    const encodedChallenge = this.encoder.parseShareableURL();
    if (encodedChallenge) {
      this.loadChallengeFromURL(encodedChallenge);
    }

    // Listen for URL changes (back/forward navigation)
    window.addEventListener('popstate', () => {
      const challenge = this.encoder.parseShareableURL();
      if (challenge) {
        this.loadChallengeFromURL(challenge);
      } else {
        this.exitChallengeMode();
      }
    });

    logger.info('ChallengeManager initialized');
  }

  /**
   * Create a shareable challenge from current game state
   * @param {Object} gameData - Current game state
   * @returns {string} Shareable URL
   */
  createChallenge(gameData) {
    try {
      // Add current timestamp as completion time if game was won
      const challengeData = {
        ...gameData,
        completionTime: gameData.completionTime || null,
        playerName: gameData.playerName || 'Anonymous'
      };

      const shareableURL = this.encoder.generateShareableURL(challengeData);

      // Store the challenge for reference
      this.currentChallenge = this.encoder.serializeGameState(challengeData);

      logger.info('Challenge created successfully:', this.encoder.getChallengeSummary(this.currentChallenge));

      if (this.onChallengeShared) {
        this.onChallengeShared(shareableURL, this.currentChallenge);
      }

      return shareableURL;
    } catch (error) {
      logger.error('Failed to create challenge:', error);
      if (this.onChallengeError) {
        this.onChallengeError('Failed to create shareable challenge', error);
      }
      throw error;
    }
  }

  /**
   * Load and validate a challenge from URL
   * @param {string} encodedData - Encoded challenge data
   * @returns {Object|null} Decoded challenge data or null if invalid
   */
  loadChallengeFromURL(encodedData) {
    try {
      const challengeData = this.encoder.decodeFromURL(encodedData);

      if (!this.encoder.validateGameState(challengeData)) {
        throw new Error('Invalid challenge data structure');
      }

      this.currentChallenge = challengeData;
      this.isPlayingChallenge = true;

      logger.info('Challenge loaded:', this.encoder.getChallengeSummary(challengeData));

      if (this.onChallengeLoaded) {
        this.onChallengeLoaded(challengeData);
      }

      return challengeData;
    } catch (error) {
      logger.error('Failed to load challenge:', error);
      if (this.onChallengeError) {
        this.onChallengeError('Failed to load shared challenge', error);
      }
      return null;
    }
  }

  /**
   * Generate a maze from challenge data using seeded randomization
   * @param {Object} challengeData - Challenge data
   * @returns {Object} Generated maze and game configuration
   */
  generateMazeFromChallenge(challengeData) {
    if (!challengeData || !this.encoder.validateGameState(challengeData)) {
      throw new Error('Invalid challenge data');
    }

    // Seed the random number generator for reproducible maze generation
    this.seedRandom(challengeData.seed);

    // Create maze with challenge specifications
    const maze = new Maze(
      challengeData.maze.size,
      challengeData.maze.size,
      challengeData.maze.rechargePadCount
    );

    // Generate maze (will use seeded randomization)
    maze.generate();

    // Restore random state after generation
    this.restoreRandom();

    // Validate that the generated maze matches the challenge
    if (!this.validateMazeMatch(maze, challengeData.maze)) {
      logger.warn('Generated maze does not match challenge data exactly');
    }

    return {
      maze,
      config: {
        enemyCount: challengeData.enemies.count,
        enemySpeed: challengeData.enemies.speed,
        devices: challengeData.devices,
        difficultyPreset: challengeData.challenge.difficulty
      },
      enemySpawns: challengeData.enemies.spawns
    };
  }

  /**
   * Simple seeded random number generator (for reproducible maze generation)
   * @param {number} seed - Random seed
   */
  seedRandom(seed) {
    // Store original Math.random
    this.originalRandom = Math.random;

    // Simple LCG (Linear Congruential Generator)
    let currentSeed = seed;
    Math.random = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };

    logger.debug('Seeded random generator with seed:', seed);
  }

  /**
   * Restore original random number generator
   */
  restoreRandom() {
    if (this.originalRandom) {
      Math.random = this.originalRandom;
      this.originalRandom = null;
    }
  }

  /**
   * Validate that generated maze matches challenge specifications
   * @param {Maze} maze - Generated maze
   * @param {Object} challengeMaze - Challenge maze data
   * @returns {boolean} True if maze matches
   */
  validateMazeMatch(maze, challengeMaze) {
    // Check basic properties
    if (maze.w !== challengeMaze.size || maze.h !== challengeMaze.size) {
      return false;
    }

    if (maze.pads.length !== challengeMaze.rechargePadCount) {
      return false;
    }

    // Check exit position (within tolerance)
    const exitMatch = Math.abs(maze.exit.x - challengeMaze.exit.x) < 0.1 &&
                     Math.abs(maze.exit.y - challengeMaze.exit.y) < 0.1;

    return exitMatch;
  }

  /**
   * Exit challenge mode and return to normal gameplay
   */
  exitChallengeMode() {
    this.isPlayingChallenge = false;
    this.currentChallenge = null;

    // Remove challenge from URL without page reload
    if (window.history && window.history.replaceState) {
      const baseURL = window.location.href.split('#')[0];
      window.history.replaceState({}, document.title, baseURL);
    }

    logger.info('Exited challenge mode');
  }

  /**
   * Get current challenge information
   * @returns {Object|null} Current challenge data
   */
  getCurrentChallenge() {
    return this.currentChallenge;
  }

  /**
   * Check if currently playing a shared challenge
   * @returns {boolean} True if playing a challenge
   */
  isInChallengeMode() {
    return this.isPlayingChallenge;
  }

  /**
   * Get a human-readable description of the current challenge
   * @returns {string} Challenge description
   */
  getCurrentChallengeSummary() {
    if (!this.currentChallenge) {
      return 'No active challenge';
    }

    return this.encoder.getChallengeSummary(this.currentChallenge);
  }

  /**
   * Copy challenge URL to clipboard
   * @param {string} url - URL to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard(url) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Share challenge via Web Share API (if available)
   * @param {string} url - Challenge URL
   * @param {string} title - Share title
   * @returns {Promise<boolean>} Success status
   */
  async shareViaWebAPI(url, title = 'CalmMaze Challenge') {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `Try this CalmMaze challenge: ${this.getCurrentChallengeSummary()}`,
          url: url
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Web Share API failed:', error);
      return false;
    }
  }
}