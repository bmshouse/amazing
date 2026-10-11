// modules/Effects.js - per-device impact effects and particle motion (pure helpers, no rendering)
import { GameConfig, DEVICE_TYPES } from './GameConfig.js';

const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

/**
 * Where a particle is, how big and how opaque, at a moment in its life. A particle with no motion
 * fields (vx, vy, vh, gravity, drag, grow, fade) stays put at full size, as plain particles always did.
 * @param {Object} p - Particle: x, y, born, life, size and optional vx, vy (world units/s), h (height above
 *   floor), vh (units/s), gravity, drag (1/s), grow (size multiplier by end of life), fade
 * @param {number} now - performance.now() timestamp
 * @returns {{x: number, y: number, size: number, h: (number|undefined), alpha: number}}
 */
export function particleState(p, now) {
  const age = p.born === undefined ? 0 : Math.max(0, now - p.born);
  const t = age / 1000;
  const u = p.life ? Math.min(1, age / p.life) : 0;
  const drag = p.drag ?? 0;
  // Distance covered at unit initial speed, with exponential slow-down when there is drag
  const travel = drag > 0 ? (1 - Math.exp(-drag * t)) / drag : t;
  return {
    x: p.x + (p.vx ?? 0) * travel,
    y: p.y + (p.vy ?? 0) * travel,
    size: (p.size ?? GameConfig.RENDERING.PARTICLE_SIZE) * (1 + ((p.grow ?? 1) - 1) * u),
    h: p.h === undefined ? undefined : Math.max(0.02, p.h + (p.vh ?? 0) * t - 0.5 * (p.gravity ?? 0) * t * t),
    alpha: p.fade ? 1 - u : 1
  };
}

/**
 * Velocity for a burst particle flying in the plane that faces the shooter (across the heading and up),
 * so rings and sprays read as such from where the player stands rather than edge-on.
 * @param {number} heading - Direction the shot was travelling, radians
 * @param {number} theta - Angle within that plane: 0 is to the shooter's right, PI/2 straight up
 * @param {number} speed - World units/s
 * @returns {{vx: number, vy: number, vh: number}}
 */
function inPlane(heading, theta, speed) {
  const across = Math.cos(theta) * speed;
  return { vx: -Math.sin(heading) * across, vy: Math.cos(heading) * across, vh: Math.sin(theta) * speed };
}

/**
 * How far a styled dart's halo and motes have grown in, 0 just after launch to 1 once clear of the camera
 * @param {number} distance - Dart's distance from the player
 * @returns {number} 0 to 1
 */
export function bloom(distance) {
  const { PROJECTILE_MIN_DISTANCE } = GameConfig.RENDERING;
  return Math.min(1, Math.max(0, (distance - PROJECTILE_MIN_DISTANCE) / GameConfig.EFFECTS.BLOOM_DISTANCE));
}

/**
 * Emits the particles for a dart or beam landing on a snowman, each device in its own style:
 * the Disruptor throws sparks, the Immobilizer an expanding ring, the Pacifier drifting mist.
 * @param {string} type - A DEVICE_TYPES value (anything else gets the plain burst)
 * @param {number} x - Impact x
 * @param {number} y - Impact y
 * @param {string} color - Device colour
 * @param {Function} spawn - (x, y, color, life, size, extra) => void
 * @param {number} [heading=0] - Direction the shot was travelling, which orients rings and sprays to face the shooter
 */
