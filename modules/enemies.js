// modules/enemies.js - friendly AI that pushes player back
import { GameConfig } from './GameConfig.js';

export class EnemyController {
  constructor(maze, player) {
    this.maze = maze;
    this.player = player;
    this.entities = [];
    this.onBoop = (_x,_y)=>{};
    // Cache for pathfinding distances to avoid expensive recalculations
    this.pathDistanceCache = new Map();
    this.reset(maze);
  }

  reset(maze) {
    this.maze = maze;
    this.entities = [];
    // Clear pathfinding cache when maze resets
    this.pathDistanceCache.clear();
    const cells = [];
    for (let y=1;y<maze.h;y+=2) for (let x=1;x<maze.w;x+=2) if (maze.grid[y][x]===0) cells.push({x:x+0.5, y:y+0.5});
    for (let i=0;i<GameConfig.ENEMIES.COUNT && cells.length;i++) {
      const k = (Math.random()*cells.length)|0;
      const c = cells.splice(k,1)[0];
      const dStart = Math.hypot(c.x-GameConfig.PLAYER.START_X, c.y-GameConfig.PLAYER.START_Y);
      if (dStart < GameConfig.ENEMIES.MIN_SPAWN_DISTANCE) continue;
      this.entities.push({
        x:c.x, y:c.y,
        state:'idle',
        stateTime: performance.now(),
        speed: GameConfig.ENEMIES.SPEED,
        speedMul: 1
      });
    }
  }

  update(dt, maze) {
    this.maze = maze;
    const t = performance.now();
    for (const e of this.entities) {
      // state recovery using config values
      if (e.state==='stunned' && t - e.stateTime > GameConfig.ENEMIES.STUNNED_DURATION) { e.state='idle'; e.speedMul=1; }
      if (e.state==='slowed' && t - e.stateTime > GameConfig.ENEMIES.SLOWED_DURATION) { e.state='idle'; e.speedMul=1; }
      if (e.state==='tranq'  && t - e.stateTime > GameConfig.ENEMIES.TRANQ_DURATION) { e.state='idle'; e.speedMul=1; }

      // simple steering: chase if close, wander otherwise
      let targetA = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      const chase = dist < GameConfig.ENEMIES.CHASE_DISTANCE && e.state!=='tranq';

      if (!chase) {
        // wander: jitter
        targetA += (Math.random()-0.5)*GameConfig.ENEMIES.WANDER_JITTER;
      }

      const v = e.speed * e.speedMul * (dt/1000);
      const nx = e.x + Math.cos(targetA) * v;
      const ny = e.y + Math.sin(targetA) * v;
      if (maze.cellAt(nx, e.y) === 0) e.x = nx;
      if (maze.cellAt(e.x, ny) === 0) e.y = ny;

      // Pushback if close
      if (dist < GameConfig.ENEMIES.COLLISION_DISTANCE) {
        // Determine push direction based on player position relative to exit
        let pushX, pushY;

        if (this.maze.exit && this.isPlayerBetweenEnemyAndExit(e, this.player, this.maze.exit)) {
          // Player is closer to exit - PULL player toward enemy (away from exit)
          const ax = e.x - this.player.x;  // Vector from player to enemy (reversed)
          const ay = e.y - this.player.y;
          const len = Math.hypot(ax, ay) || 1;
          const push = GameConfig.ENEMIES.PUSHBACK_FORCE;
          pushX = this.player.x + (ax/len)*push;
          pushY = this.player.y + (ay/len)*push;
        } else {
          // Player is farther from exit or no exit - PUSH player away from enemy (normal behavior)
          const ax = this.player.x - e.x;  // Vector from enemy to player (original)
          const ay = this.player.y - e.y;
          const len = Math.hypot(ax, ay) || 1;
          const push = GameConfig.ENEMIES.PUSHBACK_FORCE;
          pushX = this.player.x + (ax/len)*push;
          pushY = this.player.y + (ay/len)*push;
        }

        // Apply push with collision detection
        if (maze.cellAt(pushX, this.player.y) === 0) this.player.x = pushX;
        if (maze.cellAt(this.player.x, pushY) === 0) this.player.y = pushY;
        this.onBoop(e.x, e.y);
      }
    }
  }

