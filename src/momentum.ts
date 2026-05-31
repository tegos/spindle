const FRAME_MS = 16

/**
 * Exponentially decay a velocity by `friction` per ~16ms frame, scaled to the
 * real elapsed time so the fling feels the same regardless of refresh rate.
 */
export function decayVelocity(v: number, friction: number, dtMs: number): number {
  return v * Math.pow(friction, dtMs / FRAME_MS)
}

/** True once the absolute speed has dropped below the resting threshold. */
export function isResting(v: number, threshold: number): boolean {
  return Math.abs(v) < threshold
}
