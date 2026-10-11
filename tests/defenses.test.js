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
    expect(d.devices[DEVICE_TYPES.TASER]).toBeDefined()
    expect(d.devices[DEVICE_TYPES.TASER].charges).toBeGreaterThan(0)

    const initialCharges = d.devices[DEVICE_TYPES.TASER].charges

    // Set some charges and test current device
    d.currentDevice = DEVICE_TYPES.TASER
    d.devices[DEVICE_TYPES.TASER].charges = 1

    // Test that we can get charge ratios
    const taserRatio = d.taserChargeRatio()
    expect(taserRatio).toBeTypeOf('number')
    expect(taserRatio).toBeGreaterThanOrEqual(0)
    expect(taserRatio).toBeLessThanOrEqual(1)

    // Test device reset restores charges
    d.devices[DEVICE_TYPES.TASER].charges = 0
    d.reset()
    expect(d.devices[DEVICE_TYPES.TASER].charges).toBe(d.devices[DEVICE_TYPES.TASER].maxCharges)
  })
})
