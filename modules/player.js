// modules/player.js - movement, collisions, HUD, input handling
import { GameConfig } from './GameConfig.js';

export class PlayerController {
  constructor(maze) {
    this.x = GameConfig.PLAYER.START_X;
    this.y = GameConfig.PLAYER.START_Y;
    this.a = GameConfig.PLAYER.START_ANGLE;
    this.speed = GameConfig.PLAYER.SPEED;
    this.turnSpeed = GameConfig.PLAYER.TURN_SPEED;
    this.sensitivity = GameConfig.PLAYER.DEFAULT_SENSITIVITY;
    this.pointerLocked = false;
    this.keys = new Set();
    this.eventManager = null; // Will be injected
    this.bindKeys();
    this.reset(maze);
  }

  reset(maze) {
    this.x = GameConfig.PLAYER.START_X;
    this.y = GameConfig.PLAYER.START_Y;
    this.a = GameConfig.PLAYER.START_ANGLE;
    this.keys.clear();
    this.timerStart = performance.now();
  }

  setEventManager(eventManager) {
    this.eventManager = eventManager;
  }

  bindKeys() {
    // Fallback to direct window events if EventManager not available
    window.addEventListener('keydown', e=>{
      const k = e.key.toLowerCase();
      this.keys.add(k);
    });
    window.addEventListener('keyup', e=>{
      const k = e.key.toLowerCase();
      this.keys.delete(k);
    });
  }

  turn(dx) {
    this.a += dx * 0.002 * this.sensitivity;
  }

  distanceTo(x, y) { return Math.hypot(x - this.x, y - this.y); }

  update(dt, gameContext) {
    const maze = gameContext.maze || gameContext; // Support both old and new calling conventions

    // Use EventManager if available, otherwise fall back to direct key checking
    let input;
    if (this.eventManager) {
      input = this.eventManager.getMovementInput();
    } else {
      // Fallback to direct key checking
      input = {
        forward: this.keys.has('w') || this.keys.has('arrowup'),
        back: this.keys.has('s') || this.keys.has('arrowdown'),
        left: this.keys.has('a') || this.keys.has('arrowleft'),
        right: this.keys.has('d') || this.keys.has('arrowright'),
        sprint: this.keys.has('shift'),
        turnLeft: this.keys.has('q'),
        turnRight: this.keys.has('e')
      };
    }

    const s = (dt/1000) * (input.sprint ? this.speed * GameConfig.PLAYER.SPRINT_MULTIPLIER : this.speed);
    const forward = input.forward ? 1 : 0;
    const back = input.back ? 1 : 0;
    const left = input.left ? 1 : 0;
    const right = input.right ? 1 : 0;

    if (input.turnLeft) this.a -= (dt/1000)*this.turnSpeed;
    if (input.turnRight) this.a += (dt/1000)*this.turnSpeed;

    // Handle mouse movement if EventManager available and pointer locked
    if (this.eventManager && this.eventManager.isPointerLocked()) {
      const mouseMovement = this.eventManager.getMouseMovement();
      this.a += mouseMovement.dx * 0.002 * this.sensitivity;
    }

    const mx = Math.cos(this.a) * (forward - back) + Math.cos(this.a + Math.PI/2) * (right - left);
    const my = Math.sin(this.a) * (forward - back) + Math.sin(this.a + Math.PI/2) * (right - left);

    const nx = this.x + mx * s;
    const ny = this.y + my * s;

    // Collision: simple circle vs grid walls
    if (maze.cellAt(nx, this.y) === 0) this.x = nx;
    if (maze.cellAt(this.x, ny) === 0) this.y = ny;
  }
}
