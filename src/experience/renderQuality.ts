/** Resolution is shared by the canvas and every postprocess target. */
export function resolutionRange(width: number, height: number, deviceRatio: number, compact: boolean) {
  const pixels = Math.max(1, width * height)
  // Respect native density. Previously even a 1x display was forced to draw 4x
  // as many pixels, including every HDR/postprocess buffer.
  const budget = compact ? 1_600_000 : 3_000_000
  const maximum = Math.max(1, Math.min(2, deviceRatio, Math.sqrt(budget / pixels)))
  return { maximum, minimum: 1, initial: Math.min(maximum, 1.5) }
}

/** Sustained load only: reduce AO before resolution, recover after a longer quiet interval. */
export function qualityDecision(ms: number, slow: number, fast: number, ao: boolean, ratio: number, minimum: number, maximum: number) {
  if (slow >= 1 && ms > 22) {
    if (ao) return { ao: false, ratio }
    if (ratio > minimum + .01) return { ao, ratio: Math.max(minimum, ratio - .25) }
  }
  if (fast >= 8 && ms < 17.5) {
    if (ratio < maximum - .01) return { ao, ratio: Math.min(maximum, ratio + .25) }
    // Leave headroom for scroll/camera movement instead of repeatedly toggling AO.
    if (!ao && ms < 14) return { ao: true, ratio }
  }
  return null
}
