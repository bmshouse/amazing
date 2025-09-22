// modules/GameState.js - Manages game lifecycle and state
export class GameState {
  constructor() {
    this.state = {
      started: false,
      startTime: 0,
      elapsed: 0,
      won: false,
      dev: false
    };
    this.callbacks = {
      onStart: [],
      onRestart: [],
      onWin: [],
      onStateChange: []
    };
  }

  initialize(options = {}) {
    this.state.dev = options.dev || false;
    this.notifyStateChange();
  }

  startGame() {
    this.state.started = true;
    this.state.won = false;
    this.state.startTime = performance.now();
    this.notifyCallbacks('onStart');
    this.notifyStateChange();
  }

  restartGame() {
    this.state.startTime = performance.now();
    this.state.won = false;
    this.state.started = true;
    this.notifyCallbacks('onRestart');
    this.notifyStateChange();
  }

  winGame() {
    this.state.won = true;
    this.state.started = false;
    this.notifyCallbacks('onWin');
    this.notifyStateChange();
  }

  updateElapsed() {
    if (this.state.started) {
      this.state.elapsed = performance.now() - this.state.startTime;
    }
  }

  getFormattedTime() {
    const t = Math.max(0, Math.floor(this.state.elapsed / 1000));
    const m = (t / 60) | 0;
    const s = (t % 60) | 0;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  isStarted() {
    return this.state.started;
  }

  isWon() {
    return this.state.won;
  }

  isDev() {
    return this.state.dev;
  }

  // Event system for game state changes
  onStart(callback) {
    this.callbacks.onStart.push(callback);
  }

  onRestart(callback) {
    this.callbacks.onRestart.push(callback);
  }

  onWin(callback) {
    this.callbacks.onWin.push(callback);
  }

  onStateChange(callback) {
    this.callbacks.onStateChange.push(callback);
  }

  notifyCallbacks(eventType) {
    this.callbacks[eventType].forEach(callback => callback(this.state));
  }

  notifyStateChange() {
    this.callbacks.onStateChange.forEach(callback => callback(this.state));
  }

  // For debugging
  getState() {
    return { ...this.state };
  }
}