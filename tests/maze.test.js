import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'

describe('Maze', () => {
  it('generates quickly with reachable exit', () => {
    const m = new Maze(21,21)
    m.generate()
    expect(m.exit).toBeTruthy()
    expect(m.lastGenMs).toBeLessThan(200)
    // Exit should be on a path
    expect(m.grid[m.exit.y][m.exit.x]).toBe(0)
  })
})
