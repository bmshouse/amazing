// modules/devices/DeviceFactory.js - Factory for creating device instances
import { DisruptorDevice } from './DisruptorDevice.js';
import { FrostDevice } from './FrostDevice.js';
import { PacifierDevice } from './PacifierDevice.js';
import { DEVICE_TYPES, DEVICE_ORDER } from '../GameConfig.js';

export class DeviceFactory {
  static createDevice(type) {
    switch (type.toLowerCase()) {
      case DEVICE_TYPES.DISRUPTOR:
        return new DisruptorDevice();
      case DEVICE_TYPES.FROST:
        return new FrostDevice();
      case DEVICE_TYPES.PACIFIER:
        return new PacifierDevice();
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