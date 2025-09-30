// modules/input/VirtualJoystick.js - Virtual joystick for touch movement control
export class VirtualJoystick {
  constructor(container, options = {}) {
    this.container = container;

    // Configuration
    this.radius = options.radius || 50;
    this.deadZone = options.deadZone || 0.1;
    this.sensitivity = options.sensitivity || 1.0;
    this.returnSpeed = options.returnSpeed || 0.3;

    // Visual design properties
    this.opacity = options.opacity || 0.8;
    this.baseColor = options.baseColor || 'rgba(43, 212, 197, 0.15)';
    this.knobColor = options.knobColor || 'rgba(43, 212, 197, 0.9)';
    this.positioning = options.positioning || 'bottom-right';
    this.showDirectional = options.showDirectional || true;
    this.glowEffect = options.glowEffect !== false;

    // State
    this.position = { x: 0, y: 0 };
    this.active = false;
    this.touchId = null;

    // DOM elements
    this.element = null;
    this.baseElement = null;
    this.knobElement = null;

    // Event callbacks
    this.callbacks = {
      onMove: options.onMove || null,
      onStart: options.onStart || null,
      onEnd: options.onEnd || null
    };

    this.createElements();
    this.bindEvents();
  }

  createElements() {
    // Main container
    this.element = document.createElement('div');
    this.element.className = 'virtual-joystick';
    this.element.style.cssText = `
      position: fixed;
      width: ${this.radius * 2}px;
      height: ${this.radius * 2}px;
      z-index: 1000;
      pointer-events: none;
      opacity: ${this.opacity * 0.5};
      transition: opacity 0.2s ease;
      ${this.getPositionCSS()}
    `;

    // Base (outer circle)
    this.baseElement = document.createElement('div');
    this.baseElement.className = 'virtual-joystick-base';
    this.baseElement.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${this.baseColor};
      border: 2px solid rgba(43, 212, 197, 0.4);
      position: relative;
      pointer-events: auto;
      touch-action: none;
      box-shadow: ${this.glowEffect ? '0 0 20px rgba(43, 212, 197, 0.3), inset 0 0 20px rgba(43, 212, 197, 0.1)' : 'none'};
      backdrop-filter: blur(4px);
      transition: all 0.2s ease;
    `;

    // Knob (inner circle)
    this.knobElement = document.createElement('div');
    this.knobElement.className = 'virtual-joystick-knob';
    this.knobElement.style.cssText = `
      width: ${this.radius * 0.6}px;
      height: ${this.radius * 0.6}px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${this.knobColor}, rgba(43, 212, 197, 0.7));
      border: 2px solid rgba(255, 255, 255, 0.6);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease, box-shadow 0.2s ease;
      pointer-events: none;
      box-shadow: ${this.glowEffect ? '0 0 15px rgba(43, 212, 197, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.2)'};
    `;

    // Add directional indicators if enabled
    if (this.showDirectional) {
      this.createDirectionalIndicators();
    }

    // Assemble elements
    this.baseElement.appendChild(this.knobElement);
    this.element.appendChild(this.baseElement);

    // Add to container
    if (this.container) {
      this.container.appendChild(this.element);
    } else {
      document.body.appendChild(this.element);
    }
  }

  createDirectionalIndicators() {
    const directions = [
      { name: 'up', angle: 0, symbol: '↑' },
      { name: 'right', angle: 90, symbol: '→' },
      { name: 'down', angle: 180, symbol: '↓' },
      { name: 'left', angle: 270, symbol: '←' }
    ];

    directions.forEach(dir => {
      const indicator = document.createElement('div');
      indicator.className = `joystick-indicator joystick-${dir.name}`;
      indicator.textContent = dir.symbol;
      indicator.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: rgba(43, 212, 197, 0.6);
        font-weight: bold;
        pointer-events: none;
        transition: color 0.2s ease, transform 0.2s ease;
        transform: rotate(${dir.angle}deg) translateY(-${this.radius * 0.8}px) rotate(-${dir.angle}deg);
        top: 50%;
        left: 50%;
        transform-origin: 0 0;
      `;
      this.baseElement.appendChild(indicator);
    });
  }

  getPositionCSS() {
    const margin = 20;

    switch (this.positioning) {
      case 'bottom-left':
        return `bottom: ${margin}px; left: ${margin}px;`;
      case 'bottom-right':
        return `bottom: ${margin}px; right: ${margin}px;`;
      case 'top-left':
        return `top: ${margin}px; left: ${margin}px;`;
      case 'top-right':
        return `top: ${margin}px; right: ${margin}px;`;
      case 'custom':
        return `bottom: ${margin}px; left: 50%; transform: translateX(-50%);`;
      default:
        return `bottom: ${margin}px; right: ${margin}px;`;
    }
  }

  bindEvents() {
    // Store bound functions as instance methods for proper cleanup
    this.handleTouchStartBound = (e) => this.handleTouchStart(e);
    this.handleTouchMoveBound = (e) => this.handleTouchMove(e);
    this.handleTouchEndBound = (e) => this.handleTouchEnd(e);
    this.handleMouseStartBound = (e) => this.handleMouseStart(e);
    this.handleMouseMoveBound = (e) => this.handleMouseMove(e);
    this.handleMouseEndBound = (e) => this.handleMouseEnd(e);

    // Touch events
    this.baseElement.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
    window.addEventListener('touchend', this.handleTouchEndBound, { passive: true });
    window.addEventListener('touchcancel', this.handleTouchEndBound, { passive: true });

    // Mouse events for testing on desktop
    this.baseElement.addEventListener('mousedown', this.handleMouseStartBound);
    window.addEventListener('mousemove', this.handleMouseMoveBound);
    window.addEventListener('mouseup', this.handleMouseEndBound);
  }

  handleTouchStart(e) {
    e.preventDefault();

    if (this.active) return; // Already active

    const touch = e.touches[0];
    this.touchId = touch.identifier;
    this.startInteraction(touch.clientX, touch.clientY);
  }

  handleTouchMove(e) {
    if (!this.active) return;

    e.preventDefault();

    // Find our touch
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === this.touchId) {
        this.updatePosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  handleTouchEnd(e) {
    if (!this.active) return;

    // Check if our touch ended
    let touchEnded = true;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        touchEnded = false;
        break;
      }
    }

    if (touchEnded) {
      this.endInteraction();
    }
  }

  handleMouseStart(e) {
    e.preventDefault();

    if (this.active) return;

    this.touchId = 'mouse';
    this.startInteraction(e.clientX, e.clientY);
  }

  handleMouseMove(e) {
    if (!this.active || this.touchId !== 'mouse') return;

    this.updatePosition(e.clientX, e.clientY);
  }

  handleMouseEnd(e) {
    if (!this.active || this.touchId !== 'mouse') return;

    this.endInteraction();
  }

  startInteraction(clientX, clientY) {
    this.active = true;
    this.updateVisualState();

    // Enhanced visual feedback on activation
    this.baseElement.style.transform = 'scale(1.05)';
    this.baseElement.style.boxShadow = this.glowEffect
      ? '0 0 30px rgba(43, 212, 197, 0.6), inset 0 0 20px rgba(43, 212, 197, 0.2)'
      : '0 4px 20px rgba(0, 0, 0, 0.3)';

    // Get joystick center position
    const rect = this.baseElement.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;

    this.updatePosition(clientX, clientY);

    if (this.callbacks.onStart) {
      this.callbacks.onStart();
    }
  }

  updatePosition(clientX, clientY) {
    if (!this.active) return;

    // Calculate relative position from center
    const deltaX = clientX - this.centerX;
    const deltaY = clientY - this.centerY;

    // Calculate distance from center
    const distance = Math.hypot(deltaX, deltaY);

    // Constrain to radius
    const constrainedDistance = Math.min(distance, this.radius);
    const angle = Math.atan2(deltaY, deltaX);

    // Update position
    this.position.x = Math.cos(angle) * constrainedDistance;
    this.position.y = Math.sin(angle) * constrainedDistance;

    // Update visual position
    this.updateKnobPosition();

    // Call movement callback
    if (this.callbacks.onMove) {
      const movement = this.getMovementVector();
      this.callbacks.onMove(movement.x, movement.y);
    }
  }

  endInteraction() {
    this.active = false;
    this.touchId = null;

    // Reset visual feedback
    this.baseElement.style.transform = 'scale(1)';
    this.baseElement.style.boxShadow = this.glowEffect
      ? '0 0 20px rgba(43, 212, 197, 0.3), inset 0 0 20px rgba(43, 212, 197, 0.1)'
      : 'none';

    // Animate back to center
    this.position.x = 0;
    this.position.y = 0;

    this.updateVisualState();
    this.updateKnobPosition();

    if (this.callbacks.onEnd) {
      this.callbacks.onEnd();
    }
  }

  updateKnobPosition() {
    const x = this.position.x;
    const y = this.position.y;
    const distance = Math.hypot(x, y);

    // Update knob position with enhanced visual feedback
    this.knobElement.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

    // Enhanced knob shadow based on movement intensity
    if (this.active && distance > this.deadZone * this.radius) {
      const intensity = Math.min(1, distance / this.radius);
      this.knobElement.style.boxShadow = this.glowEffect
        ? `0 0 ${15 + intensity * 10}px rgba(43, 212, 197, ${0.5 + intensity * 0.3}), inset 0 2px 4px rgba(255, 255, 255, 0.3)`
        : `0 ${2 + intensity * 4}px ${8 + intensity * 8}px rgba(0, 0, 0, ${0.2 + intensity * 0.2})`;
    }

    // Update directional indicators if enabled
    if (this.showDirectional) {
      this.updateDirectionalFeedback(x, y);
    }
  }

  updateDirectionalFeedback(x, y) {
    const distance = Math.hypot(x, y);
    const threshold = this.deadZone * this.radius;

    if (distance > threshold) {
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      const intensity = Math.min(1, distance / this.radius);

      // Highlight the dominant direction
      const directions = ['right', 'down', 'left', 'up'];
      const dominantIndex = Math.round(((angle + 360) % 360) / 90) % 4;

      directions.forEach((dir, index) => {
        const indicator = this.baseElement.querySelector(`.joystick-${dir}`);
        if (indicator) {
          if (index === dominantIndex) {
            indicator.style.color = `rgba(43, 212, 197, ${0.8 + intensity * 0.2})`;
            indicator.style.transform = indicator.style.transform.replace(/scale\([^)]*\)/, '') + ` scale(${1 + intensity * 0.2})`;
          } else {
            indicator.style.color = 'rgba(43, 212, 197, 0.4)';
            indicator.style.transform = indicator.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1)';
          }
        }
      });
    } else {
      // Reset all indicators
      ['up', 'down', 'left', 'right'].forEach(dir => {
        const indicator = this.baseElement.querySelector(`.joystick-${dir}`);
        if (indicator) {
          indicator.style.color = 'rgba(43, 212, 197, 0.6)';
          indicator.style.transform = indicator.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(1)';
        }
      });
    }
  }

  updateVisualState() {
    this.element.style.opacity = this.active ? this.opacity : this.opacity * 0.5;
  }

  // Returns normalized movement vector (-1 to 1)
  getMovementVector() {
    const distance = Math.hypot(this.position.x, this.position.y);

    // Apply dead zone
    if (distance < this.deadZone * this.radius) {
      return { x: 0, y: 0 };
    }

    // Normalize to -1 to 1 range and apply sensitivity
    const normalizedX = (this.position.x / this.radius) * this.sensitivity;
    const normalizedY = (this.position.y / this.radius) * this.sensitivity;

    return {
      x: Math.max(-1, Math.min(1, normalizedX)),
      y: Math.max(-1, Math.min(1, normalizedY))
    };
  }

  // Configuration methods
  setPosition(positioning) {
    this.positioning = positioning;
    this.element.style.cssText = this.element.style.cssText.replace(
      /(bottom|top|left|right): [^;]+;/g, ''
    ) + this.getPositionCSS();
  }

  setSensitivity(sensitivity) {
    this.sensitivity = Math.max(0.1, Math.min(3.0, sensitivity));
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0.1, Math.min(1.0, opacity));
    this.updateVisualState();
  }

  setColors(baseColor, knobColor) {
    if (baseColor) {
      this.baseColor = baseColor;
      this.baseElement.style.background = baseColor;
    }
    if (knobColor) {
      this.knobColor = knobColor;
      this.knobElement.style.background = knobColor;
    }
  }

  // Enhanced customization methods
  setTheme(theme) {
    const themes = {
      cyan: {
        baseColor: 'rgba(43, 212, 197, 0.15)',
        knobColor: 'rgba(43, 212, 197, 0.9)',
        borderColor: 'rgba(43, 212, 197, 0.4)'
      },
      purple: {
        baseColor: 'rgba(147, 51, 234, 0.15)',
        knobColor: 'rgba(147, 51, 234, 0.9)',
        borderColor: 'rgba(147, 51, 234, 0.4)'
      },
      orange: {
        baseColor: 'rgba(251, 146, 60, 0.15)',
        knobColor: 'rgba(251, 146, 60, 0.9)',
        borderColor: 'rgba(251, 146, 60, 0.4)'
      }
    };

    if (themes[theme]) {
      const colors = themes[theme];
      this.updateThemeColors(colors);
    }
  }

  updateThemeColors(colors) {
    this.baseElement.style.background = colors.baseColor;
    this.baseElement.style.borderColor = colors.borderColor;
    this.knobElement.style.background = `linear-gradient(135deg, ${colors.knobColor}, ${colors.knobColor.replace('0.9)', '0.7)')})`;

    // Update directional indicators
    if (this.showDirectional) {
      ['up', 'down', 'left', 'right'].forEach(dir => {
        const indicator = this.baseElement.querySelector(`.joystick-${dir}`);
        if (indicator) {
          indicator.style.color = colors.borderColor;
        }
      });
    }
  }

  setSize(radius) {
    this.radius = Math.max(30, Math.min(80, radius));
    this.element.style.width = `${this.radius * 2}px`;
    this.element.style.height = `${this.radius * 2}px`;
    this.knobElement.style.width = `${this.radius * 0.6}px`;
    this.knobElement.style.height = `${this.radius * 0.6}px`;
  }

  toggleDirectionalIndicators(show) {
    this.showDirectional = show;
    if (show && !this.baseElement.querySelector('.joystick-indicator')) {
      this.createDirectionalIndicators();
    } else if (!show) {
      this.baseElement.querySelectorAll('.joystick-indicator').forEach(el => el.remove());
    }
  }

  toggleGlowEffect(enabled) {
    this.glowEffect = enabled;
    if (!enabled) {
      this.baseElement.style.boxShadow = 'none';
      this.knobElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    } else {
      this.baseElement.style.boxShadow = '0 0 20px rgba(43, 212, 197, 0.3), inset 0 0 20px rgba(43, 212, 197, 0.1)';
      this.knobElement.style.boxShadow = '0 0 15px rgba(43, 212, 197, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
    }
  }

  // Show/hide methods
  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }

  // Check if joystick is currently active
  isActive() {
    return this.active;
  }

  // Get current normalized position
  getValue() {
    return this.getMovementVector();
  }

  // Cleanup
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Remove event listeners
    window.removeEventListener('touchmove', this.handleTouchMoveBound);
    window.removeEventListener('touchend', this.handleTouchEndBound);
    window.removeEventListener('touchcancel', this.handleTouchEndBound);
    window.removeEventListener('mousemove', this.handleMouseMoveBound);
    window.removeEventListener('mouseup', this.handleMouseEndBound);

    this.element = null;
    this.baseElement = null;
    this.knobElement = null;
    this.callbacks = {};
  }
}