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
  /**
   * Gets the collision bounds for this entity
   * @returns {Object} Collision bounds with x, y, and radius properties
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      radius: 0.3 // Default radius
    };
  }

  /**
   * Checks if this entity intersects with another entity using circular collision detection
   * @param {Object} other - The other entity or object to check collision against
   * @returns {boolean} True if the entities are colliding, false otherwise
   */
  intersects(other) {
    const bounds1 = this.getBounds();
    const bounds2 = other.getBounds ? other.getBounds() : { x: other.x, y: other.y, radius: 0.3 };

    const dx = bounds1.x - bounds2.x;
    const dy = bounds1.y - bounds2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (bounds1.radius + bounds2.radius);
  }

  // Event handling interface
  /**
   * Called when this entity collides with another entity
   * @param {Object} other - The other entity involved in the collision
   * @param {Object} gameContext - Game context containing relevant game state
   */
  onCollision(other, gameContext) {
    // Override in concrete classes
  }

  /**
   * Called when this entity is destroyed
   * @param {Object} gameContext - Game context containing relevant game state
   */
  onDestroy(gameContext) {
    // Override in concrete classes
  }

  // Utility method for game state queries
  /**
   * Checks if a position would collide with maze walls
   * @param {number} x - X coordinate to check
   * @param {number} y - Y coordinate to check
   * @param {Object} maze - Maze object with cellAt method
   * @returns {boolean} True if the position would collide with a wall
   */
  isColliding(x, y, maze) {
    return maze.cellAt(x, y) !== 0;
  }
}