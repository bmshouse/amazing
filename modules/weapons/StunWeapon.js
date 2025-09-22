// modules/weapons/StunWeapon.js - Projectile weapon that slows enemies
import { IWeapon } from './IWeapon.js';

export class StunWeapon extends IWeapon {
  constructor() {
    super('stun', 6, 600);
    this.projectileSpeed = 3.2;
    this.projectileRadius = 0.08;
    this.effectDuration = 2500;
    this.slowdownFactor = 0.35;
  }

  fire(player, enemyController, audio, onFire, projectileSystem) {
    if (!this.canFire()) return false;

    this.consumeAmmo();

    // Create slow-moving orb projectile
    const projectile = {
      x: player.x,
      y: player.y,
      a: player.a,
      v: this.projectileSpeed,
      r: this.projectileRadius,
      color: '#00d1ff',
      type: 'stun',
      born: performance.now(),
      weapon: this
    };

    projectileSystem.addProjectile(projectile);
    audio.beep('sine', 600, 0.06, 0.05);

    return true;
  }

  applyEffect(enemy) {
    enemy.state = 'slowed';
    enemy.speedMul = this.slowdownFactor;
    enemy.stateTime = performance.now();
  }

  getEffectColor() {
    return '#00d1ff';
  }

  getDescription() {
    return 'Projectile that slows down enemies on impact';
  }
}