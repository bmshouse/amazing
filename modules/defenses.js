// modules/defenses.js - tools, charges, cooldown, recharge (Legacy wrapper)
import { DeviceFactory } from './devices/DeviceFactory.js';
import { GameConfig, DEVICE_TYPES, EVENTS } from './GameConfig.js';

export class Defenses {
  constructor(player, enemies, audio, hud) {
    this.player = player;
    this.enemies = enemies;
    this.audio = audio;
    this.hud = hud;
    this.devices = DeviceFactory.createAllDevices();
    this.currentDevice = DEVICE_TYPES.DISRUPTOR;
    this.projectileSystem = null; // Will be injected
    this.eventManager = null; // Will be injected
    this.onActivation = (_x,_y,_c,_muzzle)=>{};
    this.onBolt = (_x1,_y1,_x2,_y2,_c,_hit)=>{};
    this.onRangeIndicator =(_x1,_y1,_x2,_y2,_c,_a)=>{};
  }

  // Check if click is on UI elements to prevent accidental device activation
  isClickOnUI(event) {
    const target = event.target;
    if (!target) return false;

    // Check if click is on config button
    if (target.id === 'configButton' || target.closest('#configButton')) {
      return true;
    }

    // Check if click is on config panel
    if (target.id === 'configPanel' || target.closest('#configPanel')) {
      return true;
    }

    // Check if click is on HUD elements
    if (target.closest('#hud')) {
      return true;
    }

    // Check if click is on touch controls
    if (target.closest('.touch-controls')) {
      return true;
    }

    // Check if click is on any button or interactive element
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' || target.closest('button')) {
      return true;
    }

    return false;
  }

  reset() {
    this.currentDevice = DEVICE_TYPES.DISRUPTOR;
    Object.values(this.devices).forEach(device => device.recharge());
  }

  setProjectileSystem(projectileSystem) {
    this.projectileSystem = projectileSystem;
  }

  setEventManager(eventManager) {
    this.eventManager = eventManager;
    // Set up event handlers through EventManager
    if (eventManager) {
      eventManager.on(EVENTS.MOUSEDOWN, (data) => {
        if (data.button === 0 && document.pointerLockElement && !this.isClickOnUI(data.event)) {
          this.activate();
        }
      });
      eventManager.on(EVENTS.KEYDOWN, (data) => {
        if (data.code === 'Space') {
          data.event.preventDefault();
          this.activate();
        }
      });
    }
  }

  setMode(m) { this.currentDevice = m; }

  disruptorChargeRatio(){ return this.devices[DEVICE_TYPES.DISRUPTOR].getChargeRatio(); }
  frostChargeRatio(){ return this.devices[DEVICE_TYPES.FROST].getChargeRatio(); }
  pacifierChargeRatio(){ return this.devices[DEVICE_TYPES.PACIFIER].getChargeRatio(); }

  activate() {
    const device = this.devices[this.currentDevice];
    if (!device) return;

    // Check if device is enabled
    if (device.enabled === false) return;

    const result = device.activate(this.player, this.enemies, this.audio, this.onActivation, this.projectileSystem, this.onBolt);
    return result;
  }

  showRangeIndicator() {
    const device = this.devices[this.currentDevice];
    if (device && device.showRangeIndicator) {
      device.showRangeIndicator(this.player, this.onRangeIndicator);
    }
  }

  update(dt) {
    // Recharge pads
    for (const pad of this.enemies.maze.pads) {
      const dx = (pad.x+0.5) - this.player.x;
      const dy = (pad.y+0.5) - this.player.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if (distance < GameConfig.MAZE.RECHARGE_PAD_RADIUS) {
        Object.values(this.devices).forEach(device => device.recharge());
      }
    }
  }
}
