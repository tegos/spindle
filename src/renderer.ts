import type { FrameRegion } from './loader'

/** View transform applied on top of the base contain-fit. */
export interface ViewTransform {
  /** Zoom factor, 1 = fit. */
  zoom: number
  /** Pan offset in CSS pixels, applied after zoom. */
  panX: number
  panY: number
}

export const IDENTITY: ViewTransform = { zoom: 1, panX: 0, panY: 0 }

/** Clamp a pan offset so the zoomed frame can't be dragged off the canvas. */
export function clampPan(t: ViewTransform, cw: number, ch: number): ViewTransform {
  const maxX = Math.max(0, (cw * t.zoom - cw) / 2)
  const maxY = Math.max(0, (ch * t.zoom - ch) / 2)
  return {
    zoom: t.zoom,
    panX: Math.min(maxX, Math.max(-maxX, t.panX)),
    panY: Math.min(maxY, Math.max(-maxY, t.panY)),
  }
}

/**
 * Draws frames into a canvas, keeping a backing-store sized to the element and
 * device pixel ratio. Each frame is contained (whole frame visible, centered),
 * then the view transform (zoom + pan) is applied.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private cssW = 0
  private cssH = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('spindle: 2d canvas context unavailable')
    this.ctx = ctx
  }

  /** Resize the backing store to the element's box. Returns true if it changed. */
  resize(): boolean {
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (w === this.cssW && h === this.cssH && this.canvas.width === Math.round(w * dpr)) {
      return false
    }
    this.cssW = w
    this.cssH = h
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.cssW, this.cssH)
  }

  draw(region: FrameRegion, view: ViewTransform): void {
    const { ctx } = this
    const cw = this.cssW
    const ch = this.cssH
    ctx.clearRect(0, 0, cw, ch)
    if (region.sw === 0 || region.sh === 0) return

    // Contain fit.
    const scale = Math.min(cw / region.sw, ch / region.sh) * view.zoom
    const dw = region.sw * scale
    const dh = region.sh * scale
    const dx = (cw - dw) / 2 + view.panX
    const dy = (ch - dh) / 2 + view.panY
    ctx.drawImage(region.img, region.sx, region.sy, region.sw, region.sh, dx, dy, dw, dh)
  }
}
