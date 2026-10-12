// modules/rendering/Model3DRenderer.js - WebGL-based 3D model renderer for enemies
// Uses Three.js for low-poly 3D models with LOD system and skeletal animation
import { bloom } from '../Effects.js';
import { GameConfig, ENEMY_STATES, snowmanSpheres } from '../GameConfig.js';
import { logger } from '../Logger.js';


// Which of an eye's looks a state shows
const eyeLookFor = (state) =>
  state === ENEMY_STATES.STUNNED ? 'x' : state === ENEMY_STATES.TRANQ ? 'closed' : 'open';

// Shows one look on every eye of a snowman model and hides the rest
function setEyeLook(root, look) {
  root.traverse(child => {
    if (child.name.startsWith('eye-')) child.visible = child.name === `eye-${look}`;
  });
}

/**
 * Handles rendering of 3D enemy models using WebGL/Three.js
 * Integrates with existing 2D raycasting pipeline
 */
export class Model3DRenderer {
  /**
   * Creates a new Model3DRenderer instance
   * @param {HTMLCanvasElement} canvas - WebGL canvas element
   * @param {number} width - Internal render width
   * @param {number} height - Internal render height
   */
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;

    // Three.js will be loaded asynchronously
    this.THREE = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.loader = null;

    // Model and instance management
    this.models = new Map(); // LOD level -> model
    this.enemyInstances = []; // Enemy instances drawn this frame
    this.enemyPool = new Map(); // enemy entity -> { mesh, lod, bodies, tint } kept between frames
    this.bodyMaterials = new Map(); // tint colour -> shared body material
    this.partMaterials = null; // shared coal / carrot / scarf materials (created with the first model)
    this.mixers = []; // Animation mixers
    this.projectilePool = new Map(); // projectile -> group of beads, kept while the dart is in flight
    this.projectileMaterials = new Map(); // "colour/opacity" -> shared unlit material
    this.projectileGeometry = null; // unit sphere shared by every bead

    // Performance tracking
    this.enabled = false;
    this.loadingModels = false;
    this.modelsLoaded = false;

    // LOD configuration
    this.lodDistances = GameConfig.RENDERING?.LOD_DISTANCES || [5, 10, 20];

