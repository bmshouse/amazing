// modules/enemies.js - friendly AI that pushes player back
import { GameConfig } from './GameConfig.js';

const DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export class EnemyController {
  constructor(maze, player) {
    this.maze = maze;
    this.player = player;
    this.entities = [];
    this.onBoop = (_x,_y,_isPull)=>{};
    // Cache for pathfinding distances to avoid expensive recalculations
    this.pathDistanceCache = new Map();
    // BFS distance (in cells) from the player's cell, shared by every chasing enemy
    this.flowField = null;
    this.reset(maze);
  }

  reset(maze) {
    this.maze = maze;
    this.entities = [];
    // Clear pathfinding cache when maze resets
    this.pathDistanceCache.clear();
    this.flowField = null;
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
        speedMul: 1,
        heading: Math.random() * Math.PI * 2 // direction the snowman faces, in radians (0 = +x)
      });
    }
  }

  update(dt, maze) {
    this.maze = maze;
    const t = performance.now();
    const flow = this.updateFlowField(maze);
    for (const e of this.entities) {
      // state recovery using config values
      if (e.state==='stunned' && t - e.stateTime > GameConfig.ENEMIES.STUNNED_DURATION) { e.state='idle'; e.speedMul=1; }
      if (e.state==='slowed' && t - e.stateTime > GameConfig.ENEMIES.SLOWED_DURATION) { e.state='idle'; e.speedMul=1; }
      if (e.state==='tranq'  && t - e.stateTime > GameConfig.ENEMIES.TRANQ_DURATION) { e.state='idle'; e.speedMul=1; }

      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      const v = e.speed * e.speedMul * (dt/1000);

      // Chase along the maze path when the player is close by path; otherwise stroll the corridors
      const pathCells = this.flowDistanceAt(flow, e.x, e.y);
      e.chasing = e.state !== 'tranq' && pathCells >= 0 && pathCells <= GameConfig.ENEMIES.CHASE_PATH_DISTANCE;
      const fromX = e.x, fromY = e.y;
      if (e.chasing) {
        e.wanderTarget = null;
        this.moveToward(e, this.nextChaseWaypoint(e, flow, pathCells), v, maze);
      } else {
        this.wander(e, v * GameConfig.ENEMIES.WANDER_SPEED_FACTOR, maze);
      }
      this.faceMovement(e, fromX, fromY, dt);

      // Pushback if close. Stunned and sleeping critters are harmless, so the player can walk
      // through them; otherwise one in a one-cell corridor would block the way until it wakes.
      const incapacitated = e.state === 'stunned' || e.state === 'tranq';
      if (dist < GameConfig.ENEMIES.COLLISION_DISTANCE && !incapacitated) {
        // Determine push direction based on player position relative to exit
        let pushX, pushY;
        let isPull = false;

        if (this.maze.exit && this.isPlayerBetweenEnemyAndExit(e, this.player, this.maze.exit)) {
          // Player is closer to exit - PULL player toward enemy (away from exit)
          isPull = true;
          const ax = e.x - this.player.x;  // Vector from player to enemy (reversed)
          const ay = e.y - this.player.y;
          const len = Math.hypot(ax, ay) || 1;
          const push = GameConfig.ENEMIES.PUSHBACK_FORCE;
          pushX = this.player.x + (ax/len)*push;
          pushY = this.player.y + (ay/len)*push;
        } else {
          // Player is NOT closer to exit - PUSH behavior
          // Determine push direction based on smart push setting and player position
          let ax, ay;

          if (GameConfig.ENEMIES.SMART_PUSH_ENABLED && !this.isPlayerNearStart(this.player)) {
            // Smart mode enabled and player is deep in maze: push TOWARD start position
            ax = GameConfig.PLAYER.START_X - this.player.x;
            ay = GameConfig.PLAYER.START_Y - this.player.y;
          } else {
            // Classic mode OR near start: push directly away from snowman (radial)
            ax = this.player.x - e.x;
            ay = this.player.y - e.y;
          }

          const len = Math.hypot(ax, ay) || 1;
          const push = GameConfig.ENEMIES.PUSHBACK_FORCE;
          pushX = this.player.x + (ax/len)*push;
          pushY = this.player.y + (ay/len)*push;
        }

        // Apply push with collision detection, trying progressively smaller pushes if blocked
        let applied = false;
        for (let scale = 1.0; scale > 0.1; scale -= 0.2) {
          const testX = this.player.x + (pushX - this.player.x) * scale;
          const testY = this.player.y + (pushY - this.player.y) * scale;

          if (maze.cellAt(testX, this.player.y) === 0) {
            this.player.x = testX;
            applied = true;
          }
          if (maze.cellAt(this.player.x, testY) === 0) {
            this.player.y = testY;
            applied = true;
          }

          if (applied) break; // Found a valid push distance
        }

        this.onBoop(e.x, e.y, isPull);
      }
    }
  }

  /**
   * Returns the BFS distance field from the player's cell, rebuilding it only when the
   * player changes cell (or the maze changes). Unreachable and wall cells are -1.
   * @param {Object} maze - Maze object with w, h and cellAt
   * @returns {{maze: Object, cx: number, cy: number, w: number, dist: Int16Array}}
   * @private
   */
  updateFlowField(maze) {
    const cx = Math.floor(this.player.x);
    const cy = Math.floor(this.player.y);
    const f = this.flowField;
    if (f && f.maze === maze && f.cx === cx && f.cy === cy) return f;

    const { w, h } = maze;
    const dist = new Int16Array(w * h).fill(-1);
    if (maze.cellAt(cx, cy) === 0) {
      const queue = [cy * w + cx];
      dist[queue[0]] = 0;
      for (let head = 0; head < queue.length; head++) {
        const idx = queue[head];
        const x = idx % w, y = (idx / w) | 0;
        for (const [dx, dy] of DIRECTIONS) {
          const nx = x + dx, ny = y + dy;
          if (maze.cellAt(nx, ny) !== 0 || dist[ny * w + nx] !== -1) continue;
          dist[ny * w + nx] = dist[idx] + 1;
          queue.push(ny * w + nx);
        }
      }
    }
    this.flowField = { maze, cx, cy, w, dist };
    return this.flowField;
  }

  /**
   * Path distance (in cells) from a world position to the player, or -1 if unreachable
   * @private
   */
  flowDistanceAt(flow, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= flow.w || cy * flow.w + cx >= flow.dist.length) return -1;
    return flow.dist[cy * flow.w + cx];
  }

  /**
   * World point a chasing enemy should head for: the centre of the neighbouring cell
   * closest to the player, or the player themselves once in the same cell.
   * Cells are orthogonally adjacent, so the straight segment never clips a wall corner.
   * @private
   */
  nextChaseWaypoint(e, flow, pathCells) {
    if (pathCells === 0) return this.player;
    const cx = Math.floor(e.x), cy = Math.floor(e.y);
    let best = null, bestDist = pathCells;
    for (const [dx, dy] of DIRECTIONS) {
      const d = this.flowDistanceAt(flow, cx + dx + 0.5, cy + dy + 0.5);
      if (d >= 0 && d < bestDist) { best = { x: cx + dx + 0.5, y: cy + dy + 0.5 }; bestDist = d; }
    }
    return best || e;
  }

  /**
   * Strolls between neighbouring cells, avoiding an immediate U-turn except in dead ends
   * @private
   */
  wander(e, v, maze) {
    const cx = Math.floor(e.x), cy = Math.floor(e.y);
    const t = e.wanderTarget;
    if (!t || Math.hypot(t.x - e.x, t.y - e.y) < 0.01) {
      const open = DIRECTIONS
        .map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }))
        .filter(c => maze.cellAt(c.x, c.y) === 0);
      const forward = open.filter(c => !e.prevCell || c.x !== e.prevCell.x || c.y !== e.prevCell.y);
      const choices = forward.length ? forward : open;
      if (!choices.length) { e.wanderTarget = null; return; }
      const pick = choices[(Math.random() * choices.length) | 0];
      e.prevCell = { x: cx, y: cy };
      e.wanderTarget = { x: pick.x + 0.5, y: pick.y + 0.5 };
    }
    this.moveToward(e, e.wanderTarget, v, maze);
  }

  /**
   * Turns the enemy toward the way it just moved, limited to ENEMIES.TURN_RATE so it swings
   * round corners instead of snapping. Enemies that did not move keep their heading.
   * @private
   */
  faceMovement(e, fromX, fromY, dt) {
    const dx = e.x - fromX, dy = e.y - fromY;
    if (dx * dx + dy * dy < 1e-8) return;

    const desired = Math.atan2(dy, dx);
    if (e.heading === undefined) { e.heading = desired; return; }

    const shortestTurn = Math.atan2(Math.sin(desired - e.heading), Math.cos(desired - e.heading));
    const maxTurn = GameConfig.ENEMIES.TURN_RATE * dt / 1000;
    e.heading += Math.max(-maxTurn, Math.min(maxTurn, shortestTurn));
  }

  /**
   * Moves an enemy up to v units toward a point without overshooting, respecting walls per axis
   * @private
   */
  moveToward(e, target, v, maze) {
    const dx = target.x - e.x, dy = target.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return;
    const s = Math.min(v, d) / d;
    const nx = e.x + dx * s, ny = e.y + dy * s;
    if (maze.cellAt(nx, e.y) === 0) e.x = nx;
    if (maze.cellAt(e.x, ny) === 0) e.y = ny;
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
   * Checks if player is near the starting position using pathfinding
   * Only used when SMART_PUSH_ENABLED is true
   * @param {Object} player - Player with x, y coordinates
   * @returns {boolean} True if player is within threshold path distance of start
   */
  isPlayerNearStart(player) {
    const pathDistFromStart = this.calculatePathDistance(
      player.x, player.y,
      GameConfig.PLAYER.START_X, GameConfig.PLAYER.START_Y,
      this.maze
    );
    return pathDistFromStart < GameConfig.ENEMIES.SMART_PUSH_THRESHOLD;
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
    // Exit coordinates from maze are grid integers, but test data may already include .5 offset
    // Check if coordinates are already fractional (world coords) or integers (grid coords)
    const isFractional = exit.x % 1 !== 0 || exit.y % 1 !== 0;
    const exitWorldX = isFractional ? exit.x : exit.x + 0.5;
    const exitWorldY = isFractional ? exit.y : exit.y + 0.5;

    // Fast path: if both player and enemy have line of sight to exit, use straight-line distance
    const playerHasLOS = this.hasLineOfSight(player.x, player.y, exitWorldX, exitWorldY, this.maze);
    const enemyHasLOS = this.hasLineOfSight(enemy.x, enemy.y, exitWorldX, exitWorldY, this.maze);

    if (playerHasLOS && enemyHasLOS) {
      // Both have clear line of sight - use fast straight-line distance
      const playerDist = Math.hypot(player.x - exitWorldX, player.y - exitWorldY);
      const enemyDist = Math.hypot(enemy.x - exitWorldX, enemy.y - exitWorldY);
      return playerDist < enemyDist;
    }

    // Slow path: need to use actual pathfinding (cached for performance)
    const playerPathDist = this.calculatePathDistance(player.x, player.y, exitWorldX, exitWorldY, this.maze);
    const enemyPathDist = this.calculatePathDistance(enemy.x, enemy.y, exitWorldX, exitWorldY, this.maze);

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
