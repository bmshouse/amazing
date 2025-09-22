// modules/weapons/TranqWeapon.js - Fast projectile weapon that immobilizes enemies
import { IWeapon } from './IWeapon.js';

export class TranqWeapon extends IWeapon {
  constructor() {
    super('tranq', 4, 750);
    this.projectileSpeed = 5.0;
    this.projectileRadius = 0.05;
    this.effectDuration = 3000;
  }

  fire(player, enemyController, audio, onFire, projectileSystem) {
    if (!this.canFire()) return false;

    this.consumeAmmo();

    // Create fast-moving dart projectile
    const projectile = {
      x: player.x,
      y: player.y,
      a: player.a,
      v: this.projectileSpeed,
      r: this.projectileRadius,
      color: '#a29bfe',
      type: 'tranq',
      born: performance.now(),
      weapon: this
    };

    projectileSystem.addProjectile(projectile);
    audio.beep('sine', 420, 0.06, 0.05);

    return true;
  }

  applyEffect(enemy) {
    enemy.state = 'tranq';
    enemy.speedMul = 0;
    enemy.stateTime = performance.now();
  }

  getEffectColor() {
    return '#a29bfe';
  }

  getDescription() {
    return 'Fast dart that completely immobilizes enemies';
  }
}