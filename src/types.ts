/** A sprite-sheet frame source: one image holding `frames` cells of `fw`×`fh`. */
export interface SheetSource {
  sheet: string
  frames: number
  /** Frame cell width in px. */
  fw: number
  /** Frame cell height in px. */
  fh: number
  /** Cells per row in the sheet. Defaults to all frames in a single row. */
  cols?: number
}

/** Either a list of per-frame image URLs or a single sprite sheet. */
export type Source = string[] | SheetSource

export interface SpindleOptions {
  /** Frame URLs or a sprite-sheet descriptor. Required. */
  source: Source
  /** Spin on load until the user grabs. Default false. */
  autoplay?: boolean
  /** Wrap around at the ends. Default true. */
  loop?: boolean
  /** Fling with inertia after release. Default true. */
  momentum?: boolean
  /** Allow pinch / double-tap / scroll zoom + pan. Default true. */
  zoom?: boolean
  /** Show a fullscreen toggle and honour the Fullscreen API. Default true. */
  fullscreen?: boolean
  /** Pixels of drag per single frame step. Default 8. */
  pxPerFrame?: number
  /** Frames advanced per second during autoplay. Default 12. */
  autoplayFps?: number
  /** Max zoom factor. Default 4. */
  maxZoom?: number
  /** Fired as frames decode, 0..1. */
  onProgress?: (p: number) => void
  /** Fired once the first frame is painted and the viewer is interactive. */
  onReady?: () => void
}

/** Options with all optional fields resolved to concrete values. */
export type ResolvedOptions = Required<Omit<SpindleOptions, 'onProgress' | 'onReady'>> & {
  onProgress: (p: number) => void
  onReady: () => void
}
