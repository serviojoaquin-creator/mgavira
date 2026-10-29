/** Resolution is shared by the canvas and every postprocess target. */
export function resolutionRange(width: number, height: number, deviceRatio: number, compact: boolean) {
  const pixels = Math.max(1, width * height)
  // Supersample Full HD at 2x; cap GPU memory independently on handheld screens.
  const budget = compact ? 2_400_000 : 8_294_400
  const ceiling = Math.min(2, Math.sqrt(budget / pixels))
  const maximum = Math.max(1, Math.min(ceiling, Math.max(2, deviceRatio)))
  return { maximum, minimum: Math.min(maximum, Math.max(1, Math.min(1.5, Math.sqrt(4_665_600 / pixels)))) }
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
