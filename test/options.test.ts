import { describe, it, expect } from 'vitest'
import { resolveOptions } from '../src/options'

describe('resolveOptions', () => {
  it('applies defaults when omitted', () => {
    const o = resolveOptions({ source: ['a.jpg'] })
    expect(o.autoplay).toBe(false)
    expect(o.loop).toBe(true)
    expect(o.momentum).toBe(true)
    expect(o.zoom).toBe(true)
    expect(o.fullscreen).toBe(true)
    expect(o.pxPerFrame).toBeGreaterThan(0)
  })

  it('lets the caller override a default', () => {
    const o = resolveOptions({ source: ['a.jpg'], autoplay: true, loop: false })
    expect(o.autoplay).toBe(true)
    expect(o.loop).toBe(false)
  })

  it('keeps the source untouched', () => {
    const src = ['a.jpg', 'b.jpg']
    expect(resolveOptions({ source: src }).source).toBe(src)
  })
})
