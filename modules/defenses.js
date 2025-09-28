// modules/defenses.js - tools, charges, cooldown, recharge (Legacy wrapper)
import { DeviceFactory } from './devices/DeviceFactory.js';
import { GameConfig } from './GameConfig.js';

export class Defenses {
  constructor(player, enemies, audio, hud) {
    this.player = player;
    this.enemies = enemies;
    this.audio = audio;
    this.hud = hud;
    this.devices = DeviceFactory.createAllDevices();
    this.currentDevice = 'taser';
    this.projectileSystem = null; // Will be injected
    this.eventManager = null; // Will be injected
    this.onActivation = (_x,_y,_c)=>{};

    // Fallback to direct event listeners
    window.addEventListener('mousedown', (e)=>{
      if (e.button === 0 && document.pointerLockElement) this.activate();
    });
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space') { e.preventDefault(); this.activate(); }
    });
  }

  reset() {
    this.currentDevice = 'taser';
    Object.values(this.devices).forEach(device => device.recharge());
  }

  setProjectileSystem(projectileSystem) {
    this.projectileSystem = projectileSystem;
  }

  setEventManager(eventManager) {
    this.eventManager = eventManager;
    // Set up event handlers through EventManager
    if (eventManager) {
      eventManager.on('mousedown', (data) => {
        if (data.button === 0 && document.pointerLockElement) this.activate();
      });
      eventManager.on('keydown', (data) => {
        if (data.code === 'Space') {
          data.event.preventDefault();
          this.activate();
        }
      });
    }
  }

  setMode(m) { this.currentDevice = m; }

  taserChargeRatio(){ return this.devices.taser.getChargeRatio(); }
  stunChargeRatio(){ return this.devices.stun.getChargeRatio(); }
  tranqChargeRatio(){ return this.devices.tranq.getChargeRatio(); }

  activate() {
    const device = this.devices[this.currentDevice];
    if (!device) return;

    const result = device.activate(this.player, this.enemies, this.audio, this.onActivation, this.projectileSystem);
    return result;
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
