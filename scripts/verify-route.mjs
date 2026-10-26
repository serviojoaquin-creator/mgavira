import assert from 'node:assert/strict'
import { atRoad, driveState, routeLength, signStops, storyBeat } from '../src/experience/route.ts'

// Scroll must remain continuous in both directions, including chapter boundaries.
let last = driveState(0).t
for (let i = 1; i <= 12000; i++) {
  const p = i / 12000
  const current = driveState(p).t
  assert.ok(current >= last - 1e-8, `Vehicle reverses unexpectedly at scroll ${p}`)
  assert.ok(current - last < .002, `Vehicle teleports at scroll ${p}`)
  const { point, tangent } = atRoad(current)
  assert.ok([point.x, point.z, tangent.x, tangent.z].every(Number.isFinite))
  last = current
}

for (let i = 0; i < signStops.length; i++) {
  // The entire full-focus interval must show a stationary car at this sign.
  for (const local of [.51, .60, .74]) {
    const p = (i + 1 + local) / 6
    assert.ok(storyBeat(p).focus > .99, `${signStops[i].id}: camera is not focused`)
    assert.ok(Math.abs(driveState(p).t - signStops[i].t) < 1e-8, `${signStops[i].id}: car moves while reading`)
  }
  if (i) assert.ok((signStops[i].t - signStops[i - 1].t) * routeLength > 27, 'Signs are too close together')
}
assert.ok(routeLength > 165 && routeLength < 180)
console.log(`Route verified: ${routeLength.toFixed(1)} m, four stationary reading stops, continuous forward/reverse scroll.`)
const destination = driveState(1)
for (const local of [.72, .85, 1]) {
  const parked = driveState((5 + local) / 6)
  assert.ok(Math.abs(parked.t - destination.t) < 1e-8, 'Car must remain stopped during the contact reveal')
  assert.ok(Math.abs(parked.offset - destination.offset) < 1e-8, 'Car must not slide sideways after stopping')
}
assert.ok((destination.t - .925) * routeLength - 2.2 > 7.15, 'Parked car overlaps the final pedestrian crossing')
assert.ok(destination.offset + .95 < 4.58, 'Parked car mounts the curb')
console.log('Arrival verified: complete stop, clear of crossing and curb.')
