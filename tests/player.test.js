import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'
import { PlayerController } from '../modules/player.js'

describe('Player collisions', () => {
  it('does not pass through walls', () => {
    const m = new Maze(9,9); m.generate()
    const p = new PlayerController(m)
    // Try to walk into a wall repeatedly
    p.a = 0; // towards +x
    for (let i=0;i<120;i++) p.update(16, m)
    // Player should still be inside walkable cell
    expect(m.cellAt(p.x, p.y)).toBe(0)
  })
})
