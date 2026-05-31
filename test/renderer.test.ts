import { describe, it, expect } from 'vitest'
import { clampPan } from '../src/renderer'

describe('clampPan', () => {
  it('pins pan to zero when not zoomed in', () => {
    const t = clampPan({ zoom: 1, panX: 50, panY: 50 }, 800, 600)
    expect(t.panX).toBe(0)
    expect(t.panY).toBe(0)
  })

  it('allows pan up to half the overflow when zoomed', () => {
    // zoom 2 over an 800px canvas: overflow 800, half = 400.
    expect(clampPan({ zoom: 2, panX: 999, panY: 0 }, 800, 600).panX).toBe(400)
    expect(clampPan({ zoom: 2, panX: -999, panY: 0 }, 800, 600).panX).toBe(-400)
  })

  it('leaves an in-range pan untouched', () => {
    expect(clampPan({ zoom: 2, panX: 100, panY: 20 }, 800, 600).panX).toBe(100)
  })
})
