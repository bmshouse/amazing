// modules/entities/IEntity.js - Base interface for all game entities
export class IEntity {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.type = 'entity';
    this.active = true;
  }

  // Abstract methods that should be implemented by concrete entities
  update(dt, gameContext) {
    throw new Error('update() method must be implemented by concrete entity class');
  }

  render(renderer, gameContext) {
    throw new Error('render() method must be implemented by concrete entity class');
  }

  // Common entity functionality
  getPosition() {
    return { x: this.x, y: this.y };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other) {
    if (typeof other.getPosition === 'function') {
      const pos = other.getPosition();
      return Math.hypot(this.x - pos.x, this.y - pos.y);
    }
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  isActive() {
    return this.active;
  }

  setActive(active) {
    this.active = active;
  }

  getType() {
    return this.type;
  }

  // Collision detection interface
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      radius: 0.3 // Default radius
    };
  }

  intersects(other) {
    const bounds1 = this.getBounds();
    const bounds2 = other.getBounds ? other.getBounds() : { x: other.x, y: other.y, radius: 0.3 };

    const dx = bounds1.x - bounds2.x;
    const dy = bounds1.y - bounds2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (bounds1.radius + bounds2.radius);
  }

  // Event handling interface
  onCollision(other, gameContext) {
    // Override in concrete classes
  }

  onDestroy(gameContext) {
    // Override in concrete classes
  }

  // Utility method for game state queries
  isColliding(x, y, maze) {
    return maze.cellAt(x, y) !== 0;
  }
}