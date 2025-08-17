import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'
import { PlayerController } from '../modules/player.js'
import { EnemyController } from '../modules/enemies.js'
import { Defenses } from '../modules/defenses.js'

const dummyAudio = { beep(){} }
const dummyHud = { bars:{ taser:{style:{}}, stun:{style:{}}, tranq:{style:{}} } }

describe('Defenses', () => {
  it('apply effects and ammo resets on recharge', () => {
    const m = new Maze(15,15); m.generate()
    const p = new PlayerController(m)
    const e = new EnemyController(m, p)
    const d = new Defenses(p, e, dummyAudio, dummyHud)

    d.mode = 'taser'
    d.ammo.taser = 1
    // Place enemy close ahead
    e.entities = [{ x:p.x+1, y:p.y, state:'idle', speedMul:1 }]
    d.fire()
    expect(d.ammo.taser).toBe(0)
    expect(e.entities[0].state).not.toBe('idle')

    // Move to pad to recharge
    const pad = m.pads[0] || { x:3, y:3 }
    p.x = pad.x+0.5; p.y = pad.y+0.5
    d.update(16)
    expect(d.ammo.taser).toBe(d.ammoMax.taser)
  })
})
