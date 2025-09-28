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
}