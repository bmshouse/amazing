// modules/devices/FrostDevice.js - Projectile device that frosts creatures, slowing them down
import { IDevice } from './IDevice.js';
import { GameConfig, DEVICE_TYPES, ENEMY_STATES } from '../GameConfig.js';

const CFG = GameConfig.DEVICES.FROST;

export class FrostDevice extends IDevice {
  constructor() {
    super(DEVICE_TYPES.FROST, CFG.MAX_CHARGES, CFG.COOLDOWN);
    this.projectileSpeed = CFG.PROJECTILE_SPEED;
    this.projectileRadius = CFG.PROJECTILE_RADIUS;
    this.effectDuration = CFG.EFFECT_DURATION;
    this.slowdownFactor = CFG.SLOWDOWN_FACTOR;
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
      color: CFG.COLOR,
      type: DEVICE_TYPES.FROST,
      born: performance.now(),
      device: this
    };

    projectileSystem.addProjectile(projectile);
    audio.beep('sine', 600, 0.06, 0.05);

    // Muzzle flash just ahead of the player (closer than this it swamps the screen)
    const fxX = player.x + Math.cos(player.a) * 0.5;
    const fxY = player.y + Math.sin(player.a) * 0.5;
    onActivation(fxX, fxY, CFG.COLOR, true);

    return true;
  }

  applyEffect(enemy) {
    enemy.state = ENEMY_STATES.SLOWED;
    enemy.speedMul = this.slowdownFactor;
    enemy.stateTime = performance.now();
  }

  getEffectColor() {
    return CFG.COLOR;
  }

  getDescription() {
    return 'Projectile that slows down creatures on impact';
  }

  showRangeIndicator(player, onRangeIndicator) {
    // Show projectile path as a moderate line indicating trajectory
    const startX = player.x + Math.cos(player.a) * 0.3;
    const startY = player.y + Math.sin(player.a) * 0.3;
    const maxRange = CFG.INDICATOR_RANGE;
    const endX = player.x + Math.cos(player.a) * maxRange;
    const endY = player.y + Math.sin(player.a) * maxRange;
    onRangeIndicator(startX, startY, endX, endY, this.getEffectColor(), 0.5);
  }
}