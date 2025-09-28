// modules/devices/IDevice.js - Device interface definition
export class IDevice {
  constructor(name, maxCharges, cooldown) {
    this.name = name;
    this.maxCharges = maxCharges;
    this.cooldown = cooldown;
    this.charges = maxCharges;
    this.lastActivation = 0;
  }

  // Abstract methods that must be implemented by concrete devices
  activate(player, target, audio, onActivation) {
    throw new Error('activate() method must be implemented by concrete device class');
  }

  // Common device functionality
  canActivate() {
    const now = performance.now();
    return (now - this.lastActivation >= this.cooldown) && this.charges > 0;
  }

  consumeCharge() {
    if (this.charges > 0) {
      this.charges--;
      this.lastActivation = performance.now();
      return true;
    }
    return false;
  }

  recharge() {
    this.charges = this.maxCharges;
  }

  getChargeRatio() {
    return this.charges / this.maxCharges;
  }

  getCharges() {
    return this.charges;
  }

  getMaxCharges() {
    return this.maxCharges;
  }

  getCooldown() {
    return this.cooldown;
  }
}