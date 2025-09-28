// modules/maze.js - generation, pathing, pads & exit
import { GameConfig } from './GameConfig.js';

export class Maze {
  constructor(w, h, rechargePadCount = null) {
    // Ensure odd sizes for perfect maze
    this.w = (w|0)|1; this.h = (h|0)|1;
    this.grid = Array.from({length:this.h}, _=> Array(this.w).fill(1)); // 1=wall,0=path,2=exit door
    this.exit = null; // {x,y,wallX,wallY}
    this.pads = [];   // recharge pads
    this.rechargePadCount = rechargePadCount ?? GameConfig.MAZE.RECHARGE_PAD_COUNT;
  }

  cellAt(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (yi < 0 || yi >= this.h || xi < 0 || xi >= this.w) return 1;
    return this.grid[yi][xi];
  }

  generate() {
    const t0 = performance.now();
    // Recursive backtracker (iterative) on odd grid
    const stack = [];
    const start = {x:1, y:1};
    const g = this.grid;
    g[start.y][start.x] = 0;
    stack.push(start);
    const dirs = [[2,0],[-2,0],[0,2],[0,-2]];
    while (stack.length) {
      const cur = stack[stack.length-1];
      // Shuffle dirs
      for (let i=dirs.length-1;i>0;i--) { const j=(Math.random()* (i+1))|0; [dirs[i],dirs[j]]=[dirs[j],dirs[i]]; }
      let carved = false;
      for (const [dx,dy] of dirs) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (ny <= 0 || ny >= this.h-1 || nx <= 0 || nx >= this.w-1) continue;
        if (g[ny][nx] === 1) {
          g[ny][nx] = 0;
          g[cur.y + (dy/2)][cur.x + (dx/2)] = 0;
          stack.push({x:nx, y:ny});
          carved = true;
          break;
        }
      }
      if (!carved) stack.pop();
    }
    // Place exit at farthest cell from start
    let best = {d:-1, x:1, y:1};
    for (let y=1;y<this.h;y+=2) for (let x=1;x<this.w;x+=2) {
      if (g[y][x]===0) {
        const d = (x-1)*(x-1) + (y-1)*(y-1);
        if (d > best.d) best = { d, x, y };
      }
    }

    // Find a wall adjacent to the exit cell to place the exit door
    const exitCellX = best.x;
    const exitCellY = best.y;

    // Check all four directions for walls to place the exit door
    const wallDirections = [
      { dx: 0, dy: -1 }, // North wall
      { dx: 1, dy: 0 },  // East wall
      { dx: 0, dy: 1 },  // South wall
      { dx: -1, dy: 0 }  // West wall
    ];

    // Find the first wall direction that has a wall and mark it as exit door
    let exitWallCell = null;
    for (const dir of wallDirections) {
      const wallCellX = exitCellX + dir.dx;
      const wallCellY = exitCellY + dir.dy;

      // Check if this position is within bounds and is a wall
      if (wallCellY >= 0 && wallCellY < this.h && wallCellX >= 0 && wallCellX < this.w &&
          g[wallCellY][wallCellX] === 1) {
        // Mark this wall cell as exit door
        g[wallCellY][wallCellX] = 2;
        exitWallCell = { wallX: wallCellX, wallY: wallCellY };
        break;
      }
    }

    // Store exit information
    this.exit = {
      x: exitCellX,        // Exit walkway cell X
      y: exitCellY,        // Exit walkway cell Y
      wallX: exitWallCell ? exitWallCell.wallX : exitCellX,  // Exit door wall cell X
      wallY: exitWallCell ? exitWallCell.wallY : exitCellY   // Exit door wall cell Y
    };

    // Recharge pads: place them on path cells, not too close to start/exit
    this.pads = [];
    const isOk = (x,y)=> {
      const dxs = x-GameConfig.PLAYER.START_X, dys = y-GameConfig.PLAYER.START_Y;
      const dStart = Math.hypot(dxs, dys);
      const dExit = Math.hypot(x-this.exit.x, y-this.exit.y);
      return dStart > GameConfig.MAZE.MIN_DISTANCE_FROM_START && dExit > GameConfig.MAZE.MIN_DISTANCE_FROM_EXIT;
    };
    const cand = [];
    for (let y=1;y<this.h;y+=2) for (let x=1;x<this.w;x+=2) if (g[y][x]===0 && isOk(x,y)) cand.push([x,y]);
    for (let i=0;i<this.rechargePadCount && cand.length;i++) {
      const k = (Math.random()*cand.length)|0;
      const [x,y] = cand.splice(k,1)[0];
      this.pads.push({ x, y });
    }
    const t1 = performance.now();
    this.lastGenMs = t1 - t0;
  }
}
