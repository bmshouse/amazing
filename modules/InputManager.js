// modules/InputManager.js - Focused input handling (extracted from EventManager)
import { TouchManager } from './input/TouchManager.js';
import { logger } from './Logger.js';

export class InputManager {
  constructor() {
    this.inputState = {
      keys: new Set(),
      pointerLocked: false,
      mouse: { x: 0, y: 0, dx: 0, dy: 0 },
      touch: {
        active: false,
        pointers: new Map(),
        movementJoystick: { x: 0, y: 0, active: false },
        lookInput: { dx: 0, dy: 0 }
      }
    };

    // Initialize touch manager
    this.touchManager = new TouchManager();
    this.setupTouchIntegration();
    this.bindInputEvents();
  }

  bindInputEvents() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.inputState.keys.add(key);
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.inputState.keys.delete(key);
    });

    // Mouse events
    window.addEventListener('mousemove', (e) => {
      this.inputState.mouse.dx = e.movementX || 0;
      this.inputState.mouse.dy = e.movementY || 0;
      this.inputState.mouse.x = e.clientX;
      this.inputState.mouse.y = e.clientY;
    });

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
      this.inputState.pointerLocked = (document.pointerLockElement !== null);
    });
  }

  // Input state queries
  isKeyPressed(key) {
    return this.inputState.keys.has(key.toLowerCase());
  }

  isPointerLocked() {
    return this.inputState.pointerLocked;
  }

  getMousePosition() {
    return {
      x: this.inputState.mouse.x,
      y: this.inputState.mouse.y
    };
  }

  // Enhanced movement input that considers touch input
  getMovementInput() {
    const keyboardInput = {
      forward: this.isKeyPressed('w') || this.isKeyPressed('arrowup'),
      back: this.isKeyPressed('s') || this.isKeyPressed('arrowdown'),
      left: this.isKeyPressed('a') || this.isKeyPressed('arrowleft'),
      right: this.isKeyPressed('d') || this.isKeyPressed('arrowright'),
      sprint: this.isKeyPressed('shift'),
      turnLeft: this.isKeyPressed('q'),
      turnRight: this.isKeyPressed('e')
    };

    // If movement joystick is active, use touch input (independent of global touch state)
    if (this.inputState.touch.movementJoystick.active) {
      const joystick = this.inputState.touch.movementJoystick;

      const touchInput = {
        forward: joystick.y < -0.3,
        back: joystick.y > 0.3,
        left: joystick.x < -0.3,
        right: joystick.x > 0.3,
        sprint: false, // Could be implemented as a touch gesture later
        turnLeft: false,
        turnRight: false
      };

      // Debug logging to verify touch input processing
      if (joystick.x !== 0 || joystick.y !== 0) {
        logger.debug(`Touch input: forward=${touchInput.forward}, back=${touchInput.back}, left=${touchInput.left}, right=${touchInput.right} (joystick: x=${joystick.x.toFixed(2)}, y=${joystick.y.toFixed(2)})`);
      }

      // Use TouchManager's conflict resolution if available, otherwise prioritize touch
      if (this.touchManager && typeof this.touchManager.resolveInputConflict === 'function') {
        return this.touchManager.resolveInputConflict(touchInput, keyboardInput);
      } else {
        // Fallback: prioritize touch input over keyboard
        return touchInput;
      }
    }

    return keyboardInput;
  }

  // Get touch movement for look controls
  getTouchMovement() {
    if (!this.inputState.touch.active) {
      return { dx: 0, dy: 0 };
    }

    const movement = {
      dx: this.inputState.touch.lookInput.dx,
      dy: this.inputState.touch.lookInput.dy
    };

    // Reset movement deltas after reading them
    this.inputState.touch.lookInput.dx = 0;
    this.inputState.touch.lookInput.dy = 0;

    return movement;
  }

  // Enhanced mouse movement that considers touch fallback
  getMouseMovement() {
    // Only use touch movement if we're actually in touch mode and pointer is NOT locked
    // If pointer is locked, we should always use mouse movement regardless of touch state
    if (!this.inputState.pointerLocked &&
        this.isTouchActive() &&
        (Math.abs(this.inputState.touch.lookInput.dx) > 0 ||
         Math.abs(this.inputState.touch.lookInput.dy) > 0)) {
      return this.getTouchMovement();
    }

    const movement = {
      dx: this.inputState.mouse.dx,
      dy: this.inputState.mouse.dy
    };

    // Reset movement deltas after reading them
    this.inputState.mouse.dx = 0;
    this.inputState.mouse.dy = 0;
    return movement;
  }

  // Check if touch is supported and active
  isTouchActive() {
    return this.touchManager.hasTouch() && this.inputState.touch.active;
  }

  // Set movement joystick input (to be called by VirtualJoystick component)
  setMovementJoystickInput(x, y, active = true) {
    this.inputState.touch.movementJoystick = { x, y, active };
    // Debug logging to verify joystick input is being received
    if (active && (Math.abs(x) > 0.1 || Math.abs(y) > 0.1)) {
      logger.debug(`Movement joystick: x=${x.toFixed(2)}, y=${y.toFixed(2)}, active=${active}`);
    }
  }

  // Touch integration setup
  setupTouchIntegration() {
    if (!this.touchManager.hasTouch()) {
      return; // No touch support, skip setup
    }

    // Bind touch events to update input state
    this.touchManager.on('touchstart', (data) => {
      this.inputState.touch.active = true;
    });

    this.touchManager.on('touchmove', (data) => {
      this.handleTouchMove(data);
    });

    this.touchManager.on('touchend', (data) => {
      this.inputState.touch.active = data.touchCount > 0;
      if (data.touchCount === 0) {
        this.resetTouchInput();
      }
    });

    this.touchManager.on('touchcancel', (data) => {
      this.inputState.touch.active = false;
      this.resetTouchInput();
    });

    this.touchManager.on('touchfallback', (data) => {
      // Handle fallback to mouse events
      if (data.mouseEvent) {
        this.inputState.mouse.dx = data.mouseEvent.movementX || 0;
        this.inputState.mouse.dy = data.mouseEvent.movementY || 0;
        this.inputState.mouse.x = data.mouseEvent.clientX;
        this.inputState.mouse.y = data.mouseEvent.clientY;
      }
    });
  }

  handleTouchMove(data) {
    try {
      // Process touch movement for look controls and virtual joystick
      if (data.touches.length === 1) {
        const touch = data.touches[0];
        const stored = this.touchManager.getTouchById(touch.identifier);

        if (stored) {
          // Calculate movement delta
          const dx = touch.clientX - stored.x;
          const dy = touch.clientY - stored.y;

          // Update touch look input (similar to mouse movement)
          this.inputState.touch.lookInput.dx = dx;
          this.inputState.touch.lookInput.dy = dy;
        }
      }
    } catch (error) {
      logger.warn('Touch move processing failed:', error);
    }
  }

  resetTouchInput() {
    this.inputState.touch.movementJoystick = { x: 0, y: 0, active: false };
    this.inputState.touch.lookInput = { dx: 0, dy: 0 };
    this.inputState.touch.pointers.clear();
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
    if (this.touchManager) {
      this.touchManager.destroy();
    }
    this.inputState.keys.clear();
  }
}