import { resolveOptions } from './options'
import { wrapIndex } from './frames'
import { FrameStore } from './loader'
import { Renderer, IDENTITY, clampPan, type ViewTransform } from './renderer'
import { decayVelocity, isResting } from './momentum'
import type { SpindleOptions, ResolvedOptions } from './types'

const FRICTION = 0.94
const REST_SPEED = 0.0002 // frames per ms
const DBLTAP_MS = 300

function resolveElement(target: string | HTMLElement): HTMLElement {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) throw new Error(`spindle: element not found for ${String(target)}`)
  return el as HTMLElement
}

interface Pointer {
  x: number
  y: number
}

export class Spindle {
  readonly el: HTMLElement
  private readonly opts: ResolvedOptions
  private readonly store: FrameStore
  private readonly renderer: Renderer
  private readonly root: HTMLElement
  private fsBtn?: HTMLButtonElement

  /** Current frame as a float; the rendered frame is the rounded, wrapped value. */
  private frameF = 0
  private view: ViewTransform = { ...IDENTITY }
  private ready = false

  // Interaction state.
  private readonly pointers = new Map<number, Pointer>()
  private lastX = 0
  private lastY = 0
  private lastMoveTs = 0
  private velocity = 0 // frames per ms, signed
  private pinchDist = 0
  private lastTapTs = 0

  // Loop bookkeeping.
  private raf = 0
  private lastTick = 0
  private autoplaying = false
  private momentumActive = false
  private destroyed = false

  constructor(target: string | HTMLElement, options: SpindleOptions) {
    this.el = resolveElement(target)
    this.opts = resolveOptions(options)
    this.store = new FrameStore(this.opts.source)

    this.root = document.createElement('div')
    this.root.className = 'spindle'
    Object.assign(this.root.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      touchAction: 'none',
      overflow: 'hidden',
      cursor: 'grab',
    })

    const canvas = document.createElement('canvas')
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' })
    this.root.appendChild(canvas)
    this.el.appendChild(this.root)
    this.renderer = new Renderer(canvas)

    if (this.opts.fullscreen) this.mountFullscreenButton()
    this.bindEvents()

