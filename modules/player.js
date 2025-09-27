// modules/player.js - movement, collisions, HUD, input handling
import { GameConfig } from './GameConfig.js';

export class PlayerController {
  constructor(maze) {
    this.x = GameConfig.PLAYER.START_X;
    this.y = GameConfig.PLAYER.START_Y;
    this.a = GameConfig.PLAYER.START_ANGLE; // Will be updated in reset()
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
    this.a = this.findBestStartingDirection(maze);
    this.keys.clear();
    this.timerStart = performance.now();
  }

  setEventManager(eventManager) {
    this.eventManager = eventManager;
  }

  /**
   * Finds the best starting direction for the player to face an open path
   * @param {Object} maze - The maze object to check for walls
   * @returns {number} The best angle in radians to face
   */
  findBestStartingDirection(maze) {
    const startX = GameConfig.PLAYER.START_X;
    const startY = GameConfig.PLAYER.START_Y;
    const checkDistance = 3.0; // Distance to check for open path

    // Test the four cardinal directions
    const directions = [
      { angle: 0, name: 'East' },           // Right
      { angle: Math.PI / 2, name: 'South' }, // Down
      { angle: Math.PI, name: 'West' },     // Left
      { angle: 3 * Math.PI / 2, name: 'North' } // Up
    ];

    let bestDirection = GameConfig.PLAYER.START_ANGLE; // Fallback to default
    let longestPath = 0;

    for (const dir of directions) {
      const pathLength = this.getPathLength(maze, startX, startY, dir.angle, checkDistance);

      if (pathLength > longestPath) {
        longestPath = pathLength;
        bestDirection = dir.angle;
      }
    }

    return bestDirection;
  }

  /**
   * Calculates how far the player can see in a given direction before hitting a wall
   * @param {Object} maze - The maze object
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   * @param {number} angle - Direction angle in radians
   * @param {number} maxDistance - Maximum distance to check
   * @returns {number} Distance until hitting a wall
   */
  getPathLength(maze, startX, startY, angle, maxDistance) {
    const stepSize = 0.1;
    let distance = 0;

    while (distance < maxDistance) {
      const checkX = startX + Math.cos(angle) * distance;
      const checkY = startY + Math.sin(angle) * distance;

      // Check if we hit a wall
      if (maze.cellAt(checkX, checkY) !== 0) {
        return distance;
      }

      distance += stepSize;
    }

    return maxDistance; // Full distance is clear
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

    // Collision detection: check each axis separately to allow sliding along walls
    if (maze.cellAt(nx, this.y) === 0) this.x = nx;
    if (maze.cellAt(this.x, ny) === 0) this.y = ny;
  }
}
