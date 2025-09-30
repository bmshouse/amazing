// modules/ui/TouchHUD.js - Touch-optimized HUD with virtual controls
import { VirtualJoystick } from '../input/VirtualJoystick.js';
import { PlatformDetector } from '../platforms/PlatformDetector.js';
import { TouchGestureDetector } from '../input/TouchGestureDetector.js';
import { logger } from '../Logger.js';

export class TouchHUD {
  constructor(defenses, eventManager, gameConfig) {
    this.defenses = defenses;
    this.eventManager = eventManager;
    this.gameConfig = gameConfig;
    this.platformDetector = new PlatformDetector();

    // Touch control elements
    this.movementJoystick = null;
    this.lookJoystick = null;
    this.deviceButtons = new Map();
    this.touchControlsContainer = null;

    // State
    this.visible = false;
    this.currentLayout = 'desktop';

    // Initialize gesture detector
    this.gestureDetector = null;

    // Check if we should show touch controls
    if (this.shouldShowTouchControls()) {
      this.createTouchControls();
      this.setupEventHandlers();
      this.initializeGestureDetector();
    }
  }

  shouldShowTouchControls() {
    const platform = this.platformDetector;
    return platform.deviceType === 'mobile' ||
           platform.deviceType === 'tablet' ||
           (platform.deviceType === 'hybrid' && platform.capabilities.hasTouch);
  }

