// modules/defenses.js - tools, ammo, cooldown, recharge (Legacy wrapper)
import { WeaponFactory } from './weapons/WeaponFactory.js';
import { GameConfig } from './GameConfig.js';

export class Defenses {
  constructor(player, enemies, audio, hud) {
    this.player = player;
    this.enemies = enemies;
    this.audio = audio;
    this.hud = hud;
    this.weapons = WeaponFactory.createAllWeapons();
    this.currentWeapon = 'taser';
    this.projectileSystem = null; // Will be injected
    this.eventManager = null; // Will be injected
    this.onFire = (_x,_y,_c)=>{};

    // Fallback to direct event listeners
    window.addEventListener('mousedown', (e)=>{
      if (e.button === 0) this.fire();
    });
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space') { e.preventDefault(); this.fire(); }
    });
  }

  reset() {
    this.currentWeapon = 'taser';
    Object.values(this.weapons).forEach(weapon => weapon.reload());
  }

  setProjectileSystem(projectileSystem) {
    this.projectileSystem = projectileSystem;
  }

  setEventManager(eventManager) {
    this.eventManager = eventManager;
    // Set up event handlers through EventManager
    if (eventManager) {
      eventManager.on('mousedown', (data) => {
        if (data.button === 0) this.fire();
      });
      eventManager.on('keydown', (data) => {
        if (data.code === 'Space') {
          data.event.preventDefault();
          this.fire();
        }
      });
    }
  }

  setMode(m) { this.currentWeapon = m; }

  taserAmmoRatio(){ return this.weapons.taser.getAmmoRatio(); }
  stunAmmoRatio(){ return this.weapons.stun.getAmmoRatio(); }
  tranqAmmoRatio(){ return this.weapons.tranq.getAmmoRatio(); }

  fire() {
    const weapon = this.weapons[this.currentWeapon];
    if (!weapon) return;

    const result = weapon.fire(this.player, this.enemies, this.audio, this.onFire, this.projectileSystem);
    return result;
  }

  update(dt) {
    // Recharge pads
    for (const pad of this.enemies.maze.pads) {
      const dx = (pad.x+0.5) - this.player.x;
      const dy = (pad.y+0.5) - this.player.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if (distance < GameConfig.MAZE.RECHARGE_PAD_RADIUS) {
        Object.values(this.weapons).forEach(weapon => weapon.reload());
      }
    }
  }
}
