// modules/ProjectileSystem.js - Manages projectile physics and collisions
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
  }

  addProjectile(projectileData) {
    this.projectiles.push({ ...projectileData });
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Move projectile
      projectile.x += Math.cos(projectile.a) * projectile.v * (dt / 1000);
      projectile.y += Math.sin(projectile.a) * projectile.v * (dt / 1000);

      // Check wall collision
      if (this.maze.cellAt(projectile.x, projectile.y) === 1) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check enemy collision
      const hitEnemy = this.enemyController.findHit(projectile.x, projectile.y, projectile.r);
      if (hitEnemy) {
        this.handleEnemyHit(projectile, hitEnemy);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check projectile lifetime (optional, can add max distance/time)
      const age = performance.now() - projectile.born;
      if (age > 10000) { // 10 second max lifetime
        this.projectiles.splice(i, 1);
        continue;
      }
    }
  }

  /**
   * Handles collision between a projectile and an enemy
   * @param {Object} projectile - The projectile that hit the enemy
   * @param {Object} enemy - The enemy that was hit
   */
  handleEnemyHit(projectile, enemy) {
    // Apply weapon effect based on projectile type
    if (projectile.weapon && projectile.weapon.applyEffect) {
      projectile.weapon.applyEffect(enemy);
    } else {
      // Fallback for legacy projectile types
      this.applyLegacyEffect(projectile, enemy);
    }

    // Trigger hit callback with particle effect
    if (this.onHit) {
      this.onHit(projectile.x, projectile.y, projectile.color);
    }
  }

  /**
   * Applies legacy weapon effects for backward compatibility
   * @param {Object} projectile - The projectile with effect information
   * @param {Object} enemy - The enemy to apply the effect to
   */
  applyLegacyEffect(projectile, enemy) {
    const t = performance.now();
    switch (projectile.type) {
      case 'stun':
        enemy.state = 'slowed';
        enemy.speedMul = 0.35;
        enemy.stateTime = t;
        break;
      case 'tranq':
        enemy.state = 'tranq';
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
}