// modules/defenses.js - tools, ammo, cooldown, recharge
export class Defenses {
  constructor(player, enemies, audio, hud) {
    this.player = player;
    this.enemies = enemies;
    this.audio = audio;
    this.hud = hud;
    this.mode = 'taser';
    this.cooldowns = { taser: 250, stun: 600, tranq: 750 };
    this.lastFire = 0;
    this.ammo = { taser: 8, stun: 6, tranq: 4 };
    this.ammoMax = { taser: 8, stun: 6, tranq: 4 };
    this.projectiles = [];
    this.onFire = (_x,_y,_c)=>{};

    window.addEventListener('mousedown', (e)=>{
      if (e.button === 0) this.fire();
    });
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space') { e.preventDefault(); this.fire(); }
    });
  }

  reset() {
    this.mode = 'taser';
    this.ammo = { taser: 8, stun: 6, tranq: 4 };
    this.projectiles = [];
    this.lastFire = 0;
  }

  setMode(m) { this.mode = m; }

  taserAmmoRatio(){ return this.ammo.taser / this.ammoMax.taser; }
  stunAmmoRatio(){ return this.ammo.stun / this.ammoMax.stun; }
  tranqAmmoRatio(){ return this.ammo.tranq / this.ammoMax.tranq; }

  fire() {
    const now = performance.now();
    if (now - this.lastFire < this.cooldowns[this.mode]) return;
    if (this.ammo[this.mode] <= 0) return;
    this.lastFire = now;
    this.ammo[this.mode]--;

    if (this.mode === 'taser') {
      // short-range instant hit
      const hit = this.enemies.raycastForEnemy(this.player.x, this.player.y, this.player.a, 1.6);
      if (hit) {
        hit.state = 'stunned'; hit.stateTime = now; hit.speedMul = 0;
        this.audio.beep('square', 720, 0.06, 0.05);
      } else {
        this.audio.beep('triangle', 520, 0.04, 0.035);
      }
      const fxX = this.player.x + Math.cos(this.player.a)*0.8;
      const fxY = this.player.y + Math.sin(this.player.a)*0.8;
      this.onFire(fxX, fxY, '#ffd166');
    } else if (this.mode === 'stun') {
      // slow moving orb that slows enemies
      this.projectiles.push({
        x: this.player.x, y: this.player.y, a: this.player.a,
        v: 3.2, r: 0.08, color: '#00d1ff', type: 'stun', born: now
      });
      this.audio.beep('sine', 600, 0.06, 0.05);
    } else {
      // tranquilizer dart
      this.projectiles.push({
        x: this.player.x, y: this.player.y, a: this.player.a,
        v: 5.0, r: 0.05, color: '#a29bfe', type: 'tranq', born: now
      });
      this.audio.beep('sine', 420, 0.06, 0.05);
    }
  }

  update(dt) {
    const t = performance.now();
    // Projectiles move and apply effects
    for (let i=this.projectiles.length-1;i>=0;i--) {
      const p = this.projectiles[i];
      p.x += Math.cos(p.a) * p.v * (dt/1000);
      p.y += Math.sin(p.a) * p.v * (dt/1000);
      // hit wall?
      if (this.enemies.maze.cellAt(p.x, p.y) === 1) { this.projectiles.splice(i,1); continue; }
      // hit enemy?
      const hit = this.enemies.findHit(p.x, p.y, p.r);
      if (hit) {
        if (p.type === 'stun') {
          hit.state = 'slowed'; hit.speedMul = 0.35; hit.stateTime = t;
        } else if (p.type === 'tranq') {
          hit.state = 'tranq'; hit.speedMul = 0; hit.stateTime = t;
        }
        this.onFire(p.x, p.y, p.color);
        this.projectiles.splice(i,1);
      }
    }
    // Recharge pads
    for (const pad of this.enemies.maze.pads) {
      const dx = (pad.x+0.5) - this.player.x;
      const dy = (pad.y+0.5) - this.player.y;
      if (dx*dx + dy*dy < 0.5*0.5) {
        this.ammo.taser = this.ammoMax.taser;
        this.ammo.stun = this.ammoMax.stun;
        this.ammo.tranq = this.ammoMax.tranq;
      }
    }
  }
}
