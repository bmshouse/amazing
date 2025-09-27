// modules/RaycastRenderer.js - Handles raycasting and wall rendering
import { GameConfig } from './GameConfig.js';

export class RaycastRenderer {
  /**
   * Creates a new RaycastRenderer instance
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} textures - Object containing wall, brick, and door textures
   */
  constructor(canvas, textures) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.textures = textures;
    this.config = {
      fov: GameConfig.RENDERING.FOV,
      maxDepth: GameConfig.RENDERING.MAX_RENDER_DEPTH,
      columnStep: GameConfig.RENDERING.COLUMN_STEP
    };
  }

  /**
   * Main render method that draws the 3D scene
   * @param {Object} player - Player object with x, y, and angle properties
   * @param {Object} maze - Maze object with cellAt method
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  render(player, maze, W, H) {
    // Clear and draw background gradients
    this.renderBackground(W, H);

    // Render walls using raycasting
    this.renderWalls(player, maze, W, H);
  }

  /**
   * Renders the background sky and floor gradients
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderBackground(W, H) {
    // Clear the entire canvas with dark background color
    this.ctx.fillStyle = '#0b0e1d';
    this.ctx.fillRect(0, 0, W, H);

    // Draw sky gradient in upper half of screen (ceiling area)
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, H/2);
    skyGradient.addColorStop(0, '#1c2050');
    skyGradient.addColorStop(1, '#2a2f4a');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, W, H/2);

    // Draw floor gradient in lower half of screen
    const floorGradient = this.ctx.createLinearGradient(0, H/2, 0, H);
    floorGradient.addColorStop(0, '#111728');
    floorGradient.addColorStop(1, '#0b0e1d');
    this.ctx.fillStyle = floorGradient;
    this.ctx.fillRect(0, H/2, W, H/2);
  }

  /**
   * Renders walls using raycasting algorithm
   * @param {Object} player - Player object with x, y, and angle properties
   * @param {Object} maze - Maze object with cellAt method
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderWalls(player, maze, W, H) {
    const rayAngleStepPerPixel = this.config.fov / W;
    let currentRayAngle = player.a - this.config.fov/2;

    for (let screenX = 0; screenX < W; screenX += this.config.columnStep, currentRayAngle += rayAngleStepPerPixel * this.config.columnStep) {
      const wallHitInfo = this.castRay(player.x, player.y, currentRayAngle, maze);

      if (wallHitInfo) {
        this.renderWallColumn(wallHitInfo, screenX, currentRayAngle, player, W, H);
      }
    }
  }

  /**
   * Casts a ray from start position in given direction until it hits a wall
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} rayAngle - Ray direction in radians
   * @param {Object} maze - Maze object with cellAt method
   * @returns {Object|null} Wall hit information or null if no wall hit
   */
  castRay(startX, startY, rayAngle, maze) {
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
   * Renders a single vertical wall column with texture and lighting
   * @param {Object} wallHitInfo - Information about the wall hit (distance, position, type)
   * @param {number} screenX - X position on screen to draw the column
   * @param {number} currentRayAngle - Current ray angle for fisheye correction
   * @param {Object} player - Player object with angle property
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderWallColumn(wallHitInfo, screenX, currentRayAngle, player, W, H) {
    // Fish-eye correction
    const fishEyeCorrectedDistance = wallHitInfo.dist * Math.cos(currentRayAngle - player.a);
    const clampedDistanceToWall = Math.max(GameConfig.RENDERING.MIN_WALL_DISTANCE, fishEyeCorrectedDistance);

    // Wall height calculation
    const wallHeightInPixels = Math.min(H, (H / clampedDistanceToWall) | 0);
    const wallTopY = ((H - wallHeightInPixels) / 2) | 0;

    // Lighting calculation
    const brightnessFactor = Math.max(0, 1 - clampedDistanceToWall / this.config.maxDepth);

    // Texture selection
    const selectedTexture = this.selectTexture(wallHitInfo);

    // Texture coordinate calculation
    const { textureSourceX, textureSourceY, textureSourceWidth, textureSourceHeight } =
      this.calculateTextureCoordinates(wallHitInfo, selectedTexture, wallHeightInPixels);

    // Render the wall column
    this.ctx.save();
    this.ctx.globalAlpha = 1;

    this.ctx.drawImage(
      selectedTexture,
      textureSourceX, textureSourceY, textureSourceWidth, textureSourceHeight,
      screenX, wallTopY, this.config.columnStep, wallHeightInPixels
    );

    // Apply distance-based shading
    this.ctx.globalCompositeOperation = 'multiply';
    const shadedRed = (GameConfig.RENDERING.SHADING_RED_BASE + GameConfig.RENDERING.SHADING_RED_FACTOR * brightnessFactor) | 0;
    const shadedGreen = (GameConfig.RENDERING.SHADING_GREEN_BASE + GameConfig.RENDERING.SHADING_GREEN_FACTOR * brightnessFactor) | 0;
    const shadedBlue = (GameConfig.RENDERING.SHADING_BLUE_BASE + GameConfig.RENDERING.SHADING_BLUE_FACTOR * brightnessFactor) | 0;
    this.ctx.fillStyle = `rgba(${shadedRed}, ${shadedGreen}, ${shadedBlue}, ${GameConfig.RENDERING.SHADING_OPACITY})`;
    this.ctx.fillRect(screenX, wallTopY, this.config.columnStep, wallHeightInPixels);

    this.ctx.restore();
  }

  /**
   * Selects the appropriate texture based on wall type and position
   * @param {Object} wallHitInfo - Information about the wall hit including cellType
   * @returns {Object} The selected texture object
   */
  selectTexture(wallHitInfo) {
    if (wallHitInfo.cellType === 2) {
      return this.textures.door;
    } else {
      return ((Math.floor(wallHitInfo.nx) + Math.floor(wallHitInfo.ny)) % 2 === 0)
        ? this.textures.wall : this.textures.brick;
    }
  }

  /**
   * Calculates texture coordinates for wall rendering
   * @param {Object} wallHitInfo - Information about the wall hit
   * @param {Object} selectedTexture - The texture to apply
   * @param {number} wallHeightInPixels - Height of the wall in screen pixels
   * @returns {Object} Texture coordinate information
   */
  calculateTextureCoordinates(wallHitInfo, selectedTexture, wallHeightInPixels) {
    const hitPointX = wallHitInfo.nx;
    const hitPointY = wallHitInfo.ny;
    const isVerticalWall = Math.abs(hitPointX - Math.floor(hitPointX + 0.5)) < GameConfig.RENDERING.WALL_DETECTION_THRESHOLD;

    let wallSurfaceU;
    if (isVerticalWall) {
      wallSurfaceU = hitPointY % 1;
    } else {
      wallSurfaceU = hitPointX % 1;
    }

    const textureSourceX = Math.floor(wallSurfaceU * selectedTexture.width) % selectedTexture.width;
    const fixedTextureScale = GameConfig.RENDERING.FIXED_TEXTURE_SCALE;
    const wallHeightInTexturePixels = wallHeightInPixels / fixedTextureScale;
    const textureVerticalStart = 0;
    const textureSourceY = Math.floor(textureVerticalStart * selectedTexture.height) % selectedTexture.height;
    const textureSourceWidth = 1;
    const textureSourceHeight = Math.min(selectedTexture.height, Math.ceil(wallHeightInTexturePixels));

    return { textureSourceX, textureSourceY, textureSourceWidth, textureSourceHeight };
  }
}