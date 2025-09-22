// modules/EventManager.js - Centralized event handling and input management
export class EventManager {
  constructor() {
    this.eventListeners = new Map();
    this.inputState = {
      keys: new Set(),
      pointerLocked: false,
      mouse: { x: 0, y: 0, dx: 0, dy: 0 }
    };
    this.bindDefaultEvents();
  }

  bindDefaultEvents() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.inputState.keys.add(key);
      this.emit('keydown', { key, code: e.code, event: e });
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.inputState.keys.delete(key);
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
      this.inputState.mouse.dx = e.movementX || 0;
      this.inputState.mouse.dy = e.movementY || 0;
      this.inputState.mouse.x = e.clientX;
      this.inputState.mouse.y = e.clientY;
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
      this.inputState.pointerLocked = (document.pointerLockElement !== null);
      this.emit('pointerlockchange', { locked: this.inputState.pointerLocked });
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
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Input state queries
  isKeyPressed(key) {
    return this.inputState.keys.has(key.toLowerCase());
  }

  isPointerLocked() {
    return this.inputState.pointerLocked;
  }

  getMouseMovement() {
    const movement = {
      dx: this.inputState.mouse.dx,
      dy: this.inputState.mouse.dy
    };
    // Reset movement deltas after reading them
    this.inputState.mouse.dx = 0;
    this.inputState.mouse.dy = 0;
    return movement;
  }

  getMousePosition() {
    return {
      x: this.inputState.mouse.x,
      y: this.inputState.mouse.y
    };
  }

  // Utility methods for common input patterns
  getMovementInput() {
    return {
      forward: this.isKeyPressed('w') || this.isKeyPressed('arrowup'),
      back: this.isKeyPressed('s') || this.isKeyPressed('arrowdown'),
      left: this.isKeyPressed('a') || this.isKeyPressed('arrowleft'),
      right: this.isKeyPressed('d') || this.isKeyPressed('arrowright'),
      sprint: this.isKeyPressed('shift'),
      turnLeft: this.isKeyPressed('q'),
      turnRight: this.isKeyPressed('e')
    };
  }

  // Request pointer lock
  requestPointerLock(element) {
    if (element.requestPointerLock) {
      element.requestPointerLock();
    }
  }

  // Clear input state (useful for game resets)
  clearInputState() {
    this.inputState.keys.clear();
    this.inputState.mouse.dx = 0;
    this.inputState.mouse.dy = 0;
  }

  // Cleanup method
  destroy() {
    this.eventListeners.clear();
    this.inputState.keys.clear();
  }
}