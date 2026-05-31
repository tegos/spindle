/** Wrap a frame index into [0, n) looping both directions. */
export function wrapIndex(i: number, n: number): number {
  return ((i % n) + n) % n
}

/** Whole frames covered by a pixel drag distance, truncated toward zero. */
export function frameDelta(dx: number, pxPerFrame: number): number {
  return Math.trunc(dx / pxPerFrame)
}
