import { describe, it, expect } from 'vitest'
import { decayVelocity, isResting } from '../src/momentum'

describe('decayVelocity', () => {
  it('shrinks velocity toward zero', () => {
    const v = decayVelocity(10, 0.9, 16)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(10)
  })

  it('preserves sign', () => {
    expect(decayVelocity(-10, 0.9, 16)).toBeLessThan(0)
  })

  it('decays more over a longer frame time', () => {
    const short = decayVelocity(10, 0.9, 16)
    const long = decayVelocity(10, 0.9, 32)
    expect(long).toBeLessThan(short)
  })
})

describe('isResting', () => {
  it('is true once speed drops below the threshold', () => {
    expect(isResting(0.001, 0.01)).toBe(true)
    expect(isResting(-0.001, 0.01)).toBe(true)
  })

  it('is false while still moving', () => {
    expect(isResting(0.5, 0.01)).toBe(false)
  })
})
