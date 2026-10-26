/** Resolution is shared by the canvas and every postprocess target. */
export function resolutionRange(width: number, height: number, deviceRatio: number, compact: boolean) {
  const pixels = Math.max(1, width * height)
  const ceiling = Math.min(2, Math.sqrt(3_600_000 / pixels))
  const maximum = Math.max(1, Math.min(ceiling, Math.max(compact ? 1.75 : 1.5, deviceRatio)))
  return { maximum, minimum: Math.min(maximum, pixels > 2_500_000 ? 1 : 1.25) }
}

/** Sustained load only: reduce AO before resolution, recover after a longer quiet interval. */
export function qualityDecision(ms: number, slow: number, fast: number, ao: boolean, ratio: number, minimum: number, maximum: number) {
  if (slow >= 2 && ms > 25) {
    if (ao) return { ao: false, ratio }
    if (ratio > minimum + .01) return { ao, ratio: Math.max(minimum, ratio - .25) }
  }
  if (fast >= 4 && ms < 18) {
    if (ratio < maximum - .01) return { ao, ratio: Math.min(maximum, ratio + .25) }
    if (!ao) return { ao: true, ratio }
  }
  return null
}
