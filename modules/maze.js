// modules/maze.js - generation, pathing, pads & exit
export class Maze {
  constructor(w, h) {
    // Ensure odd sizes for perfect maze
    this.w = (w|0)|1; this.h = (h|0)|1;
    this.grid = Array.from({length:this.h}, _=> Array(this.w).fill(1)); // 1=wall,0=path
    this.exit = null; // {x,y,centerX,centerY}
    this.pads = [];   // recharge pads
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
    this.exit = { x: best.x, y: best.y, centerX: best.x+0.5, centerY: best.y+0.5 };

    // Recharge pads: place 3 on path cells, not too close to start/exit
    this.pads = [];
    const isOk = (x,y)=> {
      const dxs = x-1, dys = y-1;
      const dStart = Math.hypot(dxs, dys);
      const dExit = Math.hypot(x-this.exit.x, y-this.exit.y);
      return dStart > 6 && dExit > 6;
    };
    const cand = [];
    for (let y=1;y<this.h;y+=2) for (let x=1;x<this.w;x+=2) if (g[y][x]===0 && isOk(x,y)) cand.push([x,y]);
    for (let i=0;i<3 && cand.length;i++) {
      const k = (Math.random()*cand.length)|0;
      const [x,y] = cand.splice(k,1)[0];
      this.pads.push({ x, y });
    }
    const t1 = performance.now();
    this.lastGenMs = t1 - t0;
  }
}
