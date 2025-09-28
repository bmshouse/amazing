// modules/devices/StunDevice.js - Projectile device that slows creatures
import { IDevice } from './IDevice.js';

export class StunDevice extends IDevice {
  constructor() {
    super('stun', 6, 600);
    this.projectileSpeed = 3.2;
    this.projectileRadius = 0.08;
    this.effectDuration = 2500;
    this.slowdownFactor = 0.35;
  }

  activate(player, enemyController, audio, onActivation, projectileSystem) {
    if (!this.canActivate()) return false;

    this.consumeCharge();

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
      device: this
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
    return 'Projectile that slows down creatures on impact';
  }
}