// tests/model3d-snowman.test.js - procedural 3D snowman: face, pooling, facing and tint
import { describe, it, expect, beforeEach } from 'vitest';
import { Model3DRenderer } from '../modules/rendering/Model3DRenderer.js';
import * as THREE from '../libs/three.module.js';

// A renderer wired up with Three.js objects only (no WebGL context needed)
const makeRenderer = async () => {
  const r = new Model3DRenderer({}, 640, 360);
  r.THREE = THREE;
  r.scene = new THREE.Scene();
  r.enabled = true;
  await r.createProceduralEnemies();
  r.modelsLoaded = true;
  return r;
};

const player = { x: 0, y: 0, a: 0 };
const makeEnemy = (x, y, extra = {}) => ({ x, y, heading: 0, state: 'idle', ...extra });

describe('3D snowman model', () => {
  let r;
  beforeEach(async () => { r = await makeRenderer(); });

  it('builds a full-detail snowman with scarf, nose and two eyes', () => {
    const lod0 = r.models.get('enemy_lod0');
    // 3 body spheres + scarf ring + scarf tail + nose + 2 eyes
    expect(lod0.children).toHaveLength(8);
    expect(lod0.children.filter(c => c.name === 'body')).toHaveLength(3);
  });

  it('drops the middle sphere and the eyes at the lowest LOD but keeps scarf and nose', () => {
    const lod2 = r.models.get('enemy_lod2');
    expect(lod2.children).toHaveLength(5); // 2 body + scarf ring + tail + nose
    expect(lod2.children.filter(c => c.name === 'body')).toHaveLength(2);
  });

  it('puts the nose on the +Z side, in front of the head', () => {
    const lod0 = r.models.get('enemy_lod0');
    const head = lod0.children.filter(c => c.name === 'body')[2];
    const nose = lod0.children.find(c => c.geometry?.type === 'ConeGeometry');
    expect(nose.position.z).toBeGreaterThan(0);
    expect(nose.position.z).toBeGreaterThan(head.geometry.parameters.radius * 0.8);
  });

  it('turns the face to the enemy heading', () => {
    for (const heading of [0, 1, Math.PI / 2, 2.5, Math.PI, -1.3]) {
      const enemy = makeEnemy(2, 0, { heading });
      r.updateEnemies([enemy], player, 0, null);
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(r.enemyPool.get(enemy).mesh.rotation);
      expect(forward.x).toBeCloseTo(Math.cos(heading));
      expect(forward.z).toBeCloseTo(Math.sin(heading));
      r.enemyPool.clear();
    }
  });

  it('looks at the player when an enemy has no heading', () => {
    const enemy = { x: 2, y: 0, state: 'idle' };
    r.updateEnemies([enemy], player, 0, null);
    const forward = new THREE.Vector3(0, 0, 1).applyEuler(r.enemyPool.get(enemy).mesh.rotation);
    expect(forward.x).toBeCloseTo(-1); // toward the player at the origin
    expect(forward.z).toBeCloseTo(0);
  });

  it('reuses one mesh per enemy across frames instead of rebuilding it', () => {
    const enemy = makeEnemy(2, 0);
    r.updateEnemies([enemy], player, 0, null);
    const mesh = r.enemyPool.get(enemy).mesh;
    const children = r.scene.children.length;

    for (let i = 0; i < 5; i++) r.updateEnemies([enemy], player, 0, null);
    expect(r.enemyPool.get(enemy).mesh).toBe(mesh);
    expect(r.scene.children).toHaveLength(children);
  });

  it('shares one body material between enemies in the same state and swaps it on a state change', () => {
    const a = makeEnemy(2, 0), b = makeEnemy(2, 1);
    r.updateEnemies([a, b], player, 0, null);
    const bodyA = r.enemyPool.get(a).bodies[0], bodyB = r.enemyPool.get(b).bodies[0];
    expect(bodyA.material).toBe(bodyB.material);

    a.state = 'slowed';
    r.updateEnemies([a, b], player, 0, null);
    expect(bodyA.material).not.toBe(bodyB.material);
    expect(bodyA.material.color.getHex()).toBe(0x00d1ff);
  });

  it('hides out-of-range enemies and shows them again when they come back', () => {
    const enemy = makeEnemy(2, 0);
    r.updateEnemies([enemy], player, 0, null);
    const instance = r.enemyPool.get(enemy);
    expect(instance.mesh.visible).toBe(true);

    enemy.x = 40; // beyond the last LOD distance: drawn as a 2D sprite instead
    r.updateEnemies([enemy], player, 0, null);
    expect(instance.mesh.visible).toBe(false);
    expect(r.enemyInstances).toHaveLength(0);

    enemy.x = 2;
    r.updateEnemies([enemy], player, 0, null);
    expect(r.enemyPool.get(enemy)).toBe(instance);
    expect(instance.mesh.visible).toBe(true);
  });

  it('rebuilds the model only when the level of detail changes', () => {
    const enemy = makeEnemy(2, 0);
    r.updateEnemies([enemy], player, 0, null);
    const near = r.enemyPool.get(enemy);

    enemy.x = 15; // LOD 2
    r.updateEnemies([enemy], player, 0, null);
    const far = r.enemyPool.get(enemy);
    expect(far).not.toBe(near);
    expect(far.lod).toBe(2);
    expect(r.scene.children).not.toContain(near.mesh);
    expect(r.scene.children).toContain(far.mesh);
  });

  it('removes models of enemies that no longer exist', () => {
    const a = makeEnemy(2, 0), b = makeEnemy(2, 1);
    r.updateEnemies([a, b], player, 0, null);
    const meshB = r.enemyPool.get(b).mesh;

    r.updateEnemies([a], player, 0, null);
    expect(r.enemyPool.has(b)).toBe(false);
    expect(r.scene.children).not.toContain(meshB);
  });

  it('never sinks an idle snowman below the floor', () => {
    const enemy = makeEnemy(2, 0);
    const realNow = Date.now;
    try {
      for (let t = 0; t < 4000; t += 100) {
        Date.now = () => t;
        r.updateEnemies([enemy], player, 0, null);
        expect(r.enemyPool.get(enemy).mesh.position.y).toBeGreaterThanOrEqual(0);
      }
    } finally {
      Date.now = realNow;
    }
  });

  it('tips a tranquilized snowman onto its back and resets the pose when it wakes', () => {
    const enemy = makeEnemy(2, 0, { state: 'tranq' });
    r.updateEnemies([enemy], player, 0, null);
    const mesh = r.enemyPool.get(enemy).mesh;
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2);

    enemy.state = 'idle';
    r.updateEnemies([enemy], player, 0, null);
    expect(mesh.rotation.x).toBe(0);
  });

  describe('standing on the floor', () => {
    const bounds = (mesh) => {
      mesh.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(mesh);
    };

    it('rests a tranquilized snowman on the floor instead of hovering', () => {
      for (const heading of [0, 1, Math.PI / 2, 3, -2]) {
        const enemy = makeEnemy(2, 1, { state: 'tranq', heading });
        r.updateEnemies([enemy], player, 0, null);
        const box = bounds(r.enemyPool.get(enemy).mesh);
        expect(box.min.y).toBeGreaterThan(-0.02); // not sunk into the floor
        expect(box.min.y).toBeLessThan(0.03);     // and not floating above it
        r.enemyPool.clear();
      }
    });

    it('lies along its heading, centred on the enemy position', () => {
      const enemy = makeEnemy(2, 1, { state: 'tranq', heading: 0 });
      r.updateEnemies([enemy], player, 0, null);
      const box = bounds(r.enemyPool.get(enemy).mesh);
      const center = box.getCenter(new THREE.Vector3());
      expect(center.x).toBeCloseTo(2, 1);
      expect(center.z).toBeCloseTo(1, 1);
      expect(box.max.x - box.min.x).toBeGreaterThan(box.max.z - box.min.z); // long axis is along x
    });

    it('keeps an upright snowman on the floor too', () => {
      const enemy = makeEnemy(2, 0, { state: 'slowed' });
      r.updateEnemies([enemy], player, 0, null);
      const box = bounds(r.enemyPool.get(enemy).mesh);
      expect(box.min.y).toBeGreaterThan(-0.001);
      expect(box.min.y).toBeLessThan(0.06);
    });
  });
});
