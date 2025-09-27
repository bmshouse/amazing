// tests/setup.js - Test setup with DOM polyfills

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  };
}

// Mock requestAnimationFrame if not available
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16); // ~60fps
  };
}

// Mock document query methods if not fully available
if (typeof document !== 'undefined') {
  // Ensure getElementById returns something for our HUD elements
  const originalGetElementById = document.getElementById;
  document.getElementById = function(id) {
    const element = originalGetElementById.call(this, id);
    if (element) return element;

    // Return mock elements for HUD components
    const mockElement = {
      style: { display: '', transform: '' },
      textContent: '',
      checked: true,
      value: '0.5',
      addEventListener: () => {},
      querySelector: () => ({ textContent: '' })
    };
    return mockElement;
  };

  // Mock querySelector for HUD bars
  const originalQuerySelector = document.querySelector;
  document.querySelector = function(selector) {
    const element = originalQuerySelector.call(this, selector);
    if (element) return element;

    return {
      style: { transform: '' },
      textContent: ''
    };
  };
}

// Mock mousedown events for defenses
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // Store original addEventListener
  const originalAddEventListener = window.addEventListener;

  // Track event listeners to avoid issues in tests
  const eventListeners = new Map();

  window.addEventListener = function(event, handler, options) {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    eventListeners.get(event).push(handler);

    // Only bind for real events in browser, skip in tests
    if (typeof document !== 'undefined' && document.querySelector) {
      originalAddEventListener.call(this, event, handler, options);
    }
  };
}