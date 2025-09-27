import { describe, it, expect } from 'vitest'
import { Maze } from '../modules/maze.js'
import { PlayerController } from '../modules/player.js'
import { EnemyController } from '../modules/enemies.js'
import { Defenses } from '../modules/defenses.js'

const dummyAudio = { beep(){} }
const dummyHud = { bars:{ taser:{style:{}}, stun:{style:{}}, tranq:{style:{}} } }

describe('Defenses', () => {
  it('weapons work and can be reloaded', () => {
    const m = new Maze(15,15); m.generate()
    const p = new PlayerController(m)
    const e = new EnemyController(m, p)
    const d = new Defenses(p, e, dummyAudio, dummyHud)

    // Test that weapons exist and have ammo
    expect(d.weapons.taser).toBeDefined()
    expect(d.weapons.taser.ammo).toBeGreaterThan(0)

    const initialAmmo = d.weapons.taser.ammo

    // Set some ammo and test current weapon
    d.currentWeapon = 'taser'
    d.weapons.taser.ammo = 1

    // Test that we can get ammo ratios
    const taserRatio = d.taserAmmoRatio()
    expect(taserRatio).toBeTypeOf('number')
    expect(taserRatio).toBeGreaterThanOrEqual(0)
    expect(taserRatio).toBeLessThanOrEqual(1)

    // Test weapon reset restores ammo
    d.weapons.taser.ammo = 0
    d.reset()
    expect(d.weapons.taser.ammo).toBe(d.weapons.taser.maxAmmo)
  })
})
