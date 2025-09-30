// modules/devices/TaserDevice.js - Short-range instant stun device
import { IDevice } from './IDevice.js';

export class TaserDevice extends IDevice {
  constructor() {
    super('taser', 8, 250);
    this.range = 1.6;
    this.effectDuration = 1500;
  }

  activate(player, enemyController, audio, onActivation) {
    if (!this.canActivate()) return false;

    this.consumeCharge();

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

    // Activation effect
    const fxX = player.x + Math.cos(player.a) * 0.8;
    const fxY = player.y + Math.sin(player.a) * 0.8;
    onActivation(fxX, fxY, '#ffd166');

    return true;
  }

  getEffectColor() {
    return '#ffd166';
  }

  getDescription() {
    return 'Short-range disruptor that stuns creatures instantly';
  }

  showRangeIndicator(player, onRangeIndicator) {
    // Show range as a short line from player position
    const startX = player.x + Math.cos(player.a) * 0.3;
    const startY = player.y + Math.sin(player.a) * 0.3;
    const endX = player.x + Math.cos(player.a) * this.range;
    const endY = player.y + Math.sin(player.a) * this.range;
    onRangeIndicator(startX, startY, endX, endY, this.getEffectColor(), 0.6);
  }
}