    this.store
      .load(
        () => this.onFirstFrame(),
        (p) => this.opts.onProgress(p),
        () => this.opts.onReady(),
      )
      .catch((err) => console.error(err))
  }

  // ---- public API ---------------------------------------------------------

  /** Jump to a frame index (wrapped when loop is on, else clamped). */
  goto(index: number): void {
    this.frameF = this.opts.loop
      ? wrapIndex(index, this.store.count)
      : Math.min(this.store.count - 1, Math.max(0, index))
    this.render()
  }

  get frame(): number {
    return wrapIndex(Math.round(this.frameF), this.store.count)
  }

  get length(): number {
    return this.store.count
  }

  /** Start autoplay (cancels on the next pointer grab). */
  play(): void {
    if (this.autoplaying) return
    this.momentumActive = false
    this.autoplaying = true
    this.ensureLoop()
  }

  /** Stop autoplay and momentum. */
  stop(): void {
    this.autoplaying = false
    this.momentumActive = false
  }

  /** Toggle browser fullscreen on the viewer. */
  fullscreen(): void {
    if (document.fullscreenElement) document.exitFullscreen()
    else this.root.requestFullscreen?.()
  }

  /** Reset zoom and pan to the fit view. */
  resetZoom(): void {
    this.view = { ...IDENTITY }
    this.render()
  }

  destroy(): void {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.root.remove()
    this.pointers.clear()
  }

  // ---- loading ------------------------------------------------------------

  private onFirstFrame(): void {
    this.ready = true
    this.renderer.resize()
    this.render()
    if (this.opts.autoplay) this.play()
  }

  // ---- events -------------------------------------------------------------

  private bindEvents(): void {
    const r = this.root
    r.addEventListener('pointerdown', this.onPointerDown)
    r.addEventListener('pointermove', this.onPointerMove)
    r.addEventListener('pointerup', this.onPointerUp)
    r.addEventListener('pointercancel', this.onPointerUp)
    if (this.opts.zoom) r.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('resize', this.onResize)
  }

  private onResize = (): void => {
    if (this.renderer.resize()) this.render()
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.root.setPointerCapture(e.pointerId)
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // Any grab cancels autoplay and momentum.
    this.autoplaying = false
    this.momentumActive = false
    this.velocity = 0
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.lastMoveTs = e.timeStamp
    this.root.style.cursor = 'grabbing'

    if (this.pointers.size === 2) this.pinchDist = this.pointerSpread()

    // Double-tap to toggle zoom.
    if (this.opts.zoom && e.timeStamp - this.lastTapTs < DBLTAP_MS) {
      this.toggleZoom(e)
      this.lastTapTs = 0
    } else {
      this.lastTapTs = e.timeStamp
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    const p = this.pointers.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY

    if (this.pointers.size >= 2) {
      this.handlePinch()
      return
    }

    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY

    if (this.view.zoom > 1) {
      // Pan within the zoomed frame.
      this.view = clampPan(
        { zoom: this.view.zoom, panX: this.view.panX + dx, panY: this.view.panY + dy },
        this.root.clientWidth,
        this.root.clientHeight,
      )
    } else {
      // Spin. Dragging right advances the orbit forward.
      const dFrame = dx / this.opts.pxPerFrame
      this.frameF += dFrame
      const dt = Math.max(1, e.timeStamp - this.lastMoveTs)
      this.velocity = dFrame / dt
    }

    this.lastX = e.clientX
    this.lastY = e.clientY
    this.lastMoveTs = e.timeStamp
    this.render()
  }

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId)
    if (this.pointers.size < 2) this.pinchDist = 0
    if (this.pointers.size > 0) return

    this.root.style.cursor = 'grab'
    if (this.opts.momentum && this.view.zoom <= 1 && !isResting(this.velocity, REST_SPEED)) {
      this.momentumActive = true
      this.ensureLoop()
    }
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    this.applyZoom(this.view.zoom * factor, e)
  }

  // ---- zoom helpers -------------------------------------------------------

  private pointerSpread(): number {
    const pts = [...this.pointers.values()]
    if (pts.length < 2) return 0
    return Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
  }

  private handlePinch(): void {
    const dist = this.pointerSpread()
    if (this.pinchDist > 0 && dist > 0) {
      this.applyZoom(this.view.zoom * (dist / this.pinchDist))
    }
    this.pinchDist = dist
  }

  private toggleZoom(e: PointerEvent): void {
    if (this.view.zoom > 1) this.resetZoom()
    else this.applyZoom(2, e)
  }

  private applyZoom(target: number, at?: { clientX: number; clientY: number }): void {
    const zoom = Math.min(this.opts.maxZoom, Math.max(1, target))
    let panX = this.view.panX
    let panY = this.view.panY
    if (at && zoom !== this.view.zoom) {
      // Keep the cursor point stable as we scale.
      const rect = this.root.getBoundingClientRect()
      const cx = at.clientX - rect.left - rect.width / 2
      const cy = at.clientY - rect.top - rect.height / 2
      const ratio = zoom / this.view.zoom
      panX = (panX - cx) * ratio + cx
      panY = (panY - cy) * ratio + cy
    }
    if (zoom === 1) {
      panX = 0
      panY = 0
    }
    this.view = clampPan({ zoom, panX, panY }, this.root.clientWidth, this.root.clientHeight)
    this.render()
  }

  private mountFullscreenButton(): void {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'spindle-fs'
    btn.setAttribute('aria-label', 'Toggle fullscreen')
    btn.textContent = '⛶'
    Object.assign(btn.style, {
      position: 'absolute',
      right: '8px',
      bottom: '8px',
      width: '32px',
      height: '32px',
      border: 'none',
      borderRadius: '4px',
      background: 'rgba(0,0,0,0.5)',
      color: '#fff',
      font: '16px/1 sans-serif',
      cursor: 'pointer',
    })
    btn.addEventListener('click', () => this.fullscreen())
    this.root.appendChild(btn)
    this.fsBtn = btn
  }

  // ---- animation loop -----------------------------------------------------

  private ensureLoop(): void {
    if (this.raf) return
    this.lastTick = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (ts: number): void => {
    if (this.destroyed) return
    const dt = this.lastTick ? ts - this.lastTick : 16
    this.lastTick = ts

    if (this.autoplaying) {
      this.frameF += (this.opts.autoplayFps / 1000) * dt
      this.render()
    } else if (this.momentumActive) {
      this.frameF += this.velocity * dt
      this.velocity = decayVelocity(this.velocity, FRICTION, dt)
      this.render()
      if (isResting(this.velocity, REST_SPEED)) this.momentumActive = false
    }

    if (this.autoplaying || this.momentumActive) {
      this.raf = requestAnimationFrame(this.tick)
    } else {
      this.raf = 0
    }
  }

  // ---- render -------------------------------------------------------------

  private render(): void {
    if (!this.ready) return
    let idx = this.frame
    let region = this.store.get(idx)
    // During progressive load a frame may be undecoded; fall back to frame 0.
    if (!region) region = this.store.get(0)
    if (region) this.renderer.draw(region, this.view)

    if (this.fsBtn) this.fsBtn.textContent = document.fullscreenElement ? '⤢' : '⛶'

    if (!this.opts.loop) {
      // Clamp the float so it can't drift outside the range when looping is off.
      this.frameF = Math.min(this.store.count - 1, Math.max(0, this.frameF))
    }
  }
}
