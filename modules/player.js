// modules/player.js - movement, collisions, HUD, input handling
export class PlayerController {
  constructor(maze) {
    this.x = 1.5; this.y = 1.5;
    this.a = 0; // angle
    this.speed = 2.4; // units/sec
    this.turnSpeed = 2.4; // radians/sec via keyboard
    this.sensitivity = 0.5; // mouse sensitivity
    this.pointerLocked = false;
    this.keys = new Set();
    this.bindKeys();
    this.reset(maze);
  }

  reset(maze) {
    this.x = 1.5; this.y = 1.5; this.a = 0;
    this.keys.clear();
    this.timerStart = performance.now();
  }

  bindKeys() {
    window.addEventListener('keydown', e=>{
      const k = e.key.toLowerCase();
      this.keys.add(k);
    });
    window.addEventListener('keyup', e=>{
      const k = e.key.toLowerCase();
      this.keys.delete(k);
    });
  }

  turn(dx) {
    this.a += dx * 0.002 * this.sensitivity;
  }

  distanceTo(x, y) { return Math.hypot(x - this.x, y - this.y); }

  update(dt, maze) {
    const s = (dt/1000) * (this.keys.has('shift') ? this.speed*1.4 : this.speed);
    const forward = (this.keys.has('w') || this.keys.has('arrowup')) ? 1 : 0;
    const back    = (this.keys.has('s') || this.keys.has('arrowdown')) ? 1 : 0;
    const left    = (this.keys.has('a') || this.keys.has('arrowleft')) ? 1 : 0;
    const right   = (this.keys.has('d') || this.keys.has('arrowright')) ? 1 : 0;
    const turnL   = (this.keys.has('q'));
    const turnR   = (this.keys.has('e'));
    if (turnL) this.a -= (dt/1000)*this.turnSpeed;
    if (turnR) this.a += (dt/1000)*this.turnSpeed;

    const mx = Math.cos(this.a) * (forward - back) + Math.cos(this.a + Math.PI/2) * (right - left);
    const my = Math.sin(this.a) * (forward - back) + Math.sin(this.a + Math.PI/2) * (right - left);

    const nx = this.x + mx * s;
    const ny = this.y + my * s;

    // Collision: simple circle vs grid walls
    if (maze.cellAt(nx, this.y) === 0) this.x = nx;
    if (maze.cellAt(this.x, ny) === 0) this.y = ny;
  }
}
