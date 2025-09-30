// modules/EventManager.js - Unified interface for event and input systems
import { InputManager } from './InputManager.js';
import { EventSystemManager } from './EventSystemManager.js';
import { logger } from './Logger.js';

export class EventManager {
  constructor() {
    // Delegate to focused classes (Composition over inheritance)
    this.inputManager = new InputManager();
    this.eventSystem = new EventSystemManager();

    // Maintain backward compatibility by proxying methods
    this.setupCompatibilityLayer();
  }

  setupCompatibilityLayer() {
    // Proxy event system methods
    this.on = this.eventSystem.on.bind(this.eventSystem);
    this.off = this.eventSystem.off.bind(this.eventSystem);
    this.emit = this.eventSystem.emit.bind(this.eventSystem);

    // Proxy input manager methods
    this.isKeyPressed = this.inputManager.isKeyPressed.bind(this.inputManager);
    this.isPointerLocked = this.inputManager.isPointerLocked.bind(this.inputManager);
    this.getMousePosition = this.inputManager.getMousePosition.bind(this.inputManager);
    this.getMovementInput = this.inputManager.getMovementInput.bind(this.inputManager);
    this.getMouseMovement = this.inputManager.getMouseMovement.bind(this.inputManager);
    this.getTouchMovement = this.inputManager.getTouchMovement.bind(this.inputManager);
    this.isTouchActive = this.inputManager.isTouchActive.bind(this.inputManager);
    this.setMovementJoystickInput = this.inputManager.setMovementJoystickInput.bind(this.inputManager);
    this.requestPointerLock = this.inputManager.requestPointerLock.bind(this.inputManager);
    this.clearInputState = this.inputManager.clearInputState.bind(this.inputManager);
    this.resetTouchInput = this.inputManager.resetTouchInput.bind(this.inputManager);

    // Expose inputState for backward compatibility
    this.inputState = this.inputManager.inputState;
  }

  // Cleanup method
  destroy() {
    if (this.inputManager) {
      this.inputManager.destroy();
    }
    if (this.eventSystem) {
      this.eventSystem.destroy();
    }
  }
}