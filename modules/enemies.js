// modules/enemies.js - friendly AI that pushes player back
export class EnemyController {
  constructor(maze, player) {
    this.maze = maze;
    this.player = player;
    this.entities = [];
    this.onBoop = (_x,_y)=>{};
    this.reset(maze);
  }

  reset(maze) {
    this.maze = maze;
    this.entities = [];
    // spawn 8-12 enemies on open cells not too close to start
    const cells = [];
    for (let y=1;y<maze.h;y+=2) for (let x=1;x<maze.w;x+=2) if (maze.grid[y][x]===0) cells.push({x:x+0.5, y:y+0.5});
    for (let i=0;i<10 && cells.length;i++) {
      const k = (Math.random()*cells.length)|0;
      const c = cells.splice(k,1)[0];
      const dStart = Math.hypot(c.x-1.5, c.y-1.5);
      if (dStart < 5) continue;
      this.entities.push({ x:c.x, y:c.y, state:'idle', stateTime: performance.now(), speed:1.3, speedMul:1 });
    }
  }

  update(dt, maze) {
    this.maze = maze;
    const t = performance.now();
    for (const e of this.entities) {
      // state recovery
      if (e.state==='stunned' && t - e.stateTime > 1500) { e.state='idle'; e.speedMul=1; }
      if (e.state==='slowed' && t - e.stateTime > 2500) { e.state='idle'; e.speedMul=1; }
      if (e.state==='tranq'  && t - e.stateTime > 3000) { e.state='idle'; e.speedMul=1; }

      // simple steering: chase if close, wander otherwise
      let targetA = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      const chase = dist < 6 && e.state!=='tranq';

      if (!chase) {
        // wander: jitter
        targetA += (Math.random()-0.5)*0.2;
      }

      const v = e.speed * e.speedMul * (dt/1000);
      const nx = e.x + Math.cos(targetA) * v;
      const ny = e.y + Math.sin(targetA) * v;
      if (maze.cellAt(nx, e.y) === 0) e.x = nx;
      if (maze.cellAt(e.x, ny) === 0) e.y = ny;

      // Pushback if close
      if (dist < 0.6) {
        const ax = this.player.x - e.x;
        const ay = this.player.y - e.y;
        const len = Math.hypot(ax, ay) || 1;
        const push = 0.4;
        const px = this.player.x + (ax/len)*push;
        const py = this.player.y + (ay/len)*push;
        if (maze.cellAt(px, this.player.y) === 0) this.player.x = px;
        if (maze.cellAt(this.player.x, py) === 0) this.player.y = py;
        this.onBoop(e.x, e.y);
      }
    }
  }

  // Utility for ray hit
  raycastForEnemy(x, y, a, maxDist=1.5) {
    const step = 0.05;
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

  findHit(x, y, r=0.12) {
    for (const e of this.entities) {
      const dx = e.x - x, dy = e.y - y;
      if (dx*dx + dy*dy < r*r) return e;
    }
    return null;
  }
}
