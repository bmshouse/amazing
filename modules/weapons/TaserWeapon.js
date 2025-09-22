// modules/weapons/TaserWeapon.js - Short-range instant hit weapon
import { IWeapon } from './IWeapon.js';

export class TaserWeapon extends IWeapon {
  constructor() {
    super('taser', 8, 250);
    this.range = 1.6;
    this.effectDuration = 1500;
  }

  fire(player, enemyController, audio, onFire) {
    if (!this.canFire()) return false;

    this.consumeAmmo();

    // Short-range instant hit
    const hit = enemyController.raycastForEnemy(player.x, player.y, player.a, this.range);

    if (hit) {
      hit.state = 'stunned';
      hit.stateTime = performance.now();
      hit.speedMul = 0;
      audio.beep('square', 720, 0.06, 0.05);
    } else {
      audio.beep('triangle', 520, 0.04, 0.035);
    }

    // Fire effect
    const fxX = player.x + Math.cos(player.a) * 0.8;
    const fxY = player.y + Math.sin(player.a) * 0.8;
    onFire(fxX, fxY, '#ffd166');

    return true;
  }

  getEffectColor() {
    return '#ffd166';
  }

  getDescription() {
    return 'Short-range taser that stuns enemies instantly';
  }
}