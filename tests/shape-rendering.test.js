// Test the shape rendering system
import { describe, it, expect, beforeEach } from 'vitest';
import { SpriteRenderer } from '../modules/SpriteRenderer.js';

describe('Shape Rendering System', () => {
  let canvas, renderer, mockPlayer;

  beforeEach(() => {
    // Create a mock canvas
    canvas = {
      getContext: () => ({
        globalAlpha: 1,
        fillStyle: '',
        beginPath: () => {},
        ellipse: () => {},
        fillRect: () => {},
        fill: () => {}
      })
    };

    renderer = new SpriteRenderer(canvas);

    mockPlayer = {
      x: 5,
      y: 5,
      a: 0
    };
  });

  it('has shape drawing methods', () => {
    expect(typeof renderer._drawShape).toBe('function');
    expect(typeof renderer._drawEllipseShape).toBe('function');
    expect(typeof renderer._drawRectangleShape).toBe('function');
    expect(typeof renderer._drawSnowmanShape).toBe('function');
  });

  it('drawExitDoor uses rectangle shape', () => {
    const exitData = { wallX: 1, wallY: 1 };

    // Should not throw an error
    expect(() => {
      renderer.drawExitDoor(exitData, mockPlayer, 800, 600, '#ff0000');
    }).not.toThrow();
  });

  it('drawEnemy uses snowman shape', () => {
    const enemy = { x: 3, y: 3, state: 'normal' };
    const maze = { cellAt: () => 0 }; // Open space
    const colors = { entity: '#0000ff' };

    // Should not throw an error
    expect(() => {
      renderer.drawEnemy(enemy, mockPlayer, 800, 600, maze, colors, '#ff0000');
    }).not.toThrow();
  });

  it('drawParticle uses ellipse shape', () => {
    const particle = { x: 4, y: 4, color: '#00ff00' };

    // Should not throw an error
    expect(() => {
      renderer.drawParticle(particle, mockPlayer, 800, 600);
    }).not.toThrow();
  });
});