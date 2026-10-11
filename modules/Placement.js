// modules/Placement.js - spreading pads and snowmen along the route from start to exit

const DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * BFS distance (in cells) from a source cell over open cells. Unreachable and wall cells are -1.
 * @param {Object} maze - Maze object with w, h and cellAt
 * @param {number} cx - Source cell X
 * @param {number} cy - Source cell Y
 * @returns {{maze: Object, cx: number, cy: number, w: number, dist: Int16Array}}
 */
export function distanceField(maze, cx, cy) {
  const { w, h } = maze;
  const dist = new Int16Array(w * h).fill(-1);
  if (maze.cellAt(cx, cy) === 0) {
    const queue = [cy * w + cx];
    dist[queue[0]] = 0;
    for (let head = 0; head < queue.length; head++) {
      const idx = queue[head];
      const x = idx % w, y = (idx / w) | 0;
      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx, ny = y + dy;
        if (maze.cellAt(nx, ny) !== 0 || dist[ny * w + nx] !== -1) continue;
        dist[ny * w + nx] = dist[idx] + 1;
        queue.push(ny * w + nx);
      }
    }
  }
  return { maze, cx, cy, w, dist };
}

/**
 * Picks `count` cells spread evenly along the route: the span of path distances is cut into `count`
 * equal bands and one cell is drawn at random from each, so nothing piles up at either end.
 * A band with no cell borrows the cell nearest its middle. When cells are scarce a cell is never picked twice.
 * @param {Array<{x: number, y: number, d: number}>} cells - Candidates, d being the path distance from the start
 * @param {number} count - How many to pick
 * @param {number} [minGap=0] - Preferred straight-line gap between picks; waived for a band that cannot meet it
 * @returns {Array<{x: number, y: number, d: number}>} Picked cells, nearest the start first
 */
export function pickSpread(cells, count, minGap = 0) {
  if (!cells.length || count <= 0) return [];
  const lo = Math.min(...cells.map(c => c.d));
  const hi = Math.max(...cells.map(c => c.d));
  const width = (hi - lo + 1) / count;
  const picked = [];
  for (let i = 0; i < count; i++) {
    const from = lo + i * width, to = from + width;
    const free = cells.filter(c => !picked.includes(c));
    if (!free.length) break;
    let band = free.filter(c => c.d >= from && c.d < to);
    if (!band.length) {
      const mid = (from + to) / 2;
      band = [free.reduce((a, b) => (Math.abs(b.d - mid) < Math.abs(a.d - mid) ? b : a))];
    }
    const roomy = band.filter(c => picked.every(p => Math.hypot(p.x - c.x, p.y - c.y) >= minGap));
    const pool = roomy.length ? roomy : band;
    picked.push(pool[(Math.random() * pool.length) | 0]);
  }
  return picked;
}