export function emitHit(type, x, y, color, spawn, heading = 0) {
  const h = GameConfig.RENDERING.PROJECTILE_HEIGHT;
  const g = GameConfig.EFFECTS.GRAVITY;
  switch (type) {
    case DEVICE_TYPES.TASER:
      for (let i = 0; i < 10; i++) {
        spawn(x, y, i % 3 === 0 ? '#ffffff' : color, rand(260, 380), rand(0.018, 0.03), {
          ...inPlane(heading, rand(0, TAU), rand(0.7, 1.6)), h, gravity: g, drag: 2.5, fade: true, shape: 'star'
        });
      }
      break;
    case DEVICE_TYPES.STUN: {
      const RING = 12;
      for (let i = 0; i < RING; i++) {
        spawn(x, y, color, 620, 0.03, { ...inPlane(heading, (i / RING) * TAU, 1.1), h, drag: 3.2, fade: true, grow: 0.5 });
      }
      for (let i = 0; i < 4; i++) {
        spawn(x + rand(-0.04, 0.04), y + rand(-0.04, 0.04), '#ffffff', rand(500, 750), 0.022,
          { h, vh: rand(0.2, 0.4), fade: true, shape: 'star' });
      }
      break;
    }
    case DEVICE_TYPES.TRANQ:
      for (let i = 0; i < 7; i++) {
        const drift = inPlane(heading, rand(0, TAU), rand(0.08, 0.22));
        spawn(x, y, i % 2 ? color : GameConfig.EFFECTS.PALE_MIST, rand(750, 1000), rand(0.045, 0.065), {
          ...drift, h, vh: Math.abs(drift.vh) + rand(0.1, 0.2), drag: 1.2, grow: 2.2, fade: true
        });
      }
      for (let i = 0; i < 3; i++) {
        spawn(x + rand(-0.05, 0.05), y + rand(-0.05, 0.05), '#ffffff', rand(600, 900), 0.02,
          { h: h + rand(0, 0.1), vh: rand(0.1, 0.3), fade: true, shape: 'star' });
      }
      break;
    default:
      for (let i = 0; i < GameConfig.PARTICLES.SPAWN_COUNT_ON_HIT; i++) spawn(x, y, color, 350);
  }
}

/**
 * A pale puff that lifts and swells where a dart ended against a wall
 * @param {number} x - Fizzle x
 * @param {number} y - Fizzle y
 * @param {Function} spawn - (x, y, color, life, size, extra) => void
 */
export function emitMiss(x, y, spawn) {
  const h = GameConfig.RENDERING.PROJECTILE_HEIGHT;
  for (let i = 0; i < GameConfig.PARTICLES.SPAWN_COUNT_ON_MISS; i++) {
    spawn(x + rand(-0.05, 0.05), y + rand(-0.05, 0.05), GameConfig.COLORS.PARTICLE_MISS, 450, undefined,
      { h, vh: rand(0.1, 0.25), grow: 1.8, fade: true });
  }
}

/**
 * The few sparks at the Disruptor's muzzle when it fires (the bolt itself is drawn separately)
 * @param {number} x - Muzzle x
 * @param {number} y - Muzzle y
 * @param {string} color - Device colour
 * @param {Function} spawn - (x, y, color, life, size, extra) => void
 */
export function emitZap(x, y, color, spawn) {
  const h = GameConfig.RENDERING.PROJECTILE_HEIGHT;
  for (let i = 0; i < 4; i++) {
    const a = rand(0, TAU), speed = rand(0.3, 0.7);
    spawn(x, y, color, 200, 0.015, {
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, h, vh: rand(0, 0.5), gravity: GameConfig.EFFECTS.GRAVITY,
      drag: 2, fade: true, shape: 'star'
    });
  }
}

/**
 * Shortens a segment so it stops at the first wall along it
 * @param {Object} maze - Maze with cellAt(x, y) (1 = wall)
 * @returns {{x: number, y: number}} The last open point from (x1, y1) towards (x2, y2)
 */
export function clipToWalls(maze, x1, y1, x2, y2) {
  const STEPS = 16;
  let last = { x: x1, y: y1 };
  for (let s = 1; s <= STEPS; s++) {
    const x = x1 + (x2 - x1) * s / STEPS, y = y1 + (y2 - y1) * s / STEPS;
    if (maze.cellAt(x, y) === 1) break;
    last = { x, y };
  }
  return last;
}
