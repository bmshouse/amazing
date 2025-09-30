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

    // Activation effect showing launch point
    const fxX = player.x + Math.cos(player.a) * 0.3;
    const fxY = player.y + Math.sin(player.a) * 0.3;
    onActivation(fxX, fxY, '#00d1ff');

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

  showRangeIndicator(player, onRangeIndicator) {
    // Show projectile path as a moderate line indicating trajectory
    const startX = player.x + Math.cos(player.a) * 0.3;
    const startY = player.y + Math.sin(player.a) * 0.3;
    const maxRange = 3.0; // Shorter, more reasonable range
    const endX = player.x + Math.cos(player.a) * maxRange;
    const endY = player.y + Math.sin(player.a) * maxRange;
    onRangeIndicator(startX, startY, endX, endY, this.getEffectColor(), 0.5);
  }
}