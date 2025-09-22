// modules/RaycastRenderer.js - Handles raycasting and wall rendering
export class RaycastRenderer {
  constructor(canvas, textures) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.textures = textures;
    this.config = {
      fov: Math.PI/3,
      maxDepth: 24,
      columnStep: 1
    };
  }

  render(player, maze, W, H) {
    // Clear and draw background gradients
    this.renderBackground(W, H);

    // Render walls using raycasting
    this.renderWalls(player, maze, W, H);
  }

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

  castRay(startX, startY, rayAngle, maze) {
    const rayDirectionY = Math.sin(rayAngle);
    const rayDirectionX = Math.cos(rayAngle);
    let currentDistanceFromStart = 0;
    const rayMarchingStepSize = 0.02;
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

  renderWallColumn(wallHitInfo, screenX, currentRayAngle, player, W, H) {
    // Fish-eye correction
    const fishEyeCorrectedDistance = wallHitInfo.dist * Math.cos(currentRayAngle - player.a);
    const clampedDistanceToWall = Math.max(0.1, fishEyeCorrectedDistance);

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
    const shadedRed = (60 + 80 * brightnessFactor) | 0;
    const shadedGreen = (140 + 40 * brightnessFactor) | 0;
    const shadedBlue = (200 + 20 * brightnessFactor) | 0;
    this.ctx.fillStyle = `rgba(${shadedRed}, ${shadedGreen}, ${shadedBlue}, 0.7)`;
    this.ctx.fillRect(screenX, wallTopY, this.config.columnStep, wallHeightInPixels);

    this.ctx.restore();
  }

  selectTexture(wallHitInfo) {
    if (wallHitInfo.cellType === 2) {
      return this.textures.door;
    } else {
      return ((Math.floor(wallHitInfo.nx) + Math.floor(wallHitInfo.ny)) % 2 === 0)
        ? this.textures.wall : this.textures.brick;
    }
  }

  calculateTextureCoordinates(wallHitInfo, selectedTexture, wallHeightInPixels) {
    const hitPointX = wallHitInfo.nx;
    const hitPointY = wallHitInfo.ny;
    const isVerticalWall = Math.abs(hitPointX - Math.floor(hitPointX + 0.5)) < 0.01;

    let wallSurfaceU;
    if (isVerticalWall) {
      wallSurfaceU = hitPointY % 1;
    } else {
      wallSurfaceU = hitPointX % 1;
    }

    const textureSourceX = Math.floor(wallSurfaceU * selectedTexture.width) % selectedTexture.width;
    const fixedTextureScale = 64;
    const wallHeightInTexturePixels = wallHeightInPixels / fixedTextureScale;
    const textureVerticalStart = 0;
    const textureSourceY = Math.floor(textureVerticalStart * selectedTexture.height) % selectedTexture.height;
    const textureSourceWidth = 1;
    const textureSourceHeight = Math.min(selectedTexture.height, Math.ceil(wallHeightInTexturePixels));

    return { textureSourceX, textureSourceY, textureSourceWidth, textureSourceHeight };
  }
}