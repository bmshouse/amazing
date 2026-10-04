// modules/rendering/Model3DRenderer.js - WebGL-based 3D model renderer for enemies
// Uses Three.js for low-poly 3D models with LOD system and skeletal animation
import { GameConfig } from '../GameConfig.js';
import { logger } from '../Logger.js';

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
    const lod0 = this.createSnowmanModel(0.15, 0.12, 0.1); // Bottom, middle, top radii
    this.models.set('enemy_lod0', lod0);

    // Create LOD1 - Medium detail (full snowman with all 3 spheres)
    const lod1 = this.createSnowmanModel(0.15, 0.12, 0.1);
    this.models.set('enemy_lod1', lod1);

    // Create LOD2 - Low detail (simplified snowman - 2 spheres)
    const lod2 = this.createSnowmanModel(0.15, 0, 0.1, { eyes: false }); // Bottom and top only, no eyes
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
    const stack = GameConfig.RENDERING.SNOWMAN_STACK;
    let lowerY = bottomRadius, lowerRadius = bottomRadius;
    addBody(bottomRadius, lowerY);

    // Middle sphere (optional for LOD)
    if (middleRadius > 0) {
      const middleY = lowerY + (lowerRadius + middleRadius) * stack;
      addBody(middleRadius, middleY);
      lowerY = middleY;
      lowerRadius = middleRadius;
    }

    // Head, resting in the top of the sphere below
    const gap = (lowerRadius + topRadius) * stack;
    const headY = lowerY + gap;
    addBody(topRadius, headY);

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
      const eyeGeo = new THREE.SphereGeometry(topRadius * 0.16, 4, 3);
      for (const dir of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, parts.coal);
        eye.position.set(dir * topRadius * 0.38, headY + topRadius * 0.22, topRadius * 0.88);
        group.add(eye);
      }
    }

    // Plain numbers the pose code needs: overall height, and the radius of the widest sphere,
    // which is how high the body axis sits when the snowman lies on its side
    group.userData.height = headY + topRadius;
    group.userData.restHeight = Math.max(bottomRadius, middleRadius, topRadius);

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
      case 'stunned': return 0xffd166; // Yellow
      case 'slowed': return 0x00d1ff;  // Cyan
      case 'tranq': return 0xa29bfe;   // Purple
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

      if (enemy.state === 'stunned') {
        // Spinning animation for stunned enemies
        mesh.rotation.y = (now / 500) % (Math.PI * 2);
      } else if (enemy.state === 'tranq') {
        // Asleep on its back: tipped so the face points up and the head lies behind it. The body axis
        // rests at the widest sphere's radius, so it touches the floor instead of hovering, and the
        // body is centred on the enemy's spot (the model pivots at its base).
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = instance.restHeight;
        mesh.position.x += Math.cos(heading) * instance.height / 2;
        mesh.position.z += Math.sin(heading) * instance.height / 2;
      } else if (enemy.state === 'idle' || !enemy.state) {
        // Gentle hop that never sinks the base below the floor
        mesh.position.y = (Math.sin(now / 500) + 1) * 0.025;
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
    // Yaw is applied after the tip-over, so a fallen snowman lies along its own heading
    mesh.rotation.order = 'YXZ';
    const bodies = [];
    mesh.traverse(child => { if (child.name === 'body') bodies.push(child); });
    const { height, restHeight } = template.userData;
    return { mesh, lod: lodLevel, bodies, tint: null, height, restHeight };
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