  createTouchControls() {
    this.currentLayout = this.platformDetector.getOptimalLayout();
    const controlConfig = this.platformDetector.getVirtualControlConfig();

    // Create main container
    this.touchControlsContainer = document.createElement('div');
    this.touchControlsContainer.className = 'touch-controls';
    this.touchControlsContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
      display: none;
    `;

    // Initialize look state for dual joystick system
    this.initializeLookState();

    // Create dual joystick system
    this.createMovementJoystick(controlConfig);
    this.createLookJoystick(controlConfig);

    // Create device buttons
    this.createDeviceButtons(controlConfig);

    // Add to DOM
    document.body.appendChild(this.touchControlsContainer);
  }

  createTouchLookArea() {
    // Look controls are now handled by the dedicated look joystick
    // Keep minimal look state for sensitivity settings
    this.lookState = {
      sensitivity: 0.003 // Default touch look sensitivity
    };
  }

  // Note: Look control hint removed - dual joysticks are now self-explanatory

  // Note: Look hint methods removed - dual joysticks are now self-explanatory

  // Note: Old look touch handlers removed - look controls now handled by dedicated look joystick

  // Note: Old look mouse handlers removed - look controls now handled by dedicated look joystick

  // Check if touch is on virtual controls to avoid conflicts
  isTouchOnControls(touch) {
    const x = touch.clientX;
    const y = touch.clientY;

    // Check if touch is on movement joystick
    if (this.movementJoystick && this.movementJoystick.element) {
      const joystickRect = this.movementJoystick.element.getBoundingClientRect();
      if (x >= joystickRect.left && x <= joystickRect.right &&
          y >= joystickRect.top && y <= joystickRect.bottom) {
        return true;
      }
    }

    // Check if touch is on look joystick
    if (this.lookJoystick && this.lookJoystick.element) {
      const joystickRect = this.lookJoystick.element.getBoundingClientRect();
      if (x >= joystickRect.left && x <= joystickRect.right &&
          y >= joystickRect.top && y <= joystickRect.bottom) {
        return true;
      }
    }

    // Check if touch is on device buttons
    for (const [deviceId, button] of this.deviceButtons) {
      const buttonRect = button.getBoundingClientRect();
      if (x >= buttonRect.left && x <= buttonRect.right &&
          y >= buttonRect.top && y <= buttonRect.bottom) {
        return true;
      }
    }

    // Check if touch is on config button
    const configButton = document.getElementById('configButton');
    if (configButton) {
      const configRect = configButton.getBoundingClientRect();
      if (x >= configRect.left && x <= configRect.right &&
          y >= configRect.top && y <= configRect.bottom) {
        return true;
      }
    }

    // Check if touch is on config panel
    const configPanel = document.getElementById('configPanel');
    if (configPanel && configPanel.style.display !== 'none') {
      const panelRect = configPanel.getBoundingClientRect();
      if (x >= panelRect.left && x <= panelRect.right &&
          y >= panelRect.top && y <= panelRect.bottom) {
        return true;
      }
    }

    return false;
  }

  // Check if mouse is on virtual controls (for desktop testing)
  isMouseOnControls(e) {
    const touch = { clientX: e.clientX, clientY: e.clientY };
    return this.isTouchOnControls(touch);
  }

  // Initialize look sensitivity state for the look joystick
  initializeLookState() {
    this.lookState = {
      sensitivity: 0.003 // Default touch look sensitivity
    };
  }

  createMovementJoystick(config) {
    const joystickConfig = {
      ...config.joystick,
      positioning: 'bottom-left', // Position on left side
      baseColor: 'rgba(43, 212, 197, 0.15)',
      knobColor: 'rgba(43, 212, 197, 0.9)',
      onMove: (x, y) => {
        if (this.eventManager) {
          this.eventManager.setMovementJoystickInput(x, y, true);
        }
      },
      onStart: () => {
        // Movement joystick activated
      },
      onEnd: () => {
        if (this.eventManager) {
          this.eventManager.setMovementJoystickInput(0, 0, false);
        }
      }
    };

    this.movementJoystick = new VirtualJoystick(this.touchControlsContainer, joystickConfig);
  }

  createLookJoystick(config) {
    const joystickConfig = {
      ...config.joystick,
      positioning: 'bottom-right', // Position on right side
      baseColor: 'rgba(255, 165, 0, 0.15)', // Orange theme for differentiation
      knobColor: 'rgba(255, 165, 0, 0.9)',
      sensitivity: 1.5, // Higher sensitivity for look controls
      onMove: (x, y) => {
        // Convert joystick movement to look input
        if (this.eventManager && !this.eventManager.isPointerLocked()) {
          // Scale the joystick values to appropriate look sensitivity
          const lookSensitivity = this.lookState.sensitivity * 2000; // Scale factor for smooth look
          this.eventManager.inputState.touch.lookInput.dx = x * lookSensitivity;
          this.eventManager.inputState.touch.lookInput.dy = y * lookSensitivity;
        }
      },
      onStart: () => {
        // Look joystick activated
      },
      onEnd: () => {
        // Reset look input when joystick is released
        if (this.eventManager) {
          this.eventManager.inputState.touch.lookInput.dx = 0;
          this.eventManager.inputState.touch.lookInput.dy = 0;
        }
      }
    };

    this.lookJoystick = new VirtualJoystick(this.touchControlsContainer, joystickConfig);
  }

  createDeviceButtons(config) {
    const buttonSize = config.buttons.size;
    const spacing = config.buttons.spacing;
    const opacity = config.buttons.opacity;

    // Device types mapping
    const devices = [
      { id: 'taser', label: 'D', name: 'Disruptor', key: '1' },
      { id: 'stun', label: 'I', name: 'Immobilizer', key: '2' },
      { id: 'tranq', label: 'P', name: 'Pacifier', key: '3' }
    ];

    devices.forEach((device, index) => {
      const button = this.createDeviceButton(device, buttonSize, opacity, index, spacing);
      this.deviceButtons.set(device.id, button);
      // Add directly to body to avoid container layout issues in Firefox
      document.body.appendChild(button);
    });
  }

  createDeviceButton(device, size, opacity, index, spacing) {
    const button = document.createElement('div');
    button.className = `touch-device-button touch-device-${device.id}`;
    button.dataset.device = device.id;

    // Calculate horizontal positioning for smaller buttons
    // Reduce button size for horizontal layout (30% smaller than previous)
    const buttonWidth = Math.max(size * 0.49, 30); // 30% smaller, min 30px
    const buttonHeight = Math.max(size * 0.49, 30);

    // Total width should match charges display (320px)
    const totalWidth = 320;
    const buttonSpacing = 6; // Reduced spacing for smaller buttons
    const startOffset = 20; // Left margin from screen edge

    // Calculate horizontal position
    const leftOffset = startOffset + (index * (buttonWidth + buttonSpacing));

    button.style.cssText = `
      position: fixed !important;
      bottom: 140px !important;
      left: ${leftOffset}px !important;
      width: ${buttonWidth}px !important;
      height: ${buttonHeight}px !important;
      border-radius: 6px !important;
      background: rgba(255, 255, 255, ${opacity}) !important;
      border: 2px solid rgba(255, 255, 255, 0.8) !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: monospace !important;
      font-size: ${buttonWidth * 0.25}px !important;
      font-weight: bold !important;
      color: #333 !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      user-select: none !important;
      transition: all 0.2s ease !important;
      z-index: 1001 !important;
    `;

    // Button content
    const content = document.createElement('div');
    content.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: ${buttonWidth * 0.28}px; line-height: 1;">${device.label}</div>
        <div style="font-size: ${buttonWidth * 0.18}px; line-height: 1; opacity: 0.7;">${device.key}</div>
      </div>
    `;
    button.appendChild(content);

    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.activateDevice(device.id);
      this.highlightButton(button, true);
    }, { passive: false });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.highlightButton(button, false);
    }, { passive: false });

    // Mouse events for testing
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.activateDevice(device.id);
      this.highlightButton(button, true);
    });

    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.highlightButton(button, false);
    });

    return button;
  }

  highlightButton(button, active) {
    if (active) {
      button.style.background = 'rgba(255, 255, 0, 0.8)';
      button.style.transform = 'scale(1.1)';
    } else {
      button.style.background = button.style.background.replace('255, 255, 0', '255, 255, 255');
      button.style.transform = 'scale(1.0)';
    }
  }

  activateDevice(deviceId) {
    // Set the device mode
    if (this.defenses) {
      this.defenses.setMode(deviceId);

      // Activate the device
      const result = this.defenses.activate();

      // Provide haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      return result;
    }
  }

  setupEventHandlers() {
    // Listen for game state changes
    if (this.eventManager) {
      this.eventManager.on('gamestart', () => {
        this.show();
      });

      this.eventManager.on('gameend', () => {
        this.hide();
      });

      // Update button states based on current device
      this.eventManager.on('devicechange', (data) => {
        this.updateDeviceButtonStates(data.device);
      });
    }

    // Handle orientation changes
    const orientationHandler = this.platformDetector.onOrientationChange((orientation) => {
      this.handleOrientationChange(orientation);
    });

    // Store handler for cleanup
    this.orientationHandler = orientationHandler;
  }

  initializeGestureDetector() {
    if (!this.eventManager || !this.eventManager.touchManager) {
      return;
    }

    this.gestureDetector = new TouchGestureDetector(this.eventManager.touchManager);

    // Set up gesture handlers
    this.setupGestureHandlers();
  }

  setupGestureHandlers() {
    if (!this.gestureDetector) return;

    // Double-tap to activate current device
    this.gestureDetector.on('tap', (data) => {
      // Check if tap is in the main game area (not on controls)
      if (this.isInGameArea(data.x, data.y)) {
        this.handleGameAreaTap(data);
      }
    });

    // Hold gesture for device selection menu (future enhancement)
    this.gestureDetector.on('hold', (data) => {
      if (this.isInGameArea(data.x, data.y)) {
        this.handleHoldGesture(data);
      }
    });

    // Swipe gestures for quick device switching
    this.gestureDetector.on('swipe', (data) => {
      if (this.isInGameArea(data.x, data.y)) {
        this.handleSwipeGesture(data);
      }
    });

    // Pinch gesture for potential zoom/scale features
    this.gestureDetector.on('pinch', (data) => {
      this.handlePinchGesture(data);
    });
  }

  isInGameArea(x, y) {
    // Check if coordinates are in the main game viewport (not on joysticks or device buttons)
    const isOnMovementJoystick = this.movementJoystick && this.movementJoystick.element &&
                                this.isPointInElement(x, y, this.movementJoystick.element);

    const isOnLookJoystick = this.lookJoystick && this.lookJoystick.element &&
                            this.isPointInElement(x, y, this.lookJoystick.element);

    const isOnDeviceButton = Array.from(this.deviceButtons.values()).some(button =>
                             this.isPointInElement(x, y, button));

    return !isOnMovementJoystick && !isOnLookJoystick && !isOnDeviceButton;
  }

  isPointInElement(x, y, element) {
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  handleGameAreaTap(data) {
    // Activate current device on tap in game area
    if (this.defenses) {
      const result = this.defenses.activate();

      // Provide haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }

      // Visual feedback for tap
      this.showTapFeedback(data.x, data.y);
    }
  }

  handleHoldGesture(data) {
    // Future: Show device selection radial menu
    logger.debug('Hold gesture detected for device selection:', data);

    // Provide stronger haptic feedback for hold
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 25, 50]);
    }
  }

  handleSwipeGesture(data) {
    // Quick device switching with swipe gestures
    if (!this.defenses) return;

    const devices = ['taser', 'stun', 'tranq'];
    const currentIndex = devices.indexOf(this.defenses.currentDevice);

    let newIndex = currentIndex;

    switch (data.direction) {
      case 'left':
        newIndex = (currentIndex + 1) % devices.length;
        break;
      case 'right':
        newIndex = (currentIndex - 1 + devices.length) % devices.length;
        break;
      case 'up':
        // Cycle to first device
        newIndex = 0;
        break;
      case 'down':
        // Cycle to last device
        newIndex = devices.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      this.defenses.setMode(devices[newIndex]);
      this.updateDeviceButtonStates(devices[newIndex]);

      // Haptic feedback for device switch
      if ('vibrate' in navigator) {
        navigator.vibrate(40);
      }

      // Show visual feedback
      this.showSwipeFeedback(data);
    }
  }

  handlePinchGesture(data) {
    // Future: Could be used for zoom or sensitivity adjustment
    logger.debug('Pinch gesture detected:', data);
  }

  showTapFeedback(x, y) {
    // Create temporary visual feedback for tap
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      left: ${x - 15}px;
      top: ${y - 15}px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(43, 212, 197, 0.6);
      pointer-events: none;
      z-index: 2000;
      animation: tapFeedback 0.3s ease-out forwards;
    `;

    // Add CSS animation if not already present
    if (!document.getElementById('tapFeedbackStyle')) {
      const style = document.createElement('style');
      style.id = 'tapFeedbackStyle';
      style.textContent = `
        @keyframes tapFeedback {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }

  showSwipeFeedback(data) {
    // Show direction indicator for swipe
    const feedback = document.createElement('div');
    const arrow = this.getArrowForDirection(data.direction);

    feedback.style.cssText = `
      position: fixed;
      left: ${data.startX - 20}px;
      top: ${data.startY - 20}px;
      width: 40px;
      height: 40px;
      color: rgba(43, 212, 197, 0.8);
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      line-height: 40px;
      pointer-events: none;
      z-index: 2000;
      animation: swipeFeedback 0.5s ease-out forwards;
    `;

    feedback.textContent = arrow;

    // Add CSS animation if not already present
    if (!document.getElementById('swipeFeedbackStyle')) {
      const style = document.createElement('style');
      style.id = 'swipeFeedbackStyle';
      style.textContent = `
        @keyframes swipeFeedback {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 500);
  }

  getArrowForDirection(direction) {
    switch (direction) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'left': return '←';
      case 'right': return '→';
      default: return '•';
    }
  }

  updateDeviceButtonStates(currentDevice) {
    this.deviceButtons.forEach((button, deviceId) => {
      if (deviceId === currentDevice) {
        button.style.borderColor = 'rgba(255, 255, 0, 1)';
        button.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.5)';
      } else {
        button.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        button.style.boxShadow = 'none';
      }
    });
  }

  handleOrientationChange(orientation) {
    // Adjust layout based on orientation
    if (orientation === 'landscape') {
      // Optimize for landscape mode
      this.adjustForLandscape();
    } else {
      // Optimize for portrait mode
      this.adjustForPortrait();
    }
  }

  adjustForLandscape() {
    // Move controls to edges for landscape
    if (this.movementJoystick) {
      this.movementJoystick.setPosition('bottom-left');
    }
    if (this.lookJoystick) {
      this.lookJoystick.setPosition('bottom-right');
    }

    // Keep horizontal layout for landscape - position above joystick area
    this.deviceButtons.forEach((button, index) => {
      const buttonWidth = parseInt(button.style.width) || 40;
      const buttonSpacing = 6;
      const startOffset = 20;
      const leftOffset = startOffset + (index * (buttonWidth + buttonSpacing));

      button.style.left = `${leftOffset}px !important`;
      button.style.right = 'auto !important';
      button.style.bottom = '120px !important'; // Higher to avoid joystick
    });
  }

  adjustForPortrait() {
    // Move controls for portrait
    if (this.movementJoystick) {
      this.movementJoystick.setPosition('bottom-left');
    }
    if (this.lookJoystick) {
      this.lookJoystick.setPosition('bottom-right');
    }

    // Keep horizontal layout for portrait - position well above joysticks
    this.deviceButtons.forEach((button, index) => {
      const buttonWidth = parseInt(button.style.width) || 40;
      const buttonSpacing = 6;
      const startOffset = 20;
      const leftOffset = startOffset + (index * (buttonWidth + buttonSpacing));

      button.style.left = `${leftOffset}px !important`;
      button.style.right = 'auto !important';
      button.style.bottom = '160px !important'; // Even higher in portrait to avoid both joysticks
    });
  }

  // Show/hide controls
  show() {
    if (this.touchControlsContainer && this.shouldShowTouchControls()) {
      this.touchControlsContainer.style.display = 'block';
      this.visible = true;

      if (this.movementJoystick) {
        this.movementJoystick.show();
      }
      if (this.lookJoystick) {
        this.lookJoystick.show();
      }

      // Show device buttons
      this.deviceButtons.forEach(button => {
        button.style.display = 'flex';
      });
    }
  }

  hide() {
    if (this.touchControlsContainer) {
      this.touchControlsContainer.style.display = 'none';
      this.visible = false;

      if (this.movementJoystick) {
        this.movementJoystick.hide();
      }
      if (this.lookJoystick) {
        this.lookJoystick.hide();
      }

      // Hide device buttons
      this.deviceButtons.forEach(button => {
        button.style.display = 'none';
      });
    }
  }

  // Configuration methods
  setOpacity(opacity) {
    if (this.movementJoystick) {
      this.movementJoystick.setOpacity(opacity);
    }
    if (this.lookJoystick) {
      this.lookJoystick.setOpacity(opacity);
    }

    this.deviceButtons.forEach(button => {
      const currentBg = button.style.background;
      const newBg = currentBg.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
                                     `rgba($1, $2, $3, ${opacity})`);
      button.style.background = newBg;
    });
  }

  setSensitivity(sensitivity) {
    // Set movement joystick sensitivity
    if (this.movementJoystick) {
      this.movementJoystick.setSensitivity(sensitivity);
    }
  }

  // Set look joystick sensitivity
  setLookJoystickSensitivity(sensitivity) {
    if (this.lookJoystick) {
      this.lookJoystick.setSensitivity(sensitivity);
    }
  }

  // Set touch look sensitivity
  setLookSensitivity(sensitivity) {
    this.lookState.sensitivity = Math.max(0.001, Math.min(0.01, sensitivity));
  }

  // Get current touch look sensitivity
  getLookSensitivity() {
    return this.lookState.sensitivity;
  }

  // Configure all touch sensitivities
  setTouchSensitivities(joystickSensitivity, lookSensitivity) {
    this.setSensitivity(joystickSensitivity); // Movement joystick
    this.setLookJoystickSensitivity(lookSensitivity); // Look joystick
    this.setLookSensitivity(lookSensitivity); // Backup look state
  }

  // Debug info
  getDebugInfo() {
    return {
      visible: this.visible,
      layout: this.currentLayout,
      platform: this.platformDetector.getDebugInfo(),
      movementJoystickActive: this.movementJoystick?.isActive() || false,
      lookJoystickActive: this.lookJoystick?.isActive() || false,
      deviceButtonCount: this.deviceButtons.size
    };
  }

  // Cleanup
  destroy() {
    if (this.movementJoystick) {
      this.movementJoystick.destroy();
    }

    if (this.lookJoystick) {
      this.lookJoystick.destroy();
    }

    if (this.gestureDetector) {
      this.gestureDetector.destroy();
    }

    // Clean up look hint
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }

    if (this.lookHint && this.lookHint.parentNode) {
      this.lookHint.parentNode.removeChild(this.lookHint);
      this.lookHint = null;
    }

    // Clean up device buttons from body
    this.deviceButtons.forEach(button => {
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    });
    this.deviceButtons.clear();

    if (this.touchControlsContainer && this.touchControlsContainer.parentNode) {
      this.touchControlsContainer.parentNode.removeChild(this.touchControlsContainer);
    }

    if (this.orientationHandler) {
      this.platformDetector.removeOrientationListener(this.orientationHandler);
    }

    this.deviceButtons.clear();
    this.movementJoystick = null;
    this.lookJoystick = null;
    this.gestureDetector = null;
    this.touchControlsContainer = null;
    this.touchLookArea = null;
  }
}