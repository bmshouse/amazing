// modules/entities/PlayerEntity.js - Player entity with movement and collision
import { IEntity } from './IEntity.js';

export class PlayerEntity extends IEntity {
  constructor(x = 1.5, y = 1.5) {
    super(x, y);
    this.type = 'player';
    this.a = 0; // angle
    this.speed = 2.4; // units/sec
    this.turnSpeed = 2.4; // radians/sec via keyboard
    this.sensitivity = 0.5; // mouse sensitivity
    this.radius = 0.3; // collision radius
  }

  update(dt, gameContext) {
    if (!gameContext.eventManager) return;

    this.handleMovement(dt, gameContext);
    this.handleRotation(dt, gameContext);
  }

  handleMovement(dt, gameContext) {
    const input = gameContext.eventManager.getMovementInput();
    const s = (dt / 1000) * (input.sprint ? this.speed * 1.4 : this.speed);

    const forward = input.forward ? 1 : 0;
    const back = input.back ? 1 : 0;
    const left = input.left ? 1 : 0;
    const right = input.right ? 1 : 0;

    const mx = Math.cos(this.a) * (forward - back) + Math.cos(this.a + Math.PI/2) * (right - left);
    const my = Math.sin(this.a) * (forward - back) + Math.sin(this.a + Math.PI/2) * (right - left);

    const nx = this.x + mx * s;
    const ny = this.y + my * s;

    // Collision detection with walls
    if (gameContext.maze.cellAt(nx, this.y) === 0) this.x = nx;
    if (gameContext.maze.cellAt(this.x, ny) === 0) this.y = ny;
  }

  handleRotation(dt, gameContext) {
    const input = gameContext.eventManager.getMovementInput();

    // Keyboard turning
    if (input.turnLeft) this.a -= (dt / 1000) * this.turnSpeed;
    if (input.turnRight) this.a += (dt / 1000) * this.turnSpeed;

    // Mouse turning (if pointer locked)
    if (gameContext.eventManager.isPointerLocked()) {
      const mouseMovement = gameContext.eventManager.getMouseMovement();
      this.a += mouseMovement.dx * 0.002 * this.sensitivity;
    }
  }

  render(renderer, gameContext) {
    // Player doesn't render itself in first-person view
    // This method is here for interface compliance
  }

  reset(maze) {
    this.x = 1.5;
    this.y = 1.5;
    this.a = 0;
  }

  turn(dx) {
    this.a += dx * 0.002 * this.sensitivity;
  }

  setSensitivity(sensitivity) {
    this.sensitivity = sensitivity;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius
    };
  }

  getAngle() {
    return this.a;
  }

  setAngle(angle) {
    this.a = angle;
  }

  getForwardVector() {
    return {
      x: Math.cos(this.a),
      y: Math.sin(this.a)
    };
  }

  getLookDirection() {
    return this.a;
  }
}