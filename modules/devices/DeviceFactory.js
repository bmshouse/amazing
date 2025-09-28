// modules/devices/DeviceFactory.js - Factory for creating device instances
import { TaserDevice } from './TaserDevice.js';
import { StunDevice } from './StunDevice.js';
import { TranqDevice } from './TranqDevice.js';

export class DeviceFactory {
  static createDevice(type) {
    switch (type.toLowerCase()) {
      case 'taser':
        return new TaserDevice();
      case 'stun':
        return new StunDevice();
      case 'tranq':
        return new TranqDevice();
      default:
        throw new Error(`Unknown device type: ${type}`);
    }
  }

  static getAvailableDevices() {
    return ['taser', 'stun', 'tranq'];
  }

  static createAllDevices() {
    const devices = {};
    this.getAvailableDevices().forEach(type => {
      devices[type] = this.createDevice(type);
    });
    return devices;
  }
}