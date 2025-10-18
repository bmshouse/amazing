// modules/platforms/PlatformDetector.js - Device and capability detection
import { logger } from '../Logger.js';

export class PlatformDetector {
  constructor() {
    this.capabilities = this.detectCapabilities();
    this.deviceType = this.detectDeviceType();
    this.layoutMode = this.getOptimalLayout();

    // Log detection results for debugging
    logger.debug('PlatformDetector initialized:', {
      deviceType: this.deviceType,
      layoutMode: this.layoutMode,
      hasTouch: this.capabilities.hasTouch,
      maxTouchPoints: this.capabilities.maxTouchPoints,
      screenSize: `${this.capabilities.screenWidth}x${this.capabilities.screenHeight}`,
      userAgent: this.capabilities.userAgent.substring(0, 60) + '...'
    });
  }

  detectCapabilities() {
    return {
      // Touch capabilities
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      supportsPointerEvents: 'onpointerdown' in window,

      // Screen properties
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,

      // Browser features
      supportsPointerLock: 'requestPointerLock' in document.documentElement,
      supportsVibration: 'vibrate' in navigator,
      supportsOrientation: 'orientation' in window,

      // Performance indicators
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      memory: navigator.deviceMemory || 4, // Estimated GB

      // Network
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,

      // Platform strings
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor
    };
  }

  detectDeviceType() {
    const ua = navigator.userAgent;
    const capabilities = this.capabilities;

    // Mobile phone detection
    if (/iPhone|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini/i.test(ua)) {
      return 'mobile';
    }

    // Tablet detection
    if (/iPad|Android(?!.*Mobile)|Kindle|Silk|PlayBook|BB10/i.test(ua)) {
      return 'tablet';
    }

    // Desktop with touch (2-in-1 devices)
    if (capabilities.hasTouch && capabilities.maxTouchPoints > 1 &&
        !/Mobile|Tablet/i.test(ua)) {
      return 'hybrid';
    }

    // Default to desktop
    return 'desktop';
  }

  getOptimalLayout() {
    const device = this.deviceType;
    const capabilities = this.capabilities;

    // Mobile: Compact touch interface
    if (device === 'mobile') {
      return 'compact';
    }

    // Tablet: Full touch interface
    if (device === 'tablet') {
      return 'tablet';
    }

    // Hybrid: Touch + keyboard support
    if (device === 'hybrid') {
      return 'hybrid';
    }

    // Desktop: Traditional keyboard/mouse
    return 'desktop';
  }

  // Screen size categories
  getScreenCategory() {
    const width = Math.max(window.screen.width, window.screen.height);
    const height = Math.min(window.screen.width, window.screen.height);

    if (width < 768) return 'small';
    if (width < 1024) return 'medium';
    if (width < 1440) return 'large';
    return 'xlarge';
  }

  // Touch target size recommendations
  getRecommendedTouchSize() {
    const pixelRatio = this.capabilities.pixelRatio;
    const baseSize = this.deviceType === 'mobile' ? 44 : 48; // iOS/Android guidelines

    return {
      minimum: Math.round(baseSize * pixelRatio),
      recommended: Math.round((baseSize + 12) * pixelRatio),
      large: Math.round((baseSize + 24) * pixelRatio)
    };
  }

  // Performance tier detection
  getPerformanceTier() {
    const { hardwareConcurrency, memory, pixelRatio } = this.capabilities;
    const screenPixels = window.screen.width * window.screen.height * pixelRatio;

    // Low-end devices
    if (hardwareConcurrency <= 2 || memory <= 2 || screenPixels > 2073600) {
      return 'low';
    }

    // High-end devices
    if (hardwareConcurrency >= 8 && memory >= 8) {
      return 'high';
    }

    // Mid-range devices
    return 'medium';
  }

  // Battery optimization recommendations
  shouldOptimizeForBattery() {
    // Mobile and tablet devices should optimize for battery
    return this.deviceType === 'mobile' || this.deviceType === 'tablet';
  }

  // Input method preferences
  getPrimaryInputMethod() {
    if (this.deviceType === 'mobile' || this.deviceType === 'tablet') {
      return 'touch';
    }

    if (this.deviceType === 'hybrid') {
      return 'hybrid';
    }

    return 'mouse';
  }

  // Virtual control recommendations
  getVirtualControlConfig() {
    const touchSize = this.getRecommendedTouchSize();
    const screenCategory = this.getScreenCategory();

    let joystickSize = 100;
    let buttonSize = touchSize.recommended;
    let opacity = 0.7;

    // Adjust for screen size
    if (screenCategory === 'small') {
      joystickSize = 87.5;
      buttonSize = touchSize.minimum;
      opacity = 0.6;
    } else if (screenCategory === 'large' || screenCategory === 'xlarge') {
      joystickSize = 125;
      buttonSize = touchSize.large;
      opacity = 0.8;
    }

    return {
      joystick: {
        radius: joystickSize / 2,
        deadZone: 0.15,
        opacity: opacity,
        positioning: this.deviceType === 'mobile' ? 'bottom-left' : 'bottom-right'
      },
      buttons: {
        size: buttonSize,
        spacing: buttonSize * 1.2,
        opacity: opacity
      },
      layout: this.layoutMode
    };
  }

  // Accessibility features
  getAccessibilityFeatures() {
    return {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      fontSize: window.matchMedia('(prefers-font-size: large)').matches ? 'large' : 'normal'
    };
  }

  // Orientation handling
  getCurrentOrientation() {
    if (!this.capabilities.supportsOrientation) {
      return 'unknown';
    }

    const orientation = window.screen.orientation?.type ||
                       (window.orientation !== undefined ?
                        (Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait') :
                        'unknown');

    return orientation.includes('landscape') ? 'landscape' : 'portrait';
  }

  // Feature support matrix
  getFeatureSupport() {
    return {
      touchControls: this.capabilities.hasTouch,
      pointerLock: this.capabilities.supportsPointerLock,
      vibration: this.capabilities.supportsVibration,
      orientation: this.capabilities.supportsOrientation,
      highDPI: this.capabilities.pixelRatio > 1,
      multiTouch: this.capabilities.maxTouchPoints > 1,
      gamepad: 'getGamepads' in navigator
    };
  }

  // Debug information
  getDebugInfo() {
    return {
      deviceType: this.deviceType,
      layoutMode: this.layoutMode,
      screenCategory: this.getScreenCategory(),
      performanceTier: this.getPerformanceTier(),
      primaryInput: this.getPrimaryInputMethod(),
      capabilities: this.capabilities,
      featureSupport: this.getFeatureSupport(),
      accessibility: this.getAccessibilityFeatures(),
      orientation: this.getCurrentOrientation()
    };
  }

  // Event listener for orientation changes
  onOrientationChange(callback) {
    if (this.capabilities.supportsOrientation) {
      const handler = () => {
        const newOrientation = this.getCurrentOrientation();
        callback(newOrientation);
      };

      if (window.screen.orientation) {
        window.screen.orientation.addEventListener('change', handler);
      } else {
        window.addEventListener('orientationchange', handler);
      }

      return handler;
    }
    return null;
  }

  // Remove orientation listener
  removeOrientationListener(handler) {
    if (handler && this.capabilities.supportsOrientation) {
      if (window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', handler);
      } else {
        window.removeEventListener('orientationchange', handler);
      }
    }
  }
}