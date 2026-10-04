// modules/SpriteRenderer.js - Handles billboard sprite rendering and particles
import { GameConfig } from './GameConfig.js';

// Distance from a snowman sprite's centre to the bottom of its base sphere, in size units
// (the base sphere is centred 0.6 below and is 0.8 tall)
const SNOWMAN_BASE_EXTENT = 1.4;

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
      this.drawExitDoor(maze.exit, player, W, H, colors.exitDoor, maze);
    }

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
      default: return '#ffffff'; // White to match 3D snowmen
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
    // Objects that declare how far their base hangs below their centre (in size units) are stood on the floor,
    // which sits EYE_HEIGHT below the horizon at this distance. Others stay centred on the horizon.
    const screenPositionY = options.baseExtent === undefined
      ? H/2
      : H/2 + (GameConfig.RENDERING.EYE_HEIGHT - options.baseExtent * objectSize) * (H / distanceToObject);

    // Distance-based transparency
    const distanceBasedAlpha = Math.max(GameConfig.BALANCE.SPRITE_MIN_ALPHA, 1 - distanceToObject / this.config.maxDepth);

    // Render the shape based on type
    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this._drawShape(shape, screenPositionX, screenPositionY, projectedSizeOnScreen, objectColor, distanceBasedAlpha, options);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Private method to draw different shapes based on shape type
   * @param {string} shapeType - Type of shape to draw ('ellipse', 'rectangle', 'snowman', 'heart')
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @param {string} color - Object color
   * @param {number} alpha - Current alpha transparency
   * @param {Object} [options] - Billboard options; snowmen read facing and state from here
   * @private
   */
  _drawShape(shapeType, x, y, size, color, alpha, options = {}) {
    switch (shapeType) {
      case 'rectangle':
        this._drawRectangleShape(x, y, size);
        break;
      case 'snowman':
        this._drawSnowmanShape(x, y, size, color, alpha, options);
        break;
      case 'heart':
        this._drawHeartShape(x, y, size);
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
   * Fills a single ellipse in its own path
   * @private
   */
  _fillEllipse(cx, cy, rx, ry) {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draws a snowman (3 stacked spheres) with a scarf and a face that turns with its heading.
   * The face is placed on the head by longitude: facing the viewer shows both eyes and an
   * end-on carrot, turned sideways shows one eye and a nose pointing left or right, and facing
   * away shows a plain head with the scarf tail.
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} size - Projected size on screen
   * @param {string} color - Object color
   * @param {number} alpha - Current alpha transparency
   * @param {Object} [options] - { facing: {side, front}, state }
   * @private
   */
  _drawSnowmanShape(x, y, size, color, alpha, options = {}) {
    // Bottom sphere (largest)
    const bottomRadius = size;
    const bottomY = y + size * 0.6;

    // Middle sphere (medium)
    const middleRadius = size * 0.7;
    const middleY = y;

    // Top sphere (smallest - head)
    const topRadius = size * 0.5;
    const topY = y - size * 0.7;

    const spheres = [[bottomY, bottomRadius], [middleY, middleRadius], [topY, topRadius]];
    if (size < 4) {
      // Too small for shading: one flat path (moveTo starts each ellipse cleanly, so no hairline is filled)
      this.ctx.beginPath();
      for (const [cy, radius] of spheres) {
        this.ctx.moveTo(x + radius, cy);
        this.ctx.ellipse(x, cy, radius, radius * 0.8, 0, 0, Math.PI * 2);
      }
      this.ctx.fill();
      return;
    }

    // Bottom to top, so each upper sphere sits in front of the one below. Each sphere is a base
    // fill, a translucent shade over all of it, and a smaller lit patch toward the upper left,
    // which leaves a shaded crescent along the lower right. The head's crescent falls onto the
    // torso and the torso's onto the base, which is what makes the three read as one stack.
    for (const [cy, radius] of spheres) {
      const ry = radius * 0.8;
      this.ctx.fillStyle = color;
      this._fillEllipse(x, cy, radius, ry);
      this.ctx.fillStyle = GameConfig.COLORS.SNOWMAN_SHADE;
      this._fillEllipse(x, cy, radius, ry);
      this.ctx.fillStyle = color;
      this._fillEllipse(x - radius * 0.07, cy - ry * 0.12, radius * 0.86, ry * 0.86);
    }

    // Details are sub-pixel mush when the snowman is far away
    if (size < 4) return;

    const { side = 0, front = 1 } = options.facing || {};
    const yaw = Math.atan2(side, front); // 0 = facing the viewer, +/- PI/2 = sideways, PI = away
    const headRx = topRadius, headRy = topRadius * 0.8;
    const { COLORS } = GameConfig;

    // Scarf: a band at the neck, with a tail that trails behind the direction it faces
    const neckY = topY + headRy * 0.9;
    this.ctx.fillStyle = COLORS.SNOWMAN_SCARF;
    this.ctx.beginPath();
    this.ctx.ellipse(x, neckY, size * 0.58, size * 0.12, 0, 0, Math.PI * 2);
    this.ctx.fill();
    const tailSide = side > 0.25 ? -1 : 1;
    this.ctx.fillRect(x + tailSide * size * 0.4 - size * 0.08, neckY, size * 0.16, size * 0.42);

    // Eyes sit either side of the face centre (longitude yaw +/- 0.5 rad) and are visible on the front hemisphere
    const eyeY = topY - headRy * 0.2;
    this.ctx.fillStyle = COLORS.SNOWMAN_COAL;
    this.ctx.strokeStyle = COLORS.SNOWMAN_COAL;
    this.ctx.lineWidth = Math.max(1, size * 0.04);
    for (const eyeLon of [yaw - 0.5, yaw + 0.5]) {
      const facingEye = Math.cos(eyeLon);
      if (facingEye <= 0.05) continue;
      const eyeX = x + headRx * 0.95 * Math.sin(eyeLon);
      const eyeRx = size * 0.075 * (0.4 + 0.6 * facingEye);
      const eyeRy = size * 0.075;
      if (options.state === 'stunned') {
        // Dazed X eyes
        this.ctx.beginPath();
        this.ctx.moveTo(eyeX - eyeRx, eyeY - eyeRy);
        this.ctx.lineTo(eyeX + eyeRx, eyeY + eyeRy);
        this.ctx.moveTo(eyeX + eyeRx, eyeY - eyeRy);
        this.ctx.lineTo(eyeX - eyeRx, eyeY + eyeRy);
        this.ctx.stroke();
      } else if (options.state === 'tranq') {
        // Sleeping: closed eyes as flat lines
        this.ctx.fillRect(eyeX - eyeRx, eyeY, eyeRx * 2, Math.max(1, size * 0.03));
      } else {
        this.ctx.beginPath();
        this.ctx.ellipse(eyeX, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Carrot nose: end-on circle when facing the viewer, a pointing triangle when turned,
    // and just a tip peeking past the head edge as it turns away
    if (Math.cos(yaw) > -0.3) {
      const noseX = x + headRx * 0.97 * Math.sin(yaw);
      const noseY = topY + headRy * 0.15;
      const halfBase = size * 0.07;
      const length = size * 0.36 * Math.abs(Math.sin(yaw));
      this.ctx.fillStyle = COLORS.SNOWMAN_CARROT;
      if (Math.cos(yaw) > 0) {
        this.ctx.beginPath();
        this.ctx.ellipse(noseX, noseY, halfBase * (0.6 + 0.4 * Math.cos(yaw)), halfBase, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      if (length > 1) {
        const dir = Math.sign(Math.sin(yaw));
        this.ctx.beginPath();
        this.ctx.moveTo(noseX, noseY - halfBase);
        this.ctx.lineTo(noseX + dir * length, noseY + halfBase * 0.3);
        this.ctx.lineTo(noseX, noseY + halfBase);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    this.ctx.fillStyle = color;
  }

  /**
   * Draws a heart shape for particles using Bézier curves
   * (Based on classic 4-curve heart technique)
   * @param {number} x - Screen X position (center)
   * @param {number} y - Screen Y position (center)
   * @param {number} size - Projected size on screen
   * @private
   */
  _drawHeartShape(x, y, size) {
    // Heart shape using 4 Bézier curves for smooth, flowing sides
    const scale = size * 2; // Make hearts a bit bigger

    // Create a single continuous path for the heart
    this.ctx.beginPath();

    // Start at top center
    this.ctx.moveTo(x, y);

    // Top-left curve (curves outward to form left lobe)
    this.ctx.bezierCurveTo(
      x, y - scale * 0.3,           // Control point 1: up from center
      x - scale * 0.5, y - scale * 0.3,  // Control point 2: left and up
      x - scale * 0.5, y            // End point: left at center height
    );

    // Bottom-left curve (curves from left lobe down to bottom point)
    this.ctx.bezierCurveTo(
      x - scale * 0.5, y + scale * 0.3,  // Control point 1: left and down
      x, y + scale * 0.35,          // Control point 2: center and down
      x, y + scale * 0.6            // End point: bottom point of heart
    );

    // Bottom-right curve (curves from bottom point up to right lobe)
    this.ctx.bezierCurveTo(
      x, y + scale * 0.35,          // Control point 1: center and down
      x + scale * 0.5, y + scale * 0.3,  // Control point 2: right and down
      x + scale * 0.5, y            // End point: right at center height
    );

    // Top-right curve (curves from right lobe back to top center)
    this.ctx.bezierCurveTo(
      x + scale * 0.5, y - scale * 0.3,  // Control point 1: right and up
      x, y - scale * 0.3,           // Control point 2: up from center
      x, y                          // End point: back to top center
    );

    this.ctx.closePath();

    // Fill the heart
    this.ctx.fill();

    // Optional thin outline for definition
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /**
   * Draws the through-wall exit marker. The door itself glows in the raycast pass, so this
   * marker only appears while the door is hidden behind other walls (a navigation hint).
   * It sits on the door's face (halfway between the exit's walkway cell and the door cell) and
   * matches its size, so it lines up with the door when the two hand over.
   * @param {Object} exitData - Exit data with x, y (walkway cell) and wallX, wallY (door cell)
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @param {string} exitColor - Color for the exit door
   * @param {Object} [maze] - Maze used to test whether the door is in view; the marker always draws without it
   */
  drawExitDoor(exitData, player, W, H, exitColor, maze = null) {
    const walkX = exitData.x ?? exitData.wallX;
    const walkY = exitData.y ?? exitData.wallY;
    const exitBillboardX = (walkX + exitData.wallX) / 2 + 0.5;
    const exitBillboardY = (walkY + exitData.wallY) / 2 + 0.5;

    if (maze) {
      const toDoor = Math.atan2(exitBillboardY - player.y, exitBillboardX - player.x);
      const firstWall = this.castRayForOcclusion(player.x, player.y, toDoor, maze);
      const doorDistance = Math.hypot(exitBillboardX - player.x, exitBillboardY - player.y);
      // The ray reaches the door cell (or nothing blocks it): the glowing door is on screen already
      if (!firstWall || firstWall.cellType === 2 || firstWall.dist >= doorDistance - 0.05) return;
    }

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
   * Which way a snowman faces as seen from the player.
   * `front` is 1 when it looks straight at the player and -1 when it faces away;
   * `side` is 1 when it looks toward the right of the screen and -1 toward the left.
   * Snowmen without a heading look at the player.
   * @param {Object} enemy - Enemy with x, y and optional heading (radians)
   * @param {Object} player - Player with x, y
   * @returns {{side: number, front: number}}
   */
  getSnowmanFacing(enemy, player) {
    const viewAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x); // player -> enemy
    const heading = enemy.heading ?? viewAngle + Math.PI;
    return { side: Math.sin(heading - viewAngle), front: -Math.cos(heading - viewAngle) };
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
        shape: 'snowman',       // Enemies are snowman-shaped
        baseExtent: SNOWMAN_BASE_EXTENT,
        facing: this.getSnowmanFacing(enemy, player),
        state: enemy.state
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
    // Use heart shape for boop and huggle particles, ellipse for others
    const isBoopParticle = particle.color === GameConfig.COLORS.PARTICLE_BOOP;
    const isHuggleParticle = particle.color === GameConfig.COLORS.PARTICLE_HUGGLE;
    const shape = (isBoopParticle || isHuggleParticle) ? 'heart' : 'ellipse';

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
        shape: shape            // Hearts for boop/huggle particles, ellipses for others
      }
    );
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

  /**
   * Renders a range indicator line showing the effective range of the current device
   * @param {Object} player - Player object with position and angle
   * @param {Object} rangeData - Range indicator data with x1, y1, x2, y2, color, alpha
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderRangeIndicator(player, rangeData, W, H) {
    const { x1, y1, x2, y2, color, alpha } = rangeData;

    // Transform world coordinates to screen coordinates
    const startScreenPos = this.worldToScreen(x1, y1, player, W, H);
    const endScreenPos = this.worldToScreen(x2, y2, player, W, H);

    if (!startScreenPos || !endScreenPos) return;

    // Draw the range indicator line - small and subtle
    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.7; // More transparent
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1; // Thinner line
    this.ctx.setLineDash([3, 3]); // Smaller dashes

    this.ctx.beginPath();
    this.ctx.moveTo(startScreenPos.screenX, startScreenPos.screenY);
    this.ctx.lineTo(endScreenPos.screenX, endScreenPos.screenY);
    this.ctx.stroke();

    // Add a small dot at the end to show range endpoint
    this.ctx.setLineDash([]); // Solid for dot
    this.ctx.globalAlpha = alpha * 0.8;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(endScreenPos.screenX, endScreenPos.screenY, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {Object} player - Player object with position and angle
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   * @returns {Object|null} Screen coordinates or null if behind player
   */
  worldToScreen(worldX, worldY, player, W, H) {
    // Transform to camera space
    const dx = worldX - player.x;
    const dy = worldY - player.y;

    const cosA = Math.cos(player.a);
    const sinA = Math.sin(player.a);

    // Rotate to camera space
    const cameraX = dx * cosA + dy * sinA;
    const cameraZ = -dx * sinA + dy * cosA;

    // Check if behind player
    if (cameraZ <= 0.1) return null;

    // Project to screen space
    const projectionScale = (W * 0.5) / Math.tan(this.config.fov * 0.5);
    const screenX = W * 0.5 + (cameraX * projectionScale) / cameraZ;
    const screenY = H * 0.5; // Keep at center height for simplicity

    return { screenX, screenY };
  }
}