  /**
   * Calculates the shortest path distance through the maze using BFS with caching
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @param {Object} maze - Maze object with cellAt method
   * @returns {number} Path distance, or Infinity if no path exists
   * @private
   */
  calculatePathDistance(startX, startY, endX, endY, maze) {
    // Convert world coordinates to grid coordinates
    const startGridX = Math.floor(startX);
    const startGridY = Math.floor(startY);
    const endGridX = Math.floor(endX);
    const endGridY = Math.floor(endY);

    // Check cache first
    const cacheKey = `${startGridX},${startGridY}->${endGridX},${endGridY}`;
    if (this.pathDistanceCache.has(cacheKey)) {
      return this.pathDistanceCache.get(cacheKey);
    }

    // BFS to find shortest path
    const queue = [[startGridX, startGridY, 0]]; // [x, y, distance]
    const visited = new Set();
    visited.add(`${startGridX},${startGridY}`);

    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let result = Infinity;

    while (queue.length > 0) {
      const [x, y, dist] = queue.shift();

      // Reached the goal
      if (x === endGridX && y === endGridY) {
        result = dist;
        break;
      }

      // Explore neighbors
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;

        if (!visited.has(key) && maze.cellAt(nx + 0.5, ny + 0.5) === 0) {
          visited.add(key);
          queue.push([nx, ny, dist + 1]);
        }
      }
    }

    // Cache the result
    this.pathDistanceCache.set(cacheKey, result);

    // Limit cache size to prevent memory issues
    if (this.pathDistanceCache.size > 1000) {
      // Remove oldest entries (first keys)
      const keysToRemove = Array.from(this.pathDistanceCache.keys()).slice(0, 500);
      keysToRemove.forEach(k => this.pathDistanceCache.delete(k));
    }

    return result;
  }

  /**
   * Fast line-of-sight check between two points
   * @param {number} x1 - Start X coordinate
   * @param {number} y1 - Start Y coordinate
   * @param {number} x2 - End X coordinate
   * @param {number} y2 - End Y coordinate
   * @param {Object} maze - Maze object with cellAt method
   * @returns {boolean} True if there's a clear line of sight (no walls)
   * @private
   */
  hasLineOfSight(x1, y1, x2, y2, maze) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      if (maze.cellAt(x, y) !== 0) {
        return false; // Wall blocking
      }
    }
    return true;
  }

  /**
   * Checks if the player is closer to the exit than the enemy
   * Uses fast straight-line distance if line of sight is clear, otherwise uses pathfinding
   * @param {Object} enemy - Enemy object with x, y coordinates
   * @param {Object} player - Player object with x, y coordinates
   * @param {Object} exit - Exit object with x, y coordinates
   * @returns {boolean} True if player is between enemy and exit (closer to exit)
   */
  isPlayerBetweenEnemyAndExit(enemy, player, exit) {
    // Fast path: if both player and enemy have line of sight to exit, use straight-line distance
    const playerHasLOS = this.hasLineOfSight(player.x, player.y, exit.x, exit.y, this.maze);
    const enemyHasLOS = this.hasLineOfSight(enemy.x, enemy.y, exit.x, exit.y, this.maze);

    if (playerHasLOS && enemyHasLOS) {
      // Both have clear line of sight - use fast straight-line distance
      const playerDist = Math.hypot(player.x - exit.x, player.y - exit.y);
      const enemyDist = Math.hypot(enemy.x - exit.x, enemy.y - exit.y);
      return playerDist < enemyDist;
    }

    // Slow path: need to use actual pathfinding (cached for performance)
    const playerPathDist = this.calculatePathDistance(player.x, player.y, exit.x, exit.y, this.maze);
    const enemyPathDist = this.calculatePathDistance(enemy.x, enemy.y, exit.x, exit.y, this.maze);

    return playerPathDist < enemyPathDist;
  }

  /**
   * Casts a ray to find the first enemy hit (for instant hit weapons like taser)
   * @param {number} x - Starting X coordinate of the ray
   * @param {number} y - Starting Y coordinate of the ray
   * @param {number} a - Ray angle in radians
   * @param {number} maxDist - Maximum ray distance (default: 1.5)
   * @returns {Object|null} The first enemy hit by the ray, or null if none
   */
  raycastForEnemy(x, y, a, maxDist=1.5) {
    const step = GameConfig.PERFORMANCE.RAYCAST_STEP_SIZE * 2.5; // Slightly larger step for enemy detection
    let d = 0;
    while (d < maxDist) {
      const rx = x + Math.cos(a)*d;
      const ry = y + Math.sin(a)*d;
      const hit = this.findHit(rx, ry, 0.15);
      if (hit) return hit;
      d += step;
    }
    return null;
  }

  /**
   * Finds an enemy that collides with a circular area (for projectile hits)
   * @param {number} x - X coordinate of the collision area center
   * @param {number} y - Y coordinate of the collision area center
   * @param {number} r - Radius of the collision area (default: 0.12)
   * @returns {Object|null} The first enemy found in the collision area, or null if none
   */
  findHit(x, y, r=0.12) {
    for (const e of this.entities) {
      const dx = e.x - x, dy = e.y - y;
      if (dx*dx + dy*dy < r*r) return e;
    }
    return null;
  }
}
