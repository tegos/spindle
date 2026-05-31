import { describe, it, expect } from 'vitest'
import { wrapIndex, frameDelta } from '../src/frames'

describe('wrapIndex', () => {
  it('leaves an in-range index untouched', () => {
    expect(wrapIndex(3, 10)).toBe(3)
  })

  it('wraps past the end back to the start', () => {
    expect(wrapIndex(10, 10)).toBe(0)
    expect(wrapIndex(13, 10)).toBe(3)
  })

  it('wraps below zero around to the end', () => {
    expect(wrapIndex(-1, 10)).toBe(9)
    expect(wrapIndex(-13, 10)).toBe(7)
  })
})

describe('frameDelta', () => {
  it('is zero before a full pixel-per-frame step', () => {
    expect(frameDelta(5, 12)).toBe(0)
  })

  it('advances one frame per pxPerFrame pixels dragged', () => {
    expect(frameDelta(12, 12)).toBe(1)
    expect(frameDelta(30, 12)).toBe(2)
  })

  it('goes negative for leftward drag', () => {
    expect(frameDelta(-24, 12)).toBe(-2)
  })
})
