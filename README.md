# CalmMaze FPS

A browser-based 3D maze game built with vanilla JavaScript, raycasting, and optional WebGL rendering. Navigate procedurally generated mazes using classic FPS controls while avoiding friendly snowman creatures that gently boop you back with hearts.

**[🎮 Play the Live Demo](https://bmshouse.github.io/amazing/)**

![Browser Compatibility](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox%20%7C%20Safari%20%7C%20Edge-brightgreen)
![No Build Required](https://img.shields.io/badge/build-none%20required-green)
![Test Status](https://img.shields.io/badge/tests-90%20passing-brightgreen)
![Code Coverage](https://img.shields.io/badge/coverage-50%25-yellow)

## Quick Start

1. **Download** or clone this repository
2. **Open `index.html`** in any modern browser
3. **Click the canvas** to enter pointer lock mode
4. **Use WASD** to move and **mouse** to look around
5. **Find the green exit door** to complete the maze

No installation, build step, or server required!

## Features

### Technical Highlights
- **Pure Vanilla JavaScript** - No frameworks or dependencies for the game engine
- **Hybrid Rendering System** - Raycasting for walls + optional WebGL/Three.js for 3D enemy models
- **Toggleable 2D/3D Rendering** - Switch between 2D sprite billboards and 3D snowman models
- **LOD System** - Level-of-detail optimization with 3 LOD levels for 3D models
- **Procedural Maze Generation** - Infinite variety using recursive backtracking algorithm
- **Optimized Performance** - Internal low-res buffer upscaled for 60 FPS on mid-range devices
- **Modular Architecture** - 30+ clean ES6 modules with event-driven design
- **Comprehensive Testing** - 90 unit and integration tests with 50% code coverage

### Gameplay
- **Three Device Types** - Disruptor (short range), Immobilizer (projectile), Pacifier (precise)
- **Friendly Snowman Enemies** - White snowmen that gently boop you back with red heart particles
- **Smart Enemy AI** - Pathfinding creatures with state-based behaviors (stunned/slowed/tranquilized)
- **Recharge Pads** - Blue circular stations that refill all device charges
- **Teen-Safe Design** - No violence or damage, just friendly stunning effects and heart particles
- **Difficulty System** - Dynamic difficulty with presets (Easy/Normal/Hard/Teen-Safe) and custom configuration
- **Challenge Sharing** - Share your maze completions via URL with encoded maze data and target times
- **Touch Screen Support** - Full mobile/tablet compatibility with dual joystick controls and gesture detection
- **Internationalization** - Multi-language support (English, Spanish, French) with persistent preferences
- **Settings Persistence** - All user preferences saved to localStorage (3D rendering, audio, sensitivity)
- **Accessibility** - Color-blind safe palette, keyboard-only controls available

## Controls

### Desktop Controls
- **WASD / Arrow Keys** - Move around
- **Mouse** - Look around (click canvas first for pointer lock)
- **Q/E** - Turn left/right (keyboard-only alternative)
- **Shift** - Sprint/glide
- **1/2/3** - Switch between devices (Disruptor/Immobilizer/Pacifier)
- **Space / Left Click** - Activate device
- **R** - Restart current maze
- **Enter** - Start game / Play again after victory
- **S** - Share challenge after completing a maze
- **Escape** - Close configuration panel
- **⚙️ Settings Icon** - Access configuration panel for:
  - Difficulty presets and custom settings
  - 2D/3D rendering toggle
  - Audio enable/disable
  - Mouse sensitivity adjustment
  - Language selection (English/Spanish/French)

### Touch Controls (Mobile/Tablet)
- **Left Joystick (Cyan)** - Move around the maze
- **Right Joystick (Orange)** - Look around/camera control
- **D/I/P Buttons** - Activate Disruptor/Immobilizer/Pacifier devices
- **Swipe Left/Right** - Quick device switching
- **Tap Game Area** - Activate current device
- **⚙️ Settings Icon** - Access configuration and sensitivity controls

## Development

### Testing
```bash
npm install
npm run test
```

Unit tests cover maze generation, player mechanics, device systems, and architectural integrity using Vitest with jsdom.

### Architecture
The game uses a modular event-driven architecture with:
- **Centralized Configuration** (`GameConfig.js`) for all game constants
- **State Management** (`GameState.js`) for game lifecycle
- **Event System** (`EventManager.js`) for decoupled module communication
- **Hybrid Rendering Pipeline**:
  - `RaycastRenderer.js` - 2D raycasting for walls with textured surfaces
  - `SpriteRenderer.js` - Billboard sprite rendering for 2D entities and particles
  - `Model3DRenderer.js` - WebGL/Three.js renderer for 3D enemy models with LOD system
- **Difficulty System** (`DifficultyConfig.js`) for dynamic difficulty scaling
- **Share System** (`ShareManager.js`, `ChallengeManager.js`, `MazeEncoder.js`) for challenge sharing
- **Touch System** (`TouchManager.js`, `VirtualJoystick.js`, `TouchHUD.js`, `TouchGestureDetector.js`) for mobile controls
- **Platform Detection** (`PlatformDetector.js`) for device-specific optimizations
- **Internationalization** (`I18nManager.js`) for multi-language support
- **Settings Persistence** (localStorage) for user preferences across sessions

### Performance
- Ray marching optimized for quality/performance balance
- Particle system capped at 200 particles
- LOD system for 3D models with distance-based detail switching
- Automatic fallback to 2D sprites for distant or occluded enemies
- WebGL capability detection with graceful degradation
- Procedural maze generation typically completes under 200ms
- 60 FPS target with automatic performance monitoring

## Browser Compatibility

Works in all modern browsers including Chrome, Firefox, Safari, and Edge.

### Core Requirements
- ES6 module support
- Canvas 2D rendering context
- Pointer Lock API (for desktop mouse look)
- Performance API (for timing)
- localStorage API (for settings persistence)

### Optional Features
- **WebGL/WebGL2** - For 3D enemy models (graceful fallback to 2D sprites)
- **Touch Events API** - For mobile/tablet touch controls
- **Clipboard API** - For challenge URL copying
- **Share API** - For native mobile sharing

## Touch Screen Support

CalmMaze FPS features comprehensive touch screen support for mobile and tablet devices:

### Features
- **Dual Joystick System** - Separate movement (left, cyan) and look (right, orange) controls
- **Touch-Friendly Device Buttons** - Large D/I/P buttons for defense system activation
- **Responsive Design** - Mobile-optimized HUD with adaptive layouts
- **Platform Detection** - Automatic mobile/tablet detection with optimized UI
- **Configurable Sensitivity** - Customizable joystick and look sensitivity settings
- **Cross-Platform** - Works alongside desktop controls without conflicts

### Touch Architecture
- **TouchManager** - Touch capability detection and event handling
- **VirtualJoystick** - Configurable joystick components with visual themes
- **TouchHUD** - Complete dual joystick interface integration
- **TouchGestureDetector** - Advanced gesture recognition (swipe, tap, etc.)
- **EventManager** - Unified input processing for touch and traditional inputs

### Testing
Touch support is validated through comprehensive unit tests and interactive browser test suites:
- `touch-test.html` - Touch screen controls validation
- `dual-joystick-test.html` - Dual joystick system testing

## Internationalization (i18n)

Multi-language support with automatic language detection and seamless switching:

### Supported Languages
- **English** 🇺🇸 (Default)
- **Spanish** 🇪🇸 (Español)
- **French** 🇫🇷 (Français)

### Features
- **Automatic Language Detection** - Browser language preference detection
- **Persistent Settings** - Language preference saved locally
- **Real-Time Switching** - Change language without page reload
- **Complete Translation** - UI, game messages, and configuration text
- **RTL Support** - Ready for right-to-left languages
- **Fallback System** - Graceful fallback to English for missing translations

### Architecture
- **I18nManager** - Centralized translation management
- **JSON Translation Files** - Structured locale files in `/locales/`
- **Interpolation Support** - Dynamic text with parameter replacement
- **DOM Integration** - Automatic translation of `data-i18n` attributes
- **Format Support** - Locale-specific number and date formatting

Access language settings through the configuration panel (⚙️ gear icon).

## Difficulty System

Comprehensive difficulty configuration with dynamic presets and custom tuning:

### Difficulty Presets
- **Teen-Safe** - Minimal challenge, quick completion (5x5 maze, 0 enemies)
- **Easy** - Relaxed pace with generous resources (10x10 maze, 3 enemies)
- **Normal** - Balanced challenge for most players (15x15 maze, 5 enemies)
- **Hard** - Challenging maze with limited resources (20x20 maze, 8 enemies)
- **Custom** - Fully customizable settings for personalized difficulty

### Customizable Parameters
- **Maze Size** - From 5×5 to 50×50 cells
- **Enemy Count** - 0 to 20 friendly creatures
- **Enemy Speed** - From slow (0.5x) to insane (2.0x)
- **Time Limit** - Dynamically calculated based on maze complexity
- **Device Charges** - Adjust starting charges for each defense device
- **Recharge Pads** - Configure number of recharge stations

### Difficulty Rating
Each configuration receives a calculated difficulty rating (1-10) based on maze complexity, enemy count/speed, and available resources.

## Challenge Sharing

Share your maze completions with friends via shareable URLs:

### Features
- **URL Encoding** - Maze configuration and target time encoded in compact URLs
- **Challenge Mode** - Play shared mazes with target time to beat
- **Victory Sharing** - Share your victories when beating challenge times
- **Persistent Challenges** - Challenges work across sessions via URL parameters

### How to Share
1. Complete a maze
2. Press **S** or click the **Share Challenge** button
3. Copy the generated URL or use native sharing
4. Share with friends to challenge them to beat your time!

### Testing
Interactive test pages are included for development:
- `touch-test.html` - Touch screen controls validation
- `dual-joystick-test.html` - Dual joystick system testing
- `share-test.html` - Challenge sharing functionality testing

## Visual Design

### Enemy Design
Enemies are represented as friendly **white snowmen** with three stacked spheres:
- **2D Mode**: Billboard sprites with snowman silhouette (always faces player)
- **3D Mode**: Three.js models with LOD system (3 detail levels)
- **Boop Effect**: Red heart-shaped particles with black outline when snowmen touch the player

### Wall Textures
Three procedurally generated wall textures:
- **Stone Walls**: Gray stone texture with noise and cracks
- **Brick Walls**: Brown brick pattern with mortar
- **Exit Door**: Dark wood door with stone frame, panels, and gold handle

### Color Palette
- **Exit Door**: Glowing green (`#a8f8ab`) - always visible through walls
- **Recharge Pads**: Blue (`#2b1bbd`) with white glow effect
- **Boop Particles**: Red hearts (`#ff0000`) with black outline
- **Snowmen**: White (`#ffffff`) with state-based color tints:
  - Stunned: Yellow (`#ffd166`)
  - Slowed: Cyan (`#00d1ff`)
  - Tranquilized: Purple (`#a29bfe`)

---

*Built with ❤️ using vanilla JavaScript, raycasting, and WebGL*