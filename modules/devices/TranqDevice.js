// modules/devices/TranqDevice.js - Fast projectile device that immobilizes creatures
import { IDevice } from './IDevice.js';

export class TranqDevice extends IDevice {
  constructor() {
    super('tranq', 4, 750);
    this.projectileSpeed = 5.0;
    this.projectileRadius = 0.05;
    this.effectDuration = 3000;
  }

  activate(player, enemyController, audio, onActivation, projectileSystem) {
    if (!this.canActivate()) return false;

    this.consumeCharge();

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
      device: this
    };

    projectileSystem.addProjectile(projectile);
    audio.beep('sine', 420, 0.06, 0.05);

    // Activation effect showing launch point
    const fxX = player.x + Math.cos(player.a) * 0.2;
    const fxY = player.y + Math.sin(player.a) * 0.2;
    onActivation(fxX, fxY, '#a29bfe');

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
    return 'Fast dart that completely immobilizes creatures';
  }

  showRangeIndicator(player, onRangeIndicator) {
    // Show projectile path as a precise line for fast dart
    const startX = player.x + Math.cos(player.a) * 0.3;
    const startY = player.y + Math.sin(player.a) * 0.3;
    const maxRange = 4.0; // Longer but still reasonable range
    const endX = player.x + Math.cos(player.a) * maxRange;
    const endY = player.y + Math.sin(player.a) * maxRange;
    onRangeIndicator(startX, startY, endX, endY, this.getEffectColor(), 0.5);
  }
}