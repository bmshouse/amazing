// modules/input/TouchGestureDetector.js - Advanced touch gesture recognition
import { logger } from '../Logger.js';

export class TouchGestureDetector {
  constructor(touchManager) {
    this.touchManager = touchManager;
    this.gestures = new Map();
    this.gestureCallbacks = new Map();

    // Gesture thresholds and timing
    this.thresholds = {
      tap: {
        maxDuration: 300,
        maxDistance: 15
      },
      hold: {
        minDuration: 500,
        maxDistance: 15
      },
      swipe: {
        minDistance: 50,
        maxDuration: 1000,
        minVelocity: 0.5
      },
      pinch: {
        minDistanceChange: 20
      }
    };

    this.setupGestureTracking();
  }

  setupGestureTracking() {
    if (!this.touchManager) return;

    // Store bound functions for proper cleanup
    this.handleTouchStartBound = (data) => this.handleTouchStart(data);
    this.handleTouchMoveBound = (data) => this.handleTouchMove(data);
    this.handleTouchEndBound = (data) => this.handleTouchEnd(data);
    this.handleTouchCancelBound = (data) => this.handleTouchCancel(data);

    this.touchManager.on('touchstart', this.handleTouchStartBound);
    this.touchManager.on('touchmove', this.handleTouchMoveBound);
    this.touchManager.on('touchend', this.handleTouchEndBound);
    this.touchManager.on('touchcancel', this.handleTouchCancelBound);
  }

