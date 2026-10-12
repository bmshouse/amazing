import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'
import { PlayerController } from '../modules/player.js'
import { EnemyController } from '../modules/enemies.js'
import { Defenses } from '../modules/defenses.js'
import { DEVICE_TYPES } from '../modules/GameConfig.js'

const dummyAudio = { beep(){} }
const dummyHud = { bars:{ taser:{style:{}}, stun:{style:{}}, tranq:{style:{}} } }

describe('Defenses', () => {
  it('devices work and can be recharged', () => {
    const m = new Maze(15,15); m.generate()
    const p = new PlayerController(m)
    const e = new EnemyController(m, p)
    const d = new Defenses(p, e, dummyAudio, dummyHud)

    // Test that devices exist and have charges
    expect(d.devices[DEVICE_TYPES.DISRUPTOR]).toBeDefined()
    expect(d.devices[DEVICE_TYPES.DISRUPTOR].charges).toBeGreaterThan(0)

    const initialCharges = d.devices[DEVICE_TYPES.DISRUPTOR].charges

    // Set some charges and test current device
    d.currentDevice = DEVICE_TYPES.DISRUPTOR
    d.devices[DEVICE_TYPES.DISRUPTOR].charges = 1

    // Test that we can get charge ratios
    const disruptorRatio = d.disruptorChargeRatio()
    expect(disruptorRatio).toBeTypeOf('number')
    expect(disruptorRatio).toBeGreaterThanOrEqual(0)
    expect(disruptorRatio).toBeLessThanOrEqual(1)

    // Test device reset restores charges
    d.devices[DEVICE_TYPES.DISRUPTOR].charges = 0
    d.reset()
    expect(d.devices[DEVICE_TYPES.DISRUPTOR].charges).toBe(d.devices[DEVICE_TYPES.DISRUPTOR].maxCharges)
  })
})
