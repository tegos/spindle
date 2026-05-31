import type { SpindleOptions, ResolvedOptions } from './types'

const noop = (): void => {}

/** Merge caller options over defaults, leaving `source` by reference. */
export function resolveOptions(opts: SpindleOptions): ResolvedOptions {
  return {
    source: opts.source,
    autoplay: opts.autoplay ?? false,
    loop: opts.loop ?? true,
    momentum: opts.momentum ?? true,
    zoom: opts.zoom ?? true,
    fullscreen: opts.fullscreen ?? true,
    pxPerFrame: opts.pxPerFrame ?? 8,
    autoplayFps: opts.autoplayFps ?? 12,
    maxZoom: opts.maxZoom ?? 4,
    onProgress: opts.onProgress ?? noop,
    onReady: opts.onReady ?? noop,
  }
}
