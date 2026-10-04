// modules/RaycastRenderer.js - DDA raycasting into an off-screen pixel buffer
import { GameConfig } from './GameConfig.js';

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

const lerpColor = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);

/** Packs RGB (0-255, may be fractional) into a little-endian ABGR Uint32 pixel */
function packColor(r, g, b) {
  return (255 << 24) | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
}

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
    this.textureCache = new WeakMap(); // texture canvas -> { data, width, height }
    this.frame = null;                 // { canvas, ctx, image, pixels, W, H, backdrop }
  }

  /**
   * Main render method that draws the 3D scene
   * @param {Object} player - Player object with x, y, and angle (a) properties
   * @param {Object} maze - Maze object with cellAt method
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  render(player, maze, W, H) {
    const frame = this.getFrame(W, H);
    frame.pixels.set(frame.backdrop);
    this.renderFloorAndCeiling(player, W, H);
    this.renderWalls(player, maze, W, H);
    frame.ctx.putImageData(frame.image, 0, 0);
    // drawImage (unlike putImageData) honours the canvas DPR transform
    this.ctx.drawImage(frame.canvas, 0, 0, W, H);
  }

  /**
   * Returns the off-screen frame buffer for the given size, rebuilding it on resize
   * @private
   */
  getFrame(W, H) {
    if (this.frame && this.frame.W === W && this.frame.H === H) return this.frame;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(W, H);
    const pixels = new Uint32Array(image.data.buffer);
    this.frame = { canvas, ctx, image, pixels, W, H, backdrop: this.buildBackdrop(W, H) };
    return this.frame;
  }

  /**
   * Pre-renders the sky and floor gradients into a pixel buffer
   * @private
   */
  buildBackdrop(W, H) {
    const { COLORS } = GameConfig;
    const sky = [hexToRgb(COLORS.SKY_TOP), hexToRgb(COLORS.SKY_BOTTOM)];
    const floor = [hexToRgb(COLORS.FLOOR_TOP), hexToRgb(COLORS.FLOOR_BOTTOM)];
    const backdrop = new Uint32Array(W * H);
    const half = H >> 1;

    for (let y = 0; y < H; y++) {
      const [from, to] = y < half ? sky : floor;
      const t = y < half ? y / half : (y - half) / (H - half);
      const [r, g, b] = lerpColor(from, to, t);
      backdrop.fill(packColor(r, g, b), y * W, (y + 1) * W);
    }
    return backdrop;
  }

  /**
   * Returns cached pixel data for a texture canvas
   * @private
   */
  getTextureData(texture) {
    let entry = this.textureCache.get(texture);
    if (!entry) {
      const ctx = texture.getContext('2d');
      entry = {
        data: ctx.getImageData(0, 0, texture.width, texture.height).data,
        width: texture.width,
        height: texture.height
      };
      this.textureCache.set(texture, entry);
    }
    return entry;
  }

  /**
   * Perspective-correct textured floor and ceiling, one screen row at a time.
   * Every pixel in a row sits at the same distance, so shading is computed once per row
   * and the texture coordinate advances linearly across it. Skipped when textures are missing
   * (the gradient backdrop is used instead).
   * @param {Object} player - Player object with x, y, and angle (a) properties
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderFloorAndCeiling(player, W, H) {
    const { floor, ceiling } = this.textures;
    if (!floor || !ceiling) return;

    const floorTex = this.getTextureData(floor);
    const ceilTex = this.getTextureData(ceiling);
    const pixels = this.frame.pixels;
    const dirX = Math.cos(player.a), dirY = Math.sin(player.a);
    const planeScale = Math.tan(this.config.fov / 2);
    const planeX = -dirY * planeScale, planeY = dirX * planeScale;
    const half = H / 2;

    for (let y = H >> 1; y < H; y++) {
      // Perpendicular distance of this row; matches wall height = H / dist
      const rowDist = half / (y + 0.5 - half);
      const shade = this.shadeFor(rowDist, 1);
      const [fogR, fogG, fogB] = GameConfig.RENDERING.FOG_COLOR;
      const keep = 1 - shade.fog;
      const fogAddR = fogR * shade.fog, fogAddG = fogG * shade.fog, fogAddB = fogB * shade.fog;

      // World position at the left edge of the row, and the step per screen pixel
      let worldX = player.x + rowDist * (dirX - planeX);
      let worldY = player.y + rowDist * (dirY - planeY);
      const stepX = (rowDist * 2 * planeX) / W;
      const stepY = (rowDist * 2 * planeY) / W;

      const floorRow = y * W;
      const ceilRow = (H - 1 - y) * W;
      for (let x = 0; x < W; x++, worldX += stepX, worldY += stepY) {
        const u = worldX - Math.floor(worldX);
        const v = worldY - Math.floor(worldY);

        let i = (((v * floorTex.height) | 0) * floorTex.width + ((u * floorTex.width) | 0)) * 4;
        pixels[floorRow + x] = packColor(
          floorTex.data[i] * shade.r * keep + fogAddR,
          floorTex.data[i + 1] * shade.g * keep + fogAddG,
          floorTex.data[i + 2] * shade.b * keep + fogAddB
        );

        i = (((v * ceilTex.height) | 0) * ceilTex.width + ((u * ceilTex.width) | 0)) * 4;
        pixels[ceilRow + x] = packColor(
          ceilTex.data[i] * shade.r * keep + fogAddR,
          ceilTex.data[i + 1] * shade.g * keep + fogAddG,
          ceilTex.data[i + 2] * shade.b * keep + fogAddB
        );
      }
    }
  }

  /**
   * Distance shading shared by walls and floor: per-channel tint multipliers and a fog amount
   * @param {number} dist - Perpendicular distance
   * @param {number} sideShade - Extra brightness multiplier (e.g. for Y-facing walls)
   * @returns {{r: number, g: number, b: number, fog: number}}
   */
  shadeFor(dist, sideShade) {
    const R = GameConfig.RENDERING;
    const brightness = Math.max(0, 1 - dist / this.config.maxDepth);
    const tint = (base, factor) =>
      (1 - R.SHADING_OPACITY + (R.SHADING_OPACITY * (base + factor * brightness)) / 255) * sideShade;
    return {
      r: tint(R.SHADING_RED_BASE, R.SHADING_RED_FACTOR),
      g: tint(R.SHADING_GREEN_BASE, R.SHADING_GREEN_FACTOR),
      b: tint(R.SHADING_BLUE_BASE, R.SHADING_BLUE_FACTOR),
      // Fog pulls distant surfaces toward the horizon colour
      fog: Math.min(1, R.FOG_STRENGTH * (dist / this.config.maxDepth) ** 2)
    };
  }

  /**
   * Renders walls column by column using DDA raycasting
   * @param {Object} player - Player object with x, y, and angle (a) properties
   * @param {Object} maze - Maze object with cellAt method
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderWalls(player, maze, W, H) {
    const step = this.config.columnStep;
    const dirX = Math.cos(player.a), dirY = Math.sin(player.a);
    // Camera plane matches the sprite projection (tan-based, not angle-linear)
    const planeScale = Math.tan(this.config.fov / 2);
    const planeX = -dirY * planeScale, planeY = dirX * planeScale;

    for (let screenX = 0; screenX < W; screenX += step) {
      const cameraX = (2 * (screenX + step / 2)) / W - 1;
      const hit = this.castRay(player.x, player.y, dirX + planeX * cameraX, dirY + planeY * cameraX, maze);
      if (hit) this.renderWallColumn(hit, screenX, W, H);
    }
  }

  /**
   * Casts a ray through the grid using DDA until it hits a wall or door
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} rayDirX - Ray direction X (dir + camera plane offset, so not unit length)
   * @param {number} rayDirY - Ray direction Y
   * @param {Object} maze - Maze object with cellAt method
   * @returns {Object|null} { dist, wallU, side, cellType, mapX, mapY } or null if nothing is hit within range.
   *   dist is the perpendicular distance (no fisheye); side is 0 for X-facing walls, 1 for Y-facing.
   */
  castRay(startX, startY, rayDirX, rayDirY, maze) {
    let mapX = Math.floor(startX);
    let mapY = Math.floor(startY);
    const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);
    const stepX = rayDirX < 0 ? -1 : 1;
    const stepY = rayDirY < 0 ? -1 : 1;
    let sideDistX = (rayDirX < 0 ? startX - mapX : mapX + 1 - startX) * deltaDistX;
    let sideDistY = (rayDirY < 0 ? startY - mapY : mapY + 1 - startY) * deltaDistY;

    let side = 0;
    let travelled = 0;
    while (travelled <= this.config.maxDepth) {
      if (sideDistX < sideDistY) {
        travelled = sideDistX;
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        travelled = sideDistY;
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      const cellType = maze.cellAt(mapX, mapY);
      if (cellType === 1 || cellType === 2) {
        // The ray parameter is already the perpendicular distance because the
        // direction's component along the view axis is 1
        const wallCoord = side === 0 ? startY + travelled * rayDirY : startX + travelled * rayDirX;
        let wallU = wallCoord - Math.floor(wallCoord);
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) wallU = 1 - wallU;
        return { dist: travelled, wallU, side, cellType, mapX, mapY };
      }
    }
    return null;
  }

  /**
   * Draws one wall column into the pixel buffer using the full texture height,
   * with distance shading, fog and per-side shading
   * @param {Object} hit - Result of castRay
   * @param {number} screenX - X position of the column
   * @param {number} W - Screen width in pixels
   * @param {number} H - Screen height in pixels
   */
  renderWallColumn(hit, screenX, W, H) {
    const R = GameConfig.RENDERING;
    const dist = Math.max(R.MIN_WALL_DISTANCE, hit.dist);
    const lineHeight = H / dist;
    const wallTop = (H - lineHeight) / 2;
    const yStart = Math.max(0, Math.ceil(wallTop));
    const yEnd = Math.min(H, Math.floor(wallTop + lineHeight));
    if (yEnd <= yStart) return;

    const tex = this.getTextureData(this.selectTexture(hit));
    const texX = Math.min(tex.width - 1, (hit.wallU * tex.width) | 0);
    const texYStep = tex.height / lineHeight;
    let texYPos = (yStart - wallTop) * texYStep;

    // Distance shading plus a darker Y-facing side
    const { r: mulR, g: mulG, b: mulB, fog } = this.shadeFor(dist, hit.side === 1 ? R.SIDE_SHADE : 1);
    const [fogR, fogG, fogB] = R.FOG_COLOR;
    const keep = 1 - fog;

    const pixels = this.frame.pixels;
    const texData = tex.data;
    const width = Math.min(this.config.columnStep, W - screenX);

    for (let y = yStart; y < yEnd; y++, texYPos += texYStep) {
      const texY = Math.min(tex.height - 1, texYPos | 0);
      const i = (texY * tex.width + texX) * 4;
      const color = packColor(
        texData[i] * mulR * keep + fogR * fog,
        texData[i + 1] * mulG * keep + fogG * fog,
        texData[i + 2] * mulB * keep + fogB * fog
      );
      const row = y * W + screenX;
      for (let k = 0; k < width; k++) pixels[row + k] = color;
    }
  }

  /**
   * Selects the appropriate texture based on wall type and position
   * @param {Object} hit - Hit information including cellType, mapX and mapY
   * @returns {HTMLCanvasElement} The selected texture
   */
  selectTexture(hit) {
    if (hit.cellType === 2) return this.textures.door;
    return (hit.mapX + hit.mapY) % 2 === 0 ? this.textures.wall : this.textures.brick;
  }
}