  handleTouchStart(data) {
    const now = Date.now();

    // Track each touch for gesture recognition
    data.changedTouches.forEach(touch => {
      this.gestures.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: now,
        lastMoveTime: now,
        distance: 0,
        direction: null,
        velocity: 0,
        isHolding: false,
        holdTimeout: null
      });

      // Start hold gesture timer
      const gestureData = this.gestures.get(touch.identifier);
      gestureData.holdTimeout = setTimeout(() => {
        this.detectHoldGesture(touch.identifier);
      }, this.thresholds.hold.minDuration);
    });

    // Multi-touch gestures
    if (data.touches.length === 2) {
      this.initializePinchGesture(data.touches);
    }
  }

  handleTouchMove(data) {
    const now = Date.now();

    data.changedTouches.forEach(touch => {
      const gestureData = this.gestures.get(touch.identifier);
      if (!gestureData) return;

      const deltaX = touch.clientX - gestureData.currentX;
      const deltaY = touch.clientY - gestureData.currentY;
      const timeDelta = now - gestureData.lastMoveTime;

      // Update position and calculate velocity
      gestureData.currentX = touch.clientX;
      gestureData.currentY = touch.clientY;
      gestureData.lastMoveTime = now;

      if (timeDelta > 0) {
        const moveDistance = Math.hypot(deltaX, deltaY);
        gestureData.velocity = moveDistance / timeDelta;
      }

      // Calculate total distance from start
      gestureData.distance = Math.hypot(
        gestureData.currentX - gestureData.startX,
        gestureData.currentY - gestureData.startY
      );

      // Determine swipe direction
      if (gestureData.distance > this.thresholds.swipe.minDistance) {
        gestureData.direction = this.calculateDirection(
          gestureData.startX, gestureData.startY,
          gestureData.currentX, gestureData.currentY
        );
      }

      // Cancel hold gesture if moved too far
      if (gestureData.distance > this.thresholds.hold.maxDistance && gestureData.holdTimeout) {
        clearTimeout(gestureData.holdTimeout);
        gestureData.holdTimeout = null;
      }
    });

    // Update pinch gesture
    if (data.touches.length === 2) {
      this.updatePinchGesture(data.touches);
    }
  }

  handleTouchEnd(data) {
    data.changedTouches.forEach(touch => {
      const gestureData = this.gestures.get(touch.identifier);
      if (!gestureData) return;

      const duration = Date.now() - gestureData.startTime;

      // Clear hold timeout
      if (gestureData.holdTimeout) {
        clearTimeout(gestureData.holdTimeout);
      }

      // Detect gesture type
      if (!gestureData.isHolding) {
        if (this.isTapGesture(gestureData, duration)) {
          this.emitGesture('tap', {
            x: gestureData.startX,
            y: gestureData.startY,
            duration: duration,
            touchId: touch.identifier
          });
        } else if (this.isSwipeGesture(gestureData, duration)) {
          this.emitGesture('swipe', {
            startX: gestureData.startX,
            startY: gestureData.startY,
            endX: gestureData.currentX,
            endY: gestureData.currentY,
            direction: gestureData.direction,
            distance: gestureData.distance,
            velocity: gestureData.velocity,
            duration: duration,
            touchId: touch.identifier
          });
        }
      }

      // Clean up
      this.gestures.delete(touch.identifier);
    });

    // End pinch gesture
    if (data.touches.length < 2) {
      this.endPinchGesture();
    }
  }

  handleTouchCancel(data) {
    // Clean up all cancelled touches
    data.changedTouches.forEach(touch => {
      const gestureData = this.gestures.get(touch.identifier);
      if (gestureData && gestureData.holdTimeout) {
        clearTimeout(gestureData.holdTimeout);
      }
      this.gestures.delete(touch.identifier);
    });

    this.endPinchGesture();
  }

  detectHoldGesture(touchId) {
    const gestureData = this.gestures.get(touchId);
    if (!gestureData) return;

    if (gestureData.distance <= this.thresholds.hold.maxDistance) {
      gestureData.isHolding = true;
      this.emitGesture('hold', {
        x: gestureData.startX,
        y: gestureData.startY,
        duration: Date.now() - gestureData.startTime,
        touchId: touchId
      });
    }
  }

  initializePinchGesture(touches) {
    if (touches.length !== 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    this.pinchData = {
      active: true,
      startDistance: Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      ),
      currentDistance: 0,
      centerX: (touch1.clientX + touch2.clientX) / 2,
      centerY: (touch1.clientY + touch2.clientY) / 2,
      scale: 1.0
    };
  }

  updatePinchGesture(touches) {
    if (!this.pinchData || !this.pinchData.active || touches.length !== 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    this.pinchData.currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    const newCenterX = (touch1.clientX + touch2.clientX) / 2;
    const newCenterY = (touch1.clientY + touch2.clientY) / 2;

    const distanceChange = this.pinchData.currentDistance - this.pinchData.startDistance;
    const scale = this.pinchData.currentDistance / this.pinchData.startDistance;

    // Emit pinch event if significant change
    if (Math.abs(distanceChange) > this.thresholds.pinch.minDistanceChange) {
      this.emitGesture('pinch', {
        centerX: newCenterX,
        centerY: newCenterY,
        scale: scale,
        distanceChange: distanceChange,
        startDistance: this.pinchData.startDistance,
        currentDistance: this.pinchData.currentDistance
      });
    }

    this.pinchData.centerX = newCenterX;
    this.pinchData.centerY = newCenterY;
    this.pinchData.scale = scale;
  }

  endPinchGesture() {
    if (this.pinchData) {
      this.pinchData.active = false;
      this.pinchData = null;
    }
  }

  calculateDirection(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= 135 || angle < -135) return 'left';
    return 'up';
  }

  isTapGesture(gestureData, duration) {
    return duration <= this.thresholds.tap.maxDuration &&
           gestureData.distance <= this.thresholds.tap.maxDistance;
  }

  isSwipeGesture(gestureData, duration) {
    return gestureData.distance >= this.thresholds.swipe.minDistance &&
           duration <= this.thresholds.swipe.maxDuration &&
           gestureData.velocity >= this.thresholds.swipe.minVelocity;
  }

  // Event emitter for gestures
  on(gestureType, callback) {
    if (!this.gestureCallbacks.has(gestureType)) {
      this.gestureCallbacks.set(gestureType, []);
    }
    this.gestureCallbacks.get(gestureType).push(callback);
  }

  off(gestureType, callback) {
    if (this.gestureCallbacks.has(gestureType)) {
      const callbacks = this.gestureCallbacks.get(gestureType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emitGesture(gestureType, data) {
    if (this.gestureCallbacks.has(gestureType)) {
      this.gestureCallbacks.get(gestureType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in gesture callback for ${gestureType}:`, error);
        }
      });
    }
  }

  // Configuration methods
  setThreshold(gestureType, property, value) {
    if (this.thresholds[gestureType] && this.thresholds[gestureType][property] !== undefined) {
      this.thresholds[gestureType][property] = value;
    }
  }

  getThreshold(gestureType, property) {
    return this.thresholds[gestureType]?.[property];
  }

  // Cleanup
  destroy() {
    // Clear all active hold timeouts
    this.gestures.forEach(gestureData => {
      if (gestureData.holdTimeout) {
        clearTimeout(gestureData.holdTimeout);
      }
    });

    this.gestures.clear();
    this.gestureCallbacks.clear();
    this.endPinchGesture();
  }
}