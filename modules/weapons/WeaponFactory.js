// modules/weapons/WeaponFactory.js - Factory for creating weapon instances
import { TaserWeapon } from './TaserWeapon.js';
import { StunWeapon } from './StunWeapon.js';
import { TranqWeapon } from './TranqWeapon.js';

export class WeaponFactory {
  static createWeapon(type) {
    switch (type.toLowerCase()) {
      case 'taser':
        return new TaserWeapon();
      case 'stun':
        return new StunWeapon();
      case 'tranq':
        return new TranqWeapon();
      default:
        throw new Error(`Unknown weapon type: ${type}`);
    }
  }

  static getAvailableWeapons() {
    return ['taser', 'stun', 'tranq'];
  }

  static createAllWeapons() {
    const weapons = {};
    this.getAvailableWeapons().forEach(type => {
      weapons[type] = this.createWeapon(type);
    });
    return weapons;
  }
}