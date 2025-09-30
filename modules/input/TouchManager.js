// modules/input/TouchManager.js - Touch event handling with error handling and fallbacks
import { logger } from '../Logger.js';

export class TouchManager {
  constructor() {
    this.activeTouches = new Map();
    this.touchActive = false;
    this.touchState = {
      pointers: new Map(), // Track individual touch points
      gestures: {
        lastPinchDistance: 0,
        lastTapTime: 0,
        lastTapCount: 0
      }
    };

    // Touch capabilities detection
    this.capabilities = {
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      supportsPointerEvents: 'onpointerdown' in window,
      maxTouchPoints: navigator.maxTouchPoints || 1
    };

    this.eventCallbacks = new Map();
    this.lastTouchTime = 0;
    this.touchThrottle = 16; // 60fps throttling
    this.frameId = null; // For requestAnimationFrame throttling
    this.pendingEvents = [];

    // Performance monitoring
    this.performanceMetrics = {
      eventCount: 0,
      averageLatency: 0,
      maxTouches: 0,
      lastCleanup: Date.now()
    };

    if (this.capabilities.hasTouch) {
      this.bindTouchEvents();
      this.startPerformanceMonitoring();
    }
  }

  startPerformanceMonitoring() {
    // Clean up inactive touches periodically
    setInterval(() => {
      this.cleanupInactiveTouches();
    }, 5000); // Every 5 seconds
  }

  cleanupInactiveTouches() {
    const now = Date.now();
    const timeout = 10000; // 10 second timeout

    for (const [id, touch] of this.activeTouches) {
      if (now - touch.startTime > timeout) {
        this.activeTouches.delete(id);
        logger.debug(`Cleaned up inactive touch: ${id}`);
      }
    }

    // Update performance metrics
    this.performanceMetrics.lastCleanup = now;
    this.performanceMetrics.maxTouches = Math.max(
      this.performanceMetrics.maxTouches,
      this.activeTouches.size
    );
  }

  bindTouchEvents() {
    try {
      // Use passive listeners where appropriate for better performance
      const options = { passive: false };
      const passiveOptions = { passive: true };

      // Store arrow functions as instance methods for proper cleanup
      this.handleTouchStartBound = (e) => this.handleTouchStart(e);
      this.handleTouchMoveBound = (e) => this.handleTouchMove(e);
      this.handleTouchEndBound = (e) => this.handleTouchEnd(e);
      this.handleTouchCancelBound = (e) => this.handleTouchCancel(e);

      window.addEventListener('touchstart', this.handleTouchStartBound, options);
      window.addEventListener('touchmove', this.handleTouchMoveBound, options);
      window.addEventListener('touchend', this.handleTouchEndBound, passiveOptions);
      window.addEventListener('touchcancel', this.handleTouchCancelBound, passiveOptions);
    } catch (error) {
      logger.warn('Failed to bind touch events:', error);
      this.capabilities.hasTouch = false;
    }
  }

