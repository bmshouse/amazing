# CalmMaze FPS

A browser-based 3D maze game built with vanilla JavaScript and raycasting. Navigate procedurally generated mazes using classic FPS controls while avoiding friendly creatures that apply stunning effects instead of damage.

**[🎮 Play the Live Demo](https://bmshouse.github.io/amazing/)**

![Browser Compatibility](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox%20%7C%20Safari%20%7C%20Edge-brightgreen)
![No Build Required](https://img.shields.io/badge/build-none%20required-green)
![Test Status](https://img.shields.io/badge/tests-passing-brightgreen)

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
- **Raycasting 3D Renderer** - Real-time 3D world rendering using classic raycasting techniques
- **Procedural Maze Generation** - Infinite variety using recursive backtracking algorithm
- **Optimized Performance** - Internal low-res buffer upscaled for 60 FPS on mid-range devices
- **Modular Architecture** - 17 clean ES6 modules with event-driven design

### Gameplay
- **Three Device Types** - Disruptor (short range), Immobilizer (projectile), Pacifier (precise)
- **Smart Enemy AI** - Pathfinding creatures that gently push you back when touched
- **Recharge Pads** - Blue circular stations that refill all device charges
- **Teen-Safe Design** - No violence or damage, just friendly stunning effects
- **Touch Screen Support** - Full mobile/tablet compatibility with dual joystick controls
- **Internationalization** - Multi-language support (English, Spanish, French)
- **Accessibility** - Color-blind safe palette, keyboard-only controls available

## Controls

### Desktop Controls
- **WASD / Arrow Keys** - Move around
- **Mouse** - Look around (click canvas first for pointer lock)
- **Q/E** - Turn left/right (keyboard-only alternative)
- **Shift** - Sprint/glide
- **1/2/3** - Switch between devices
- **Space / Left Click** - Activate device
- **R** - Restart current maze

### Touch Controls (Mobile/Tablet)
- **Left Joystick (Cyan)** - Move around the maze
- **Right Joystick (Orange)** - Look around/camera control
- **D/I/P Buttons** - Activate Disruptor/Immobilizer/Pacifier devices
- **Settings Icon** - Access configuration and sensitivity controls

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
- **Rendering Pipeline** split between raycasting (`RaycastRenderer.js`) and sprite rendering (`SpriteRenderer.js`)

### Performance
- Ray marching optimized for quality/performance balance
- Particle system capped at 200 particles
- Simplified billboards instead of complex 3D models
- Procedural maze generation typically completes under 200ms

## Browser Compatibility

Works in all modern browsers including Chrome, Firefox, Safari, and Edge. Requires:
- ES6 module support
- Canvas 2D rendering context
- Pointer Lock API (for mouse look)
- Performance API (for timing)

## Touch Screen Support

CalmMaze FPS features comprehensive touch screen support for mobile and tablet devices:

### Features
- **Dual Joystick System** - Separate movement (left, cyan) and look (right, orange) controls
- **Touch-Friendly Device Buttons** - Large D/I/P buttons for defense system activation
- **Responsive Design** - Mobile-optimized HUD with adaptive layouts
- **Platform Detection** - Automatic mobile/tablet detection with optimized UI
- **Configurable Sensitivity** - Customizable joystick and look sensitivity settings
- **Cross-Platform** - Works alongside desktop controls without conflicts

### Architecture
- **TouchManager** - Touch capability detection and event handling
- **VirtualJoystick** - Configurable joystick components with visual themes
- **TouchHUD** - Complete dual joystick interface integration
- **EventManager** - Unified input processing for touch and traditional inputs

### Testing
Touch support is validated through comprehensive unit tests and an interactive browser test suite (`touch-test.html`) for real device validation.

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

---

*Built with ❤️ using vanilla JavaScript and classic raycasting techniques*