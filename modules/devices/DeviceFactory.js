// modules/devices/DeviceFactory.js - Factory for creating device instances
import { TaserDevice } from './TaserDevice.js';
import { StunDevice } from './StunDevice.js';
import { TranqDevice } from './TranqDevice.js';
import { DEVICE_TYPES, DEVICE_ORDER } from '../GameConfig.js';

export class DeviceFactory {
  static createDevice(type) {
    switch (type.toLowerCase()) {
      case DEVICE_TYPES.TASER:
        return new TaserDevice();
      case DEVICE_TYPES.STUN:
        return new StunDevice();
      case DEVICE_TYPES.TRANQ:
        return new TranqDevice();
      default:
        throw new Error(`Unknown device type: ${type}`);
    }
  }

  static getAvailableDevices() {
    return [...DEVICE_ORDER];
  }

  static createAllDevices() {
    const devices = {};
    this.getAvailableDevices().forEach(type => {
      devices[type] = this.createDevice(type);
    });
    return devices;
  }
}