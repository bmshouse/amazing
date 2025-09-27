// modules/SpriteRenderer.js - Handles billboard sprite rendering and particles
import { GameConfig } from './GameConfig.js';

export class SpriteRenderer {
  /**
   * Creates a new SpriteRenderer instance
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      fov: GameConfig.RENDERING.FOV,
      maxDepth: GameConfig.RENDERING.MAX_RENDER_DEPTH
    };
  }

  /**
   * Main sprite rendering method that draws all 2D elements
   * @param {Object} player - Player object with position and angle
   * @param {Object} maze - Maze object with exit and pads
   * @param {Object} enemies - Enemies object with entities array
   * @param {Array} particles - Array of particle objects
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} colors - Color configuration object
   */
  renderSprites(player, maze, enemies, particles, W, H, colors) {
    // Exit door billboard
    if (maze.exit) {
      this.drawExitDoor(maze.exit, player, W, H, colors.exitDoor);
    }

    // Recharge pads
    maze.pads.forEach(p => {
      this.drawFixedGroundObject(p.x + 0.5, p.y + 0.5, GameConfig.RENDERING.RECHARGE_PAD_SIZE, colors.rechargePad, player, W, H, maze);
    });

    // Enemies
    enemies.entities.forEach(e => {
      this.drawEnemy(e, player, W, H, maze, colors, colors.exitDoor);
    });

    // Particles
    this.renderParticles(particles, player, W, H);

    // Crosshair
    this.renderCrosshair(W, H);
  }

  /**
   * Gets the appropriate color for an enemy based on its state
   * @param {Object} enemy - Enemy object with state property
   * @param {Object} colors - Color configuration object
   * @returns {string} The color string for the enemy
   */
  getEnemyColor(enemy, colors) {
    switch (enemy.state) {
      case 'stunned': return colors.entityStunned;
      case 'tranq': return colors.entityTranq;
      case 'slowed': return colors.entitySlowed;
      default: return colors.entity;
    }
  }

