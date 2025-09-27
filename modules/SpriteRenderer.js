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
      const exitBillboardX = maze.exit.wallX + 0.5;
      const exitBillboardY = maze.exit.wallY + 0.5;
      this.drawBillboard(exitBillboardX, exitBillboardY, GameConfig.RENDERING.EXIT_DOOR_SIZE, colors.exitDoor, player, W, H);
    }

    // Recharge pads
    maze.pads.forEach(p => {
      this.drawFixedGroundObject(p.x + 0.5, p.y + 0.5, GameConfig.RENDERING.RECHARGE_PAD_SIZE, colors.rechargePad, player, W, H, maze);
    });

    // Enemies
    enemies.entities.forEach(e => {
      const col = this.getEnemyColor(e, colors);
      this.drawBillboard(e.x, e.y, GameConfig.RENDERING.ENEMY_SIZE, col, player, W, H, maze, colors.exitDoor);
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
   * Draws a billboard sprite that always faces the player
   * @param {number} worldX - World X coordinate of the object
   * @param {number} worldY - World Y coordinate of the object
   * @param {number} objectSize - Size of the object in world units
   * @param {string} objectColor - Color of the object
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {Object} maze - Optional maze for occlusion checking
   * @param {string} exitDoorColor - Optional exit door color to skip occlusion
   */
  drawBillboard(worldX, worldY, objectSize, objectColor, player, W, H, maze = null, exitDoorColor = null) {
    const deltaX = worldX - player.x;
    const deltaY = worldY - player.y;
    const distanceToObject = Math.hypot(deltaX, deltaY);
    const angleFromPlayerToObject = Math.atan2(deltaY, deltaX) - player.a;

    // Visibility culling
    if (Math.cos(angleFromPlayerToObject) <= 0) return;

    // Wall occlusion check (skip for exit door)
    if (maze && objectColor !== exitDoorColor) {
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

    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * GameConfig.RENDERING.BILLBOARD_HEIGHT_MULTIPLIER, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
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
      this.drawBillboard(p.x, p.y, GameConfig.RENDERING.PARTICLE_SIZE, p.color, player, W, H, null, null);
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