// modules/devices/DisruptorDevice.js - Short-range instant stun device (key 1)
import { IDevice } from './IDevice.js';
import { GameConfig, DEVICE_TYPES, ENEMY_STATES } from '../GameConfig.js';

const CFG = GameConfig.DEVICES.DISRUPTOR;

export class DisruptorDevice extends IDevice {
  constructor() {
    super(DEVICE_TYPES.DISRUPTOR, CFG.MAX_CHARGES, CFG.COOLDOWN);
    this.range = CFG.RANGE;
    this.effectDuration = CFG.EFFECT_DURATION;
  }

  activate(player, enemyController, audio, onActivation, _projectileSystem, onBolt) {
    if (!this.canActivate()) return false;

    this.consumeCharge();

    // Short-range instant hit
    const hit = enemyController.raycastForEnemy(player.x, player.y, player.a, this.range);

    if (hit) {
      hit.state = ENEMY_STATES.STUNNED;
      hit.stateTime = performance.now();
      hit.speedMul = 0;
      audio.beep('square', 720, 0.06, 0.05);
    } else {
      audio.beep('triangle', 520, 0.04, 0.035);
    }

    // Lightning bolt to the snowman it struck, or out to the end of its reach
    if (onBolt) {
      const endX = hit ? hit.x : player.x + Math.cos(player.a) * this.range;
      const endY = hit ? hit.y : player.y + Math.sin(player.a) * this.range;
      onBolt(player.x, player.y, endX, endY, CFG.COLOR, !!hit);
    }

    // Activation effect
    const fxX = player.x + Math.cos(player.a) * 0.8;
    const fxY = player.y + Math.sin(player.a) * 0.8;
    onActivation(fxX, fxY, CFG.COLOR);

    return true;
  }

  getEffectColor() {
    return CFG.COLOR;
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