    logger.info('Model3DRenderer created (awaiting Three.js initialization)');
  }

  /**
   * Asynchronously initialize Three.js and WebGL context
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Import Three.js from local copy
      const THREE_PATH = '../../libs/three.module.js';

      logger.info('Loading Three.js library...');
      const THREE = await import(THREE_PATH);

      // Store reference to Three.js module
      this.THREE = THREE;

      // Note: GLTFLoader requires import maps or a bundler to work properly
      // For now, we'll use procedural models only (no GLTF loading)
      // To enable GLTF: set up import maps in index.html or use a bundler
      this.loader = null;
      logger.info('Three.js loaded successfully (procedural models only)');

      // Initialize Three.js scene
      this.scene = new THREE.Scene();

      // Setup camera to match raycasting FOV
      const fov = (GameConfig.RENDERING.FOV * 180 / Math.PI); // Convert radians to degrees
      this.camera = new THREE.PerspectiveCamera(
        fov,
        this.width / this.height,
        0.1,
        GameConfig.RENDERING.MAX_RENDER_DEPTH
      );

      // Create WebGL renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true, // Transparent background to overlay on 2D canvas
        antialias: false, // Disable for performance
        powerPreference: 'high-performance',
        precision: 'lowp' // Low precision for better performance
      });

      // Set renderer size (false = don't update CSS, we handle that in main.js)
      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setClearColor(0x000000, 0); // Fully transparent

      // Enable depth testing for proper layering with raycasted walls
      this.renderer.sortObjects = true;

      // Add ambient light for basic visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
      this.scene.add(ambientLight);

      // Add directional light for depth
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
      dirLight.position.set(1, 2, 1);
      this.scene.add(dirLight);

      this.enabled = true;
      logger.info('Model3DRenderer initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize Model3DRenderer:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Load a 3D enemy model at specific LOD level
   * @param {number} lodLevel - LOD level (0 = highest detail, 3 = lowest)
   * @param {string} modelUrl - URL/path to GLTF/GLB model file
   * @returns {Promise<Object>} Loaded model
   */
  async loadEnemyModel(lodLevel, modelUrl) {
    if (!this.enabled || !this.loader) {
      throw new Error('Model3DRenderer not initialized');
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;

          // Store animations if present
          if (gltf.animations && gltf.animations.length > 0) {
            model.animations = gltf.animations;
            logger.debug(`Loaded LOD${lodLevel} with ${gltf.animations.length} animations`);
          }

          // Optimize materials for performance
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;

              // Use basic material for better performance
              if (child.material) {
                child.material.flatShading = true;
                child.material.needsUpdate = true;
              }
            }
          });

          this.models.set(`enemy_lod${lodLevel}`, model);
          logger.info(`Enemy model LOD${lodLevel} loaded successfully`);
          resolve(model);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total * 100).toFixed(1);
          logger.debug(`Loading LOD${lodLevel}: ${percent}%`);
        },
        (error) => {
          logger.error(`Failed to load enemy model LOD${lodLevel}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load all enemy model LOD levels
   * Uses procedurally generated placeholder if models not available
   * @returns {Promise<void>}
   */
  async loadAllEnemyModels() {
    if (this.modelsLoaded || this.loadingModels) {
      return;
    }

    this.loadingModels = true;
    logger.info('Loading 3D enemy models...');

    try {
      // For now, create procedural placeholder models
      // In production, replace with actual GLTF model URLs
      await this.createProceduralEnemies();

      this.modelsLoaded = true;
      this.loadingModels = false;
      logger.info('All enemy models loaded');

    } catch (error) {
      logger.error('Failed to load enemy models:', error);
      this.loadingModels = false;
      this.enabled = false;
    }
  }

  /**
   * Create simple procedural 3D enemies as placeholders
   * These are low-poly geometric shapes similar to billboard sprites
   * @private
   */
  async createProceduralEnemies() {
    // Create LOD0 - High detail (full snowman with all 3 spheres)
    const lod0 = this.createSnowmanModel(...GameConfig.RENDERING.SNOWMAN_RADII); // Bottom, middle, top radii
    this.models.set('enemy_lod0', lod0);

    // Create LOD1 - Medium detail (full snowman with all 3 spheres)
    const lod1 = this.createSnowmanModel(...GameConfig.RENDERING.SNOWMAN_RADII);
    this.models.set('enemy_lod1', lod1);

    // Create LOD2 - Low detail (simplified snowman - 2 spheres)
    const [bottom, , top] = GameConfig.RENDERING.SNOWMAN_RADII;
    const lod2 = this.createSnowmanModel(bottom, 0, top, { eyes: false }); // Bottom and top only, no eyes
    this.models.set('enemy_lod2', lod2);

    logger.info('Created procedural enemy models (3 LOD levels)');
  }

  /**
   * Create a snowman-style 3D model: 3 stacked spheres, a scarf, and a face on its +Z side.
   * The model faces +Z, so rotating it about Y turns the face. Body spheres are named 'body'
   * so instances can swap in a tint material; everything else uses shared fixed materials.
   * @param {number} bottomRadius - Radius of bottom sphere
   * @param {number} middleRadius - Radius of middle sphere (0 to leave it out)
   * @param {number} topRadius - Radius of top sphere (head)
   * @param {Object} [options]
   * @param {boolean} [options.eyes=true] - Add eyes (dropped at long range, where they are invisible)
   * @returns {THREE.Group} 3D model group
   * @private
   */
  createSnowmanModel(bottomRadius, middleRadius, topRadius, { eyes = true } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const parts = this.getPartMaterials();
    const body = this.getBodyMaterial(0xffffff);

    const addBody = (radius, y) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), body);
      mesh.name = 'body';
      mesh.position.y = y;
      group.add(mesh);
    };

    // Spheres overlap (centres closer than the sum of the radii) so they merge into one stacked body
    // instead of touching at a point. The base sits on the ground.
    const spheres = snowmanSpheres([bottomRadius, middleRadius, topRadius], GameConfig.RENDERING.SNOWMAN_STACK);
    for (const { r, y } of spheres) addBody(r, y);

    // The head rests in the top of the sphere below
    const { r: lowerRadius, y: lowerY } = spheres[spheres.length - 2];
    const { y: headY } = spheres[spheres.length - 1];
    const gap = headY - lowerY;

    // The neck is the ring where the head and the sphere below intersect
    const along = (gap * gap + lowerRadius * lowerRadius - topRadius * topRadius) / (2 * gap);
    const neckY = lowerY + along;
    const neckRadius = Math.sqrt(Math.max(lowerRadius * lowerRadius - along * along, 0));

    // Scarf: a flat ring round the neck, plus a tail hanging behind (-Z) so a back view differs from a front view
    const scarfTube = topRadius * 0.2;
    const scarfRadius = neckRadius + scarfTube * 0.6;
    const scarfGeo = new THREE.TorusGeometry(scarfRadius, scarfTube, 4, 8);
    scarfGeo.rotateX(Math.PI / 2);
    const scarf = new THREE.Mesh(scarfGeo, parts.scarf);
    scarf.position.y = neckY;
    group.add(scarf);

    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(topRadius * 0.3, topRadius * 0.9, topRadius * 0.12), parts.scarf);
    tail.position.set(scarfRadius * 0.55, neckY - topRadius * 0.15, -scarfRadius * 0.7);
    group.add(tail);

    // Carrot nose: a 5-sided cone pointing along +Z
    const noseLength = topRadius * 0.7;
    const noseGeo = new THREE.ConeGeometry(topRadius * 0.18, noseLength, 5);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, parts.carrot);
    nose.position.set(0, headY - topRadius * 0.05, topRadius * 0.8 + noseLength / 2);
    group.add(nose);

    if (eyes) {
      // Each eye holds all three looks; the state shows one: open (round), closed (flat line), dazed (X)
      const R = topRadius;
      const openGeo = new THREE.SphereGeometry(R * 0.16, 4, 3);
      const barGeo = new THREE.BoxGeometry(R * 0.34, R * 0.06, R * 0.05);
      for (const dir of [-1, 1]) {
        const eye = new THREE.Group();
        eye.position.set(dir * R * 0.38, headY + R * 0.22, R * 0.88);
        const look = (name, ...meshes) => {
          const g = new THREE.Group();
          g.name = name;
          meshes.forEach(m => g.add(m));
          eye.add(g);
        };
        const bar = (angle = 0) => {
          const m = new THREE.Mesh(barGeo, parts.coal);
          m.rotation.z = angle;
          return m;
        };
        look('eye-open', new THREE.Mesh(openGeo, parts.coal));
        look('eye-closed', bar());
        look('eye-x', bar(Math.PI / 4), bar(-Math.PI / 4));
        group.add(eye);
      }
      setEyeLook(group, 'open');
    }

    return group;
  }

  /**
   * Shared materials for the parts of a snowman that never change colour
   * @private
   */
  getPartMaterials() {
    if (!this.partMaterials) {
      const make = (color) => new this.THREE.MeshStandardMaterial({
        color, flatShading: true, roughness: 0.8, metalness: 0.2
      });
      this.partMaterials = {
        coal: make(0x1b1b1b),
        carrot: make(0xff8a1f),
        scarf: make(0xd62828)
      };
    }
    return this.partMaterials;
  }

  /**
   * One shared body material per tint colour (instances swap between these instead of cloning)
   * @param {number} hex - Tint colour
   * @private
   */
  getBodyMaterial(hex) {
    let material = this.bodyMaterials.get(hex);
    if (!material) {
      material = new this.THREE.MeshStandardMaterial({
        color: hex,
        flatShading: true, // low-poly look
        roughness: 0.8,
        metalness: 0.2
      });
      this.bodyMaterials.set(hex, material);
    }
    return material;
  }

  /**
   * Create a simple single-sphere model for lowest LOD
   * @param {number} radius - Sphere radius
   * @returns {THREE.Group} 3D model group
   * @private
   */
  createSimpleModel(radius) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const geometry = new THREE.SphereGeometry(radius, 6, 5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf0134a,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.2
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.y = radius;
    group.add(sphere);

    return group;
  }

  /**
   * Select appropriate LOD level based on distance from player
   * @param {number} distance - Distance from player to enemy
   * @returns {number} LOD level (0-3, or null for sprite fallback)
   */
  selectLOD(distance) {
    if (distance < this.lodDistances[0]) return 0; // High detail
    if (distance < this.lodDistances[1]) return 1; // Medium detail
    if (distance < this.lodDistances[2]) return 2; // Low detail
    return null; // Fall back to 2D sprite for very distant enemies
  }

  /**
   * Get color tint based on enemy state
   * @param {string} state - Enemy state ('idle', 'stunned', 'slowed', 'tranq')
   * @returns {number} Hex color value
   * @private
   */
  getStateTint(state) {
    switch (state) {
      case ENEMY_STATES.STUNNED: return 0xffd166; // Yellow
      case ENEMY_STATES.SLOWED: return 0x00d1ff;  // Cyan
      case ENEMY_STATES.TRANQ: return 0xa29bfe;   // Purple
      default: return 0xffffff;        // White (default)
    }
  }

  /**
   * Synchronize Three.js camera with raycasting player camera
   * @param {Object} player - Player object with x, y, a properties
   */
  syncCamera(player) {
    if (!this.camera) return;

    // Position camera at player location
    // Y offset of 0.5 to simulate eye height
    this.camera.position.set(player.x, GameConfig.RENDERING.EYE_HEIGHT, player.y);

    // Rotate camera to match player angle
    // player.a is in radians where 0 = right, PI/2 = down, PI = left, 3PI/2 = up
    // Three.js camera looks down -Z axis by default, rotates around Y axis
    // We need to rotate the camera to match the player's view direction
    this.camera.rotation.y = -player.a - Math.PI / 2;
    this.camera.rotation.x = 0;
    this.camera.rotation.z = 0;
  }

  /**
   * Check if there's a wall between player and enemy using raycasting
   * @param {Object} player - Player object with x, y
   * @param {Object} enemy - Enemy object with x, y
   * @param {Object} maze - Maze object with cellAt method
   * @returns {boolean} True if wall blocks line of sight
   * @private
   */
  isOccludedByWall(player, enemy, maze) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);

    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Step through the line from player to enemy
    const stepSize = 0.1;
    const steps = Math.floor(distance / stepSize);

    for (let i = 1; i < steps; i++) {
      const checkX = player.x + dirX * (i * stepSize);
      const checkY = player.y + dirY * (i * stepSize);

      // Check if this position hits a wall
      const cell = maze.cellAt(checkX, checkY);
      if (cell === 1) { // Wall
        return true; // Occluded
      }
    }

    return false; // Not occluded
  }

  /**
   * Update enemy instances based on current game state. Each enemy keeps one model between
   * frames (rebuilt only when its LOD changes); out-of-range or hidden enemies are just made invisible.
   * @param {Array} enemies - Array of enemy entities
   * @param {Object} player - Player object
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {Object} maze - Maze object for occlusion checking
   */
  updateEnemies(enemies, player, deltaTime, maze) {
    if (!this.enabled || !this.modelsLoaded) return;

    // Drop models of enemies that no longer exist (e.g. after a restart)
    const live = new Set(enemies);
    for (const [enemy, instance] of this.enemyPool) {
      if (!live.has(enemy)) {
        this.scene.remove(instance.mesh);
        this.enemyPool.delete(enemy);
      }
    }

    this.enemyInstances = [];
    this.mixers = [];
    const now = Date.now();

    enemies.forEach(enemy => {
      let instance = this.enemyPool.get(enemy);
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      const lodLevel = this.selectLOD(distance);

      // Too far (2D sprite is used instead) or hidden behind a wall
      if (lodLevel === null || (maze && this.isOccludedByWall(player, enemy, maze))) {
        if (instance) instance.mesh.visible = false;
        return;
      }

      const template = this.models.get(`enemy_lod${lodLevel}`);
      if (!template) {
        logger.warn(`Missing model for LOD${lodLevel}`);
        return;
      }

      if (!instance || instance.lod !== lodLevel) {
        if (instance) this.scene.remove(instance.mesh);
        instance = this.createInstance(template, lodLevel);
        this.enemyPool.set(enemy, instance);
        this.scene.add(instance.mesh);
      }
      instance.mesh.visible = true;

      // State-based body colour (shared materials, swapped only on change)
      const tint = this.getStateTint(enemy.state);
      if (instance.tint !== tint) {
        const material = this.getBodyMaterial(tint);
        instance.bodies.forEach(body => { body.material = material; });
        instance.tint = tint;
      }

      // Pose. The model faces +Z; world X/Z are the maze's x/y, so a heading h needs rotation.y = PI/2 - h.
      // Snowmen without a heading look at the player.
      const heading = enemy.heading ?? Math.atan2(player.y - enemy.y, player.x - enemy.x);
      const facing = Math.PI / 2 - heading;
      const mesh = instance.mesh;
      mesh.rotation.set(0, facing, 0);
      mesh.position.set(enemy.x, 0, enemy.y);

      const { SNOWMAN_SPIN_PERIOD, SNOWMAN_HOP_HEIGHT, SNOWMAN_HOP_PERIOD } = GameConfig.RENDERING;
      if (enemy.state === ENEMY_STATES.STUNNED) {
        mesh.rotation.y = (now / SNOWMAN_SPIN_PERIOD) % (Math.PI * 2);
      } else if (enemy.state === ENEMY_STATES.IDLE || !enemy.state) {
        // Gentle hop that never sinks the base below the floor
        mesh.position.y = (Math.sin(now / SNOWMAN_HOP_PERIOD) + 1) * SNOWMAN_HOP_HEIGHT;
      }

      // Eyes show the state: dazed X when stunned, closed when asleep
      const look = eyeLookFor(enemy.state);
      if (instance.eyes !== look) {
        setEyeLook(mesh, look);
        instance.eyes = look;
      }

      this.enemyInstances.push(instance);
    });
  }

  /**
   * Build a pooled instance from a LOD template. clone() shares geometry and materials,
   * so this costs a handful of small objects once, not every frame.
   * @private
   */
  createInstance(template, lodLevel) {
    const mesh = template.clone();
    const bodies = [];
    mesh.traverse(child => { if (child.name === 'body') bodies.push(child); });
    return { mesh, lod: lodLevel, bodies, tint: null, eyes: 'open' };
  }

  /**
   * Draws each in-flight projectile as a bright bead with a short fading trail behind it. They
   * live in the same scene as the snowmen, so a dart is hidden by a snowman in front of it
   * and passes visibly in front of or beside one it misses. Hidden while a wall is in the way,
   * and for its first half unit, where it would sit inside the camera's near plane.
   * @param {Array} projectiles - Live projectiles ({x, y, a, r, color}); identity is stable per dart
   * @param {Object} player - Player object
   * @param {Object} maze - Maze object for occlusion checking
   */
  updateProjectiles(projectiles, player, maze) {
    if (!this.enabled || !this.scene) return;

    const live = new Set(projectiles);
    for (const [projectile, group] of this.projectilePool) {
      if (!live.has(projectile)) {
        this.scene.remove(group);
        this.projectilePool.delete(projectile);
      }
    }

    for (const projectile of projectiles) {
      let group = this.projectilePool.get(projectile);
      if (!group) {
        group = this.createProjectileMesh(projectile);
        this.projectilePool.set(projectile, group);
        this.scene.add(group);
      }
      group.position.set(projectile.x, GameConfig.RENDERING.PROJECTILE_HEIGHT, projectile.y);
      const distance = Math.hypot(projectile.x - player.x, projectile.y - player.y);
      this.animateProjectile(group, projectile, bloom(distance));
      const farEnough = distance >= GameConfig.RENDERING.PROJECTILE_MIN_DISTANCE;
      group.visible = farEnough && !(maze && this.isOccludedByWall(player, projectile, maze));
    }
  }

  /**
   * One bead plus a trail of smaller, fainter beads laid out behind it along the (fixed) flight direction.
   * Device styles (GameConfig.EFFECTS.PROJECTILE_STYLE) add a halo, orbiting motes, a bright core or a
   * twinkling trail; the parts that move are kept in userData for animateProjectile.
   * @private
   */
  createProjectileMesh(projectile) {
    const THREE = this.THREE;
    if (!this.projectileGeometry) this.projectileGeometry = new THREE.SphereGeometry(1, 8, 6);

    const style = GameConfig.EFFECTS.PROJECTILE_STYLE[projectile.type] ?? {};
    const trail = style.trail ?? GameConfig.RENDERING.PROJECTILE_TRAIL;
    const group = new THREE.Group();
    const dirX = Math.cos(projectile.a), dirZ = Math.sin(projectile.a);
    const addBead = (color, opacity, scale, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(this.projectileGeometry, this.getProjectileMaterial(color, opacity));
      mesh.scale.setScalar(projectile.r * scale);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    // The head comes first, then the trail, then the extras
    const parts = { style, head: addBead(projectile.color, 1, 1), halo: null, core: null, motes: [] };
    trail.forEach((bead, i) => {
      const color = style.twinkle && i % 2 ? style.twinkle : projectile.color;
      addBead(color, bead.opacity, bead.scale, -dirX * bead.back, 0, -dirZ * bead.back);
    });
    if (style.halo) parts.halo = addBead(projectile.color, style.halo.opacity, style.halo.scale);
    if (style.core) parts.core = addBead(style.core.color, 1, style.core.scale);
    if (style.motes) {
      for (let i = 0; i < style.motes.count; i++) parts.motes.push(addBead('#ffffff', style.motes.opacity, style.motes.scale));
    }
    group.userData = parts;
    return group;
  }

  /**
   * Per-frame motion for styled darts: the head pulses (halo and core with it) and motes circle it,
   * both growing in with 'grown' (0-1) as the dart clears the camera
   * @private
   */
  animateProjectile(group, projectile, grown = 1) {
    const { style, head, halo, core, motes } = group.userData;
    if (!style || (!style.pulse && !motes?.length)) return;
    const seconds = performance.now() / 1000;
    const pulse = style.pulse ? 1 + style.pulse.amount * Math.sin(seconds * style.pulse.speed) : 1;
    head.scale.setScalar(projectile.r * pulse);
    if (halo) halo.scale.setScalar(projectile.r * style.halo.scale * pulse * grown);
    if (core) core.scale.setScalar(projectile.r * style.core.scale * pulse);
    if (motes?.length) {
      const { orbit, speed } = style.motes;
      // Circle in the plane across the flight line: sideways (perpendicular to heading) and up
      const sideX = -Math.sin(projectile.a), sideZ = Math.cos(projectile.a);
      motes.forEach((mote, i) => {
        const phase = seconds * speed + (i * 2 * Math.PI) / motes.length;
        const side = Math.cos(phase) * orbit * projectile.r * grown;
        mote.position.set(sideX * side, Math.sin(phase) * orbit * projectile.r * grown, sideZ * side);
        mote.scale.setScalar(projectile.r * style.motes.scale * grown);
      });
    }
  }

  /**
   * Unlit material per colour and opacity, so beads stay bright whatever the lighting
   * @private
   */
  getProjectileMaterial(color, opacity) {
    const key = `${color}/${opacity}`;
    let material = this.projectileMaterials.get(key);
    if (!material) {
      material = new this.THREE.MeshBasicMaterial({
        color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1
      });
      this.projectileMaterials.set(key, material);
    }
    return material;
  }

  /**
   * Render the 3D scene
   */
  render() {
    if (!this.enabled || !this.renderer) return;

    // Update animation mixers
    const delta = 0.016; // ~60 FPS
    this.mixers.forEach(mixer => mixer.update(delta));

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Resize renderer to match canvas dimensions
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    if (!this.enabled || !this.renderer || !this.camera) return;

    this.width = width;
    this.height = height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Don't update CSS size here, main.js handles that
    this.renderer.setSize(width, height, false);

    logger.debug(`Model3DRenderer resized to ${width}x${height}`);
  }

  /**
   * Cleanup and dispose of Three.js resources
   */
  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Dispose of all models and geometries
    this.models.forEach(model => {
      model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    this.bodyMaterials.forEach(material => material.dispose());
    this.bodyMaterials.clear();
    if (this.partMaterials) Object.values(this.partMaterials).forEach(material => material.dispose());
    this.partMaterials = null;
    this.enemyPool.clear();
    this.projectilePool.clear();
    this.projectileMaterials.forEach(material => material.dispose());
    this.projectileMaterials.clear();
    if (this.projectileGeometry) this.projectileGeometry.dispose();
    this.projectileGeometry = null;
    this.models.clear();
    this.enemyInstances = [];
    this.mixers = [];

    logger.info('Model3DRenderer destroyed');
  }

  /**
   * Get debug information about renderer state
   * @returns {Object} Debug info
   */
  getDebugInfo() {
    return {
      enabled: this.enabled,
      modelsLoaded: this.modelsLoaded,
      modelCount: this.models.size,
      activeInstances: this.enemyInstances.length,
      lodDistances: this.lodDistances
    };
  }
}
