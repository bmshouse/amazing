// modules/SpriteRenderer.js - Handles billboard sprite rendering and particles
export class SpriteRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      fov: Math.PI/3,
      maxDepth: 24
    };
  }

  renderSprites(player, maze, enemies, particles, W, H, colors) {
    // Exit door billboard
    if (maze.exit) {
      const exitBillboardX = maze.exit.wallX + 0.5;
      const exitBillboardY = maze.exit.wallY + 0.5;
      this.drawBillboard(exitBillboardX, exitBillboardY, 0.6, colors.exitDoor, player, W, H);
    }

    // Recharge pads
    maze.pads.forEach(p => {
      this.drawFixedGroundObject(p.x + 0.5, p.y + 0.5, 0.4, colors.rechargePad, player, W, H, maze);
    });

    // Enemies
    enemies.entities.forEach(e => {
      const col = this.getEnemyColor(e, colors);
      this.drawBillboard(e.x, e.y, 0.6, col, player, W, H, maze, colors.exitDoor);
    });

    // Particles
    this.renderParticles(particles, player, W, H);

    // Crosshair
    this.renderCrosshair(W, H);
  }

  getEnemyColor(enemy, colors) {
    switch (enemy.state) {
      case 'stunned': return colors.entityStunned;
      case 'tranq': return colors.entityTranq;
      case 'slowed': return colors.entitySlowed;
      default: return colors.entity;
    }
  }

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
    const distanceBasedAlpha = Math.max(0.3, 1 - distanceToObject / this.config.maxDepth);

    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this.ctx.beginPath();

    if (objectColor !== exitDoorColor) {
      this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 1.2, 0, 0, Math.PI * 2);
    } else {
      this.ctx.rect(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 1.2);
    }

    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

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
    if (distanceToObject < 1.0) {
      return;
    }

    // Use a more stable angle calculation that doesn't break down at close range
    const normalizedAngle = angleFromPlayerToObject;

    // Only render if within reasonable FOV range
    if (Math.abs(normalizedAngle) > halfFOV * 1.2) {
      return;
    }

    const screenPositionX = (normalizedAngle / halfFOV) * (W * 0.4) + (W/2);
    const screenPositionY = H * 0.85; // Fixed ground level

    // Size with reasonable maximum for ground objects
    const baseSizeProjection = (H / distanceToObject) * objectRadius;
    const maxGroundSize = H * 0.12; // Smaller max for better ground appearance
    const projectedSizeOnScreen = Math.min(baseSizeProjection, maxGroundSize);

    // Distance-based transparency
    const distanceBasedAlpha = Math.max(0.4, 1 - distanceToObject / this.config.maxDepth);

    this.ctx.save();
    this.ctx.globalAlpha = distanceBasedAlpha;
    this.ctx.fillStyle = objectColor;
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen, projectedSizeOnScreen * 0.3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner glow for ground objects
    this.ctx.globalAlpha = distanceBasedAlpha * 0.5;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.ellipse(screenPositionX, screenPositionY, projectedSizeOnScreen * 0.6, projectedSizeOnScreen * 0.18, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

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
    const screenPositionY = H * 0.7 + (distanceToObject * 8); // Mobile position

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

  renderParticles(particles, player, W, H) {
    const now = performance.now();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      if (age > p.life) {
        particles.splice(i, 1);
        continue;
      }
      this.drawBillboard(p.x, p.y, 0.2, p.color, player, W, H, null, null);
    }
  }

  renderCrosshair(W, H) {
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillStyle = '#e2e2e2';
    this.ctx.fillRect(W/2-5, H/2, 12, 2);
    this.ctx.fillRect(W/2, H/2-5, 2, 12);
    this.ctx.globalAlpha = 1;
  }

  castRayForOcclusion(startX, startY, rayAngle, maze) {
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
}