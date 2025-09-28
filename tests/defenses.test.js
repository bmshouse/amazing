import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'
import { PlayerController } from '../modules/player.js'
import { EnemyController } from '../modules/enemies.js'
import { Defenses } from '../modules/defenses.js'

const dummyAudio = { beep(){} }
const dummyHud = { bars:{ taser:{style:{}}, stun:{style:{}}, tranq:{style:{}} } }

describe('Defenses', () => {
  it('devices work and can be recharged', () => {
    const m = new Maze(15,15); m.generate()
    const p = new PlayerController(m)
    const e = new EnemyController(m, p)
    const d = new Defenses(p, e, dummyAudio, dummyHud)

    // Test that devices exist and have charges
    expect(d.devices.taser).toBeDefined()
    expect(d.devices.taser.charges).toBeGreaterThan(0)

    const initialCharges = d.devices.taser.charges

    // Set some charges and test current device
    d.currentDevice = 'taser'
    d.devices.taser.charges = 1

    // Test that we can get charge ratios
    const taserRatio = d.taserChargeRatio()
    expect(taserRatio).toBeTypeOf('number')
    expect(taserRatio).toBeGreaterThanOrEqual(0)
    expect(taserRatio).toBeLessThanOrEqual(1)

    // Test device reset restores charges
    d.devices.taser.charges = 0
    d.reset()
    expect(d.devices.taser.charges).toBe(d.devices.taser.maxCharges)
  })
})