  /**
   * Private base method for drawing billboard sprites that always face the player
   * @param {number} worldX - World X coordinate of the object
   * @param {number} worldY - World Y coordinate of the object
   * @param {number} objectSize - Size of the object in world units
   * @param {string} objectColor - Color of the object
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} options - Rendering options (checkOcclusion, exitDoorColor, maze, shape)
   * @private
   */
  _drawBillboard(worldX, worldY, objectSize, objectColor, player, W, H, options = {}) {
    const { checkOcclusion = true, exitDoorColor = null, maze = null, shape = 'ellipse' } = options;
    const deltaX = worldX - player.x;
    const deltaY = worldY - player.y;
    const distanceToObject = Math.hypot(deltaX, deltaY);
    const angleFromPlayerToObject = Math.atan2(deltaY, deltaX) - player.a;

    // Visibility culling
    if (Math.cos(angleFromPlayerToObject) <= 0) return;

    // Wall occlusion check (configurable)
    if (checkOcclusion && maze && objectColor !== exitDoorColor) {
      const wallHitBetweenPlayerAndObject = this.castRayForOcclusion(player.x, player.y, angleFromPlayerToObject + player.a, maze);
      if (wallHitBetweenPlayerAndObject && wallHitBetweenPlayerAndObject.dist < distanceToObject) {
        return;
      }
    }

    // Perspective projection
    const projectedSizeOnScreen = (H / distanceToObject) * objectSize;
    const screenPositionX = Math.tan(angleFromPlayerToObject) / Math.tan(this.config.fov/2) * (W/2) + (W/2);
    const screenPositionY = H/2;

    // Distance-based transparency
    const distanceBasedAlpha = Math.max(GameConfig.BALANCE.SPRITE_MIN_ALPHA, 1 - distanceToObject / this.config.maxDepth);

    // Render the shape based on type
    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this._drawShape(shape, screenPositionX, screenPositionY, projectedSizeOnScreen, objectColor, distanceBasedAlpha);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Private method to draw different shapes based on shape type
   * @param {string} shapeType - Type of shape to draw ('ellipse', 'rectangle', 'snowman')
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @param {string} color - Object color
   * @param {number} alpha - Current alpha transparency
   * @private
   */
  _drawShape(shapeType, x, y, size, color, alpha) {
    switch (shapeType) {
      case 'rectangle':
        this._drawRectangleShape(x, y, size);
        break;
      case 'snowman':
        this._drawSnowmanShape(x, y, size, color, alpha);
        break;
      case 'ellipse':
      default:
        this._drawEllipseShape(x, y, size);
        break;
    }
  }

  /**
   * Draws an ellipse shape (original billboard shape)
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @private
   */
  _drawEllipseShape(x, y, size) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size, size * GameConfig.RENDERING.BILLBOARD_HEIGHT_MULTIPLIER, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draws a rectangle shape for exit doors
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @private
   */
  _drawRectangleShape(x, y, size) {
    const width = size * 2;
    const height = size * GameConfig.RENDERING.BILLBOARD_HEIGHT_MULTIPLIER * 2;
    this.ctx.fillRect(x - width/2, y - height/2, width, height);
  }

  /**
   * Draws a snowman shape (3 stacked spheres) for enemies
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @param {string} color - Object color
   * @param {number} alpha - Current alpha transparency
   * @private
   */
  _drawSnowmanShape(x, y, size, color, alpha) {
    // Bottom sphere (largest)
    const bottomRadius = size;
    const bottomY = y + size * 0.6;

    // Middle sphere (medium)
    const middleRadius = size * 0.7;
    const middleY = y;

    // Top sphere (smallest - head)
    const topRadius = size * 0.5;
    const topY = y - size * 0.7;

    this.ctx.beginPath();
    // Bottom sphere
    this.ctx.ellipse(x, bottomY, bottomRadius, bottomRadius * 0.8, 0, 0, Math.PI * 2);
    // Middle sphere
    this.ctx.ellipse(x, middleY, middleRadius, middleRadius * 0.8, 0, 0, Math.PI * 2);
    // Top sphere
    this.ctx.ellipse(x, topY, topRadius, topRadius * 0.8, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draws the exit door billboard - always visible, no occlusion
   * @param {Object} exitData - Exit data with wallX and wallY coordinates
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {string} exitColor - Color for the exit door
   */
  drawExitDoor(exitData, player, W, H, exitColor) {
    const exitBillboardX = exitData.wallX + 0.5;
    const exitBillboardY = exitData.wallY + 0.5;

    return this._drawBillboard(
      exitBillboardX,
      exitBillboardY,
      GameConfig.RENDERING.EXIT_DOOR_SIZE,
      exitColor,
      player,
      W,
      H,
      {
        checkOcclusion: false,  // Exit door is always visible
        shape: 'rectangle'      // Exit door is rectangular
      }
    );
  }

  /**
   * Draws an enemy billboard with state-based coloring and wall occlusion
   * @param {Object} enemy - Enemy object with x, y coordinates and state
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} maze - Maze object for occlusion checking
   * @param {Object} colors - Color configuration object
   * @param {string} exitDoorColor - Exit door color to avoid occluding exit
   */
  drawEnemy(enemy, player, W, H, maze, colors, exitDoorColor) {
    const enemyColor = this.getEnemyColor(enemy, colors);

    return this._drawBillboard(
      enemy.x,
      enemy.y,
      GameConfig.RENDERING.ENEMY_SIZE,
      enemyColor,
      player,
      W,
      H,
      {
        checkOcclusion: true,
        maze: maze,
        exitDoorColor: exitDoorColor,
        shape: 'snowman'        // Enemies are snowman-shaped
      }
    );
  }

  /**
   * Draws a particle billboard - small, temporary, no occlusion
   * @param {Object} particle - Particle object with x, y coordinates and color
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  drawParticle(particle, player, W, H) {
    return this._drawBillboard(
      particle.x,
      particle.y,
      GameConfig.RENDERING.PARTICLE_SIZE,
      particle.color,
      player,
      W,
      H,
      {
        checkOcclusion: false,  // Particles are always visible
        shape: 'ellipse'        // Particles remain elliptical
      }
    );
  }

  /**
   * Draws a fixed ground object (like recharge pads) anchored to ground level
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} objectRadius - Radius of the ground object
   * @param {string} objectColor - Color of the object
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} maze - Maze object for occlusion checking
   */
  drawFixedGroundObject(worldX, worldY, objectRadius, objectColor, player, W, H, maze) {
    const deltaX = worldX - player.x;
    const deltaY = worldY - player.y;
    const distanceToObject = Math.hypot(deltaX, deltaY);
    const angleFromPlayerToObject = Math.atan2(deltaY, deltaX) - player.a;

    // Visibility culling - only render objects in front of player
    if (Math.cos(angleFromPlayerToObject) <= 0) return;

    // Wall occlusion check
    const wallHitBetweenPlayerAndObject = this.castRayForOcclusion(player.x, player.y, angleFromPlayerToObject + player.a, maze);
    if (wallHitBetweenPlayerAndObject && wallHitBetweenPlayerAndObject.dist < distanceToObject) {
      return;
    }

    // Fixed ground object positioning - anchored to world coordinates
    const halfFOV = this.config.fov / 2;

    // When very close (less than 1 unit), hide the object to prevent positioning issues
    if (distanceToObject < GameConfig.RENDERING.GROUND_VISIBILITY_DISTANCE) {
      return;
    }

    // Use a more stable angle calculation that doesn't break down at close range
    const normalizedAngle = angleFromPlayerToObject;

    // Only render if within reasonable FOV range
    if (Math.abs(normalizedAngle) > halfFOV * GameConfig.RENDERING.GROUND_FOV_EXTENSION) {
      return;
    }

    const screenPositionX = (normalizedAngle / halfFOV) * (W * GameConfig.RENDERING.GROUND_PROJECTION_WIDTH_RATIO) + (W/2);
    const screenPositionY = H * GameConfig.RENDERING.GROUND_LEVEL_Y; // Fixed ground level

    // Size with reasonable maximum for ground objects
    const baseSizeProjection = (H / distanceToObject) * objectRadius;
    const maxGroundSize = H * GameConfig.RENDERING.GROUND_OBJECT_MAX_SIZE_RATIO; // Smaller max for better ground appearance
    const projectedSizeOnScreen = Math.min(baseSizeProjection, maxGroundSize);

    // Distance-based transparency
    const distanceBasedAlpha = Math.max(GameConfig.BALANCE.GROUND_CIRCLE_MIN_ALPHA, 1 - distanceToObject / this.config.maxDepth);

    this.ctx.save();
    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * GameConfig.RENDERING.GROUND_OBJECT_HEIGHT_RATIO, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner glow for ground objects
    this.ctx.globalAlpha = distanceBasedAlpha * GameConfig.RENDERING.GROUND_GLOW_OPACITY;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen * GameConfig.RENDERING.GROUND_GLOW_SIZE_RATIO, projectedSizeOnScreen * GameConfig.RENDERING.GROUND_GLOW_HEIGHT_RATIO, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Draws a mobile ground circle sprite (alternative ground object rendering)
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} circleRadius - Radius of the circle
   * @param {string} circleColor - Color of the circle
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} maze - Maze object for occlusion checking
   */
  drawGroundCircle(worldX, worldY, circleRadius, circleColor, player, W, H, maze) {
    // Simplified mobile sprite version
    const deltaX = worldX - player.x;
    const deltaY = worldY - player.y;
    const distanceToObject = Math.hypot(deltaX, deltaY);
    const angleFromPlayerToObject = Math.atan2(deltaY, deltaX) - player.a;

    // Visibility culling
    if (Math.cos(angleFromPlayerToObject) <= 0) return;

    // Wall occlusion check
    const wallHitBetweenPlayerAndObject = this.castRayForOcclusion(player.x, player.y, angleFromPlayerToObject + player.a, maze);
    if (wallHitBetweenPlayerAndObject && wallHitBetweenPlayerAndObject.dist < distanceToObject) {
      return;
    }

    // Mobile sprite positioning
    const projectedSizeOnScreen = (H / distanceToObject) * circleRadius;
    const halfFOV = this.config.fov / 2;
    const screenPositionX = Math.tan(angleFromPlayerToObject) / Math.tan(halfFOV) * (W/2) + (W/2);
    const screenPositionY = H * GameConfig.RENDERING.MOBILE_GROUND_Y_RATIO + (distanceToObject * GameConfig.RENDERING.MOBILE_GROUND_DISTANCE_MULTIPLIER); // Mobile position

    // Distance-based transparency
    const distanceBasedAlpha = Math.max(0.4, 1 - distanceToObject / this.config.maxDepth);

    this.ctx.save();
    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = circleColor;
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 0.3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Renders all active particles and removes expired ones
   * @param {Array} particles - Array of particle objects
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderParticles(particles, player, W, H) {
    const now = performance.now();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      if (age > p.life) {
        particles.splice(i, 1);
        continue;
      }
      this.drawParticle(p, player, W, H);
    }
  }

  /**
   * Renders the crosshair at the center of the screen
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderCrosshair(W, H) {
    this.ctx.globalAlpha = GameConfig.RENDERING.CROSSHAIR_OPACITY;
    this.ctx.fillStyle = '#e2e2e2';
    this.ctx.fillRect(W/2-GameConfig.RENDERING.CROSSHAIR_OFFSET, H/2, GameConfig.RENDERING.CROSSHAIR_SIZE, GameConfig.RENDERING.CROSSHAIR_THICKNESS);
    this.ctx.fillRect(W/2, H/2-GameConfig.RENDERING.CROSSHAIR_OFFSET, GameConfig.RENDERING.CROSSHAIR_THICKNESS, GameConfig.RENDERING.CROSSHAIR_SIZE);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Casts a ray to check for wall occlusion between player and object
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} rayAngle - Ray direction in radians
   * @param {Object} maze - Maze object with cellAt method
   * @returns {Object|null} Wall hit information or null if no occlusion
   */
  castRayForOcclusion(startX, startY, rayAngle, maze) {
    const rayDirectionY = Math.sin(rayAngle);
    const rayDirectionX = Math.cos(rayAngle);
    let currentDistanceFromStart = 0;
    const rayMarchingStepSize = GameConfig.RENDERING.RAY_MARCHING_STEP_SIZE;
    const maxStepsToTake = this.config.maxDepth / rayMarchingStepSize;

    for (let stepCount = 0; stepCount < maxStepsToTake; stepCount++) {
      const currentRayX = startX + rayDirectionX * currentDistanceFromStart;
      const currentRayY = startY + rayDirectionY * currentDistanceFromStart;
      const mazeCell = maze.cellAt(currentRayX, currentRayY);

      if (mazeCell === 1 || mazeCell === 2) {
        return {
          dist: currentDistanceFromStart,
          nx: currentRayX,
          ny: currentRayY,
          cellType: mazeCell
        };
      }

      currentDistanceFromStart += rayMarchingStepSize;
    }

    return null;
  }
}