// modules/weapons/IWeapon.js - Weapon interface definition
export class IWeapon {
  constructor(name, maxAmmo, cooldown) {
    this.name = name;
    this.maxAmmo = maxAmmo;
    this.cooldown = cooldown;
    this.ammo = maxAmmo;
    this.lastFire = 0;
  }

  // Abstract methods that must be implemented by concrete weapons
  fire(player, target, audio, onFire) {
    throw new Error('fire() method must be implemented by concrete weapon class');
  }

  // Common weapon functionality
  canFire() {
    const now = performance.now();
    return (now - this.lastFire >= this.cooldown) && this.ammo > 0;
  }

  consumeAmmo() {
    if (this.ammo > 0) {
      this.ammo--;
      this.lastFire = performance.now();
      return true;
    }
    return false;
  }

  reload() {
    this.ammo = this.maxAmmo;
  }

  getAmmoRatio() {
    return this.ammo / this.maxAmmo;
  }

  getAmmo() {
    return this.ammo;
  }

  getMaxAmmo() {
    return this.maxAmmo;
  }

  getCooldown() {
    return this.cooldown;
  }
}