  handleTouchStart(e) {
    try {
      // Allow normal touch behavior on UI elements like buttons, but prevent on game canvas
      const target = e.target;
      const isUIElement = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('.config-panel') ||
        target.closest('.hud-group') ||
        target.closest('.panel') ||
        target.closest('#tutorial') ||
        target.id === 'configButton' ||
        target.id === 'restartButton'
      );

      if (!isUIElement) {
        e.preventDefault(); // Prevent default touch behaviors like scrolling only on game area
      }

      this.touchActive = true;

      const now = Date.now();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        this.activeTouches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: now,
          target: touch.target
        });
      }

      this.emit('touchstart', {
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        touchCount: e.touches.length,
        originalEvent: e
      });

    } catch (error) {
      logger.warn('Touch start handling failed:', error);
      this.fallbackToMouseEvents(e);
    }
  }

  handleTouchMove(e) {
    try {
      // Enhanced performance throttling using requestAnimationFrame
      if (this.frameId) {
        return; // Skip if we already have a pending frame
      }

      // Allow normal touch behavior on UI elements like buttons, but prevent on game canvas
      const target = e.target;
      const isUIElement = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('.config-panel') ||
        target.closest('.hud-group') ||
        target.closest('.panel') ||
        target.closest('#tutorial') ||
        target.id === 'configButton' ||
        target.id === 'restartButton'
      );

      if (!isUIElement) {
        e.preventDefault(); // Prevent default touch behaviors like scrolling only on game area
      }

      // Store the event data for processing in the next frame
      this.pendingEvents.push({
        type: 'touchmove',
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        touchCount: e.touches.length,
        originalEvent: e
      });

      // Process events in the next animation frame
      this.frameId = requestAnimationFrame(() => {
        this.processPendingTouchEvents();
        this.frameId = null;
      });

    } catch (error) {
      logger.warn('Touch move handling failed:', error);
    }
  }

  processPendingTouchEvents() {
    if (this.pendingEvents.length === 0) return;

    // Process only the latest event of each type for performance
    const latestEvent = this.pendingEvents[this.pendingEvents.length - 1];

    for (let i = 0; i < latestEvent.changedTouches.length; i++) {
      const touch = latestEvent.changedTouches[i];

      if (this.activeTouches.has(touch.identifier)) {
        const storedTouch = this.activeTouches.get(touch.identifier);

        // Calculate movement delta
        const dx = touch.clientX - storedTouch.x;
        const dy = touch.clientY - storedTouch.y;

        // Update stored position
        storedTouch.x = touch.clientX;
        storedTouch.y = touch.clientY;
        storedTouch.dx = dx;
        storedTouch.dy = dy;

        this.activeTouches.set(touch.identifier, storedTouch);
      }
    }

    this.emit('touchmove', latestEvent);

    // Clear processed events
    this.pendingEvents.length = 0;
  }

  handleTouchEnd(e) {
    try {
      const now = Date.now();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (this.activeTouches.has(touch.identifier)) {
          const storedTouch = this.activeTouches.get(touch.identifier);
          const duration = now - storedTouch.startTime;
          const distance = Math.hypot(
            touch.clientX - storedTouch.startX,
            touch.clientY - storedTouch.startY
          );

          // Detect tap vs drag
          const isTap = duration < 300 && distance < 10;

          this.activeTouches.delete(touch.identifier);
        }
      }

      // Update touch active state
      this.touchActive = this.activeTouches.size > 0;

      this.emit('touchend', {
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        touchCount: e.touches.length,
        originalEvent: e
      });

    } catch (error) {
      logger.warn('Touch end handling failed:', error);
    }
  }

  handleTouchCancel(e) {
    try {
      // Clear all active touches on cancel
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        this.activeTouches.delete(touch.identifier);
      }

      this.touchActive = this.activeTouches.size > 0;

      this.emit('touchcancel', {
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        touchCount: e.touches.length,
        originalEvent: e
      });

    } catch (error) {
      logger.warn('Touch cancel handling failed:', error);
    }
  }

  // Fallback mechanism for touch event failures
  fallbackToMouseEvents(touchEvent) {
    try {
      const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
      if (touch) {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });

        this.emit('touchfallback', {
          mouseEvent,
          originalTouchEvent: touchEvent
        });
      }
    } catch (error) {
      logger.warn('Touch fallback failed:', error);
    }
  }

  // Input conflict resolution - prioritize touch when active
  resolveInputConflict(touchInput, keyboardInput) {
    return this.touchActive ? touchInput : keyboardInput;
  }

  // Event emitter methods
  on(eventType, callback) {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.eventCallbacks.has(eventType)) {
      const callbacks = this.eventCallbacks.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(eventType, data = {}) {
    if (this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in touch event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Utility methods
  getTouchCount() {
    return this.activeTouches.size;
  }

  isTouchActive() {
    return this.touchActive;
  }

  getTouchById(id) {
    return this.activeTouches.get(id);
  }

  getAllTouches() {
    return Array.from(this.activeTouches.values());
  }

  hasTouch() {
    return this.capabilities.hasTouch;
  }

  // Performance testing and monitoring
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeTouches: this.activeTouches.size,
      capabilities: this.capabilities,
      memoryUsage: this.getMemoryUsage()
    };
  }

  getMemoryUsage() {
    return {
      activeTouchesSize: this.activeTouches.size,
      eventCallbacksSize: this.eventCallbacks.size,
      pendingEventsLength: this.pendingEvents.length
    };
  }

  // Performance testing method
  runPerformanceTest(duration = 5000) {
    logger.info('Starting TouchManager performance test...');
    const startTime = performance.now();
    let eventCount = 0;

    const testHandler = () => {
      eventCount++;
    };

    // Add test listeners
    this.on('touchstart', testHandler);
    this.on('touchmove', testHandler);
    this.on('touchend', testHandler);

    return new Promise((resolve) => {
      // Simulate touch events for testing
      const simulateEvents = () => {
        if (performance.now() - startTime < duration) {
          // Simulate various touch patterns
          this.emit('touchstart', { touches: [{ identifier: 0, x: Math.random() * 100, y: Math.random() * 100 }] });
          this.emit('touchmove', { touches: [{ identifier: 0, x: Math.random() * 100, y: Math.random() * 100 }] });

          setTimeout(() => {
            this.emit('touchend', { touches: [] });
            setTimeout(simulateEvents, Math.random() * 50);
          }, Math.random() * 100);
        } else {
          // Test complete
          this.off('touchstart', testHandler);
          this.off('touchmove', testHandler);
          this.off('touchend', testHandler);

          const endTime = performance.now();
          const results = {
            duration: endTime - startTime,
            totalEvents: eventCount,
            eventsPerSecond: Math.round((eventCount / (endTime - startTime)) * 1000),
            averageLatency: (endTime - startTime) / eventCount,
            memoryUsage: this.getMemoryUsage(),
            performanceScore: this.calculatePerformanceScore(eventCount, endTime - startTime)
          };

          logger.info('TouchManager Performance Test Results:', results);
          resolve(results);
        }
      };

      simulateEvents();
    });
  }

  calculatePerformanceScore(eventCount, duration) {
    const eventsPerMs = eventCount / duration;
    const memoryEfficiency = 1 - (this.getMemoryUsage().activeTouchesSize / 100);
    const responsiveness = Math.min(1, eventsPerMs * 10);
    return Math.round((memoryEfficiency + responsiveness) * 50);
  }

  // Enhanced cleanup
  destroy() {
    // Cancel any pending animation frames
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.capabilities.hasTouch) {
      window.removeEventListener('touchstart', this.handleTouchStartBound);
      window.removeEventListener('touchmove', this.handleTouchMoveBound);
      window.removeEventListener('touchend', this.handleTouchEndBound);
      window.removeEventListener('touchcancel', this.handleTouchCancelBound);
    }

    // Clear all data structures
    this.activeTouches.clear();
    this.eventCallbacks.clear();
    this.pendingEvents.length = 0;
    this.touchActive = false;

    logger.info('TouchManager destroyed and cleaned up');
  }
}