import type { Source, SheetSource } from './types'

/** A drawable region: an image plus the source rect to blit from it. */
export interface FrameRegion {
  img: CanvasImageSource
  sx: number
  sy: number
  sw: number
  sh: number
}

function isSheet(s: Source): s is SheetSource {
  return !Array.isArray(s)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Decode off the main paint when supported; ignore failures.
      if (img.decode) img.decode().then(() => resolve(img), () => resolve(img))
      else resolve(img)
    }
    img.onerror = () => reject(new Error(`spindle: failed to load ${url}`))
    img.src = url
  })
}

/**
 * Owns frame pixels for one source. Loads progressively: the first frame is
 * decoded up front so the viewer can paint and become interactive, then the
 * remainder stream in. `get` returns null for a frame not yet decoded.
 */
export class FrameStore {
  readonly count: number
  private readonly source: Source
  private readonly imgs: (HTMLImageElement | null)[]
  private sheetImg: HTMLImageElement | null = null

  constructor(source: Source) {
    this.source = source
    this.count = isSheet(source) ? source.frames : source.length
    this.imgs = new Array(this.count).fill(null)
  }

  get(i: number): FrameRegion | null {
    const src = this.source
    if (isSheet(src)) {
      if (!this.sheetImg) return null
      const cols = src.cols ?? src.frames
      const col = i % cols
      const row = Math.floor(i / cols)
      return { img: this.sheetImg, sx: col * src.fw, sy: row * src.fh, sw: src.fw, sh: src.fh }
    }
    const img = this.imgs[i]
    if (!img) return null
    return { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight }
  }

  /**
   * Begin loading. Resolves `onFirst` once frame 0 is ready, then loads the
   * rest, calling `onProgress(0..1)` after each and `onReady` when all decode.
   */
  async load(
    onFirst: () => void,
    onProgress: (p: number) => void,
    onReady: () => void,
  ): Promise<void> {
    const src = this.source
    if (isSheet(src)) {
      this.sheetImg = await loadImage(src.sheet)
      onFirst()
      onProgress(1)
      onReady()
      return
    }

    let done = 0
    const report = () => onProgress(this.count === 0 ? 1 : done / this.count)

    // Frame 0 first so we can paint and unlock interaction immediately.
    this.imgs[0] = await loadImage(src[0]!)
    done++
    onFirst()
    report()
    if (done === this.count) return onReady()

    await Promise.all(
      src.slice(1).map((url, k) =>
        loadImage(url).then((img) => {
          this.imgs[k + 1] = img
          done++
          report()
        }),
      ),
    )
    onReady()
  }
}
