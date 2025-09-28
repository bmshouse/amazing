// modules/EventSystemManager.js - Pure event system (Single Responsibility)
import { logger } from './Logger.js';

export class EventSystemManager {
  constructor() {
    this.eventListeners = new Map();
    this.bindDefaultEvents();
  }

  bindDefaultEvents() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.emit('keydown', { key, code: e.code, event: e });
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.emit('keyup', { key, code: e.code, event: e });
    });

    // Mouse events
    window.addEventListener('mousedown', (e) => {
      this.emit('mousedown', { button: e.button, event: e });
    });

    window.addEventListener('mouseup', (e) => {
      this.emit('mouseup', { button: e.button, event: e });
    });

    window.addEventListener('mousemove', (e) => {
      this.emit('mousemove', {
        x: e.clientX,
        y: e.clientY,
        dx: e.movementX || 0,
        dy: e.movementY || 0,
        event: e
      });
    });

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement !== null;
      this.emit('pointerlockchange', { locked });
    });

    // Window events
    window.addEventListener('resize', (e) => {
      this.emit('resize', { event: e });
    });
  }

  // Event emitter pattern
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(eventType, data = {}) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Cleanup method
  destroy() {
    this.eventListeners.clear();
  }
}