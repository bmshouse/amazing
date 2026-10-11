// modules/ProjectileSystem.js - Manages projectile physics and collisions
import { GameConfig, DEVICE_TYPES, ENEMY_STATES } from './GameConfig.js';

export class ProjectileSystem {
  /**
   * Creates a new ProjectileSystem instance
   * @param {Object} maze - Maze object for wall collision detection
   * @param {Object} enemyController - Enemy controller for entity collision detection
   */
  constructor(maze, enemyController) {
    this.maze = maze;
    this.enemyController = enemyController;
    this.projectiles = [];
    this.onHit = null;
    this.onMiss = null;
  }

  addProjectile(projectileData) {
    this.projectiles.push({ ...projectileData });
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Move projectile
      const fromX = projectile.x, fromY = projectile.y;
      projectile.x += Math.cos(projectile.a) * projectile.v * (dt / 1000);
      projectile.y += Math.sin(projectile.a) * projectile.v * (dt / 1000);

      // Check enemy collision along the whole step, before the wall check so a shot that
      // ends inside a wall still hits a snowman standing in front of it
      const hitEnemy = this.enemyController.findHitAlongSegment(fromX, fromY, projectile.x, projectile.y, projectile.r);
      if (hitEnemy) {
        this.handleEnemyHit(projectile, hitEnemy);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check wall collision: the dart fizzles out at the last open point before the wall
      if (this.maze.cellAt(projectile.x, projectile.y) === 1) {
        const end = this.lastOpenPoint(fromX, fromY, projectile.x, projectile.y);
        this.projectiles.splice(i, 1);
        if (this.onMiss) this.onMiss(end.x, end.y, projectile.color);
        continue;
      }

      // Check projectile lifetime (optional, can add max distance/time)
      const age = performance.now() - projectile.born;
      if (age > 10000) { // 10 second max lifetime
        this.projectiles.splice(i, 1);
        if (this.onMiss) this.onMiss(projectile.x, projectile.y, projectile.color);
        continue;
      }
    }
  }

  /**
   * Walks a step that ended inside a wall back to the last open point along it, so the
   * miss effect appears against the wall face rather than a whole step short of it.
   * @private
   */
  lastOpenPoint(x0, y0, x1, y1) {
    const SUBSTEPS = 8;
    let last = { x: x0, y: y0 };
    for (let s = 1; s <= SUBSTEPS; s++) {
      const x = x0 + (x1 - x0) * s / SUBSTEPS;
      const y = y0 + (y1 - y0) * s / SUBSTEPS;
      if (this.maze.cellAt(x, y) === 1) break;
      last = { x, y };
    }
    return last;
  }

  /**
   * Handles collision between a projectile and an enemy
   * @param {Object} projectile - The projectile that hit the enemy
   * @param {Object} enemy - The enemy that was hit
   */
  handleEnemyHit(projectile, enemy) {
    // Apply device effect based on projectile type
    if (projectile.device && projectile.device.applyEffect) {
      projectile.device.applyEffect(enemy);
    } else {
      // Fallback for legacy projectile types
      this.applyLegacyEffect(projectile, enemy);
    }

    // Trigger hit callback with particle effect
    if (this.onHit) {
      this.onHit(projectile.x, projectile.y, projectile.color, projectile.type, projectile.a);
    }
  }

  /**
   * Applies legacy device effects for backward compatibility
   * @param {Object} projectile - The projectile with effect information
   * @param {Object} enemy - The enemy to apply the effect to
   */
  applyLegacyEffect(projectile, enemy) {
    const t = performance.now();
    switch (projectile.type) {
      case DEVICE_TYPES.STUN:
        enemy.state = ENEMY_STATES.SLOWED;
        enemy.speedMul = GameConfig.DEVICES.STUN.SLOWDOWN_FACTOR;
        enemy.stateTime = t;
        break;
      case DEVICE_TYPES.TRANQ:
        enemy.state = ENEMY_STATES.TRANQ;
        enemy.speedMul = 0;
        enemy.stateTime = t;
        break;
    }
  }

  getProjectiles() {
    return this.projectiles;
  }

  clear() {
    this.projectiles = [];
  }

  // For rendering - get projectiles as drawable entities
  getDrawableProjectiles() {
    return this.projectiles.map(p => ({
      x: p.x,
      y: p.y,
      color: p.color,
      size: p.r * 2,
      type: 'projectile'
    }));
  }

  setHitCallback(callback) {
    this.onHit = callback;
  }

  /** @param {(x: number, y: number, color: string) => void} callback - called where a dart ends without hitting anything */
  setMissCallback(callback) {
    this.onMiss = callback;
  }
}