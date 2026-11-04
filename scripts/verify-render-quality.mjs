import assert from 'node:assert/strict'
import { resolutionRange, qualityDecision } from '../src/experience/renderQuality.ts'

for (const [w,h,dpr,compact] of [[1440,900,1,false],[1920,1080,2,false],[390,844,3,true],[3840,2160,2,false]]) {
  const q = resolutionRange(w,h,dpr,compact)
  assert.ok(q.minimum >= 1 && q.initial >= q.minimum && q.initial <= q.maximum)
  assert.ok(q.maximum <= Math.min(2,dpr), 'Never force supersampling beyond native density')
  assert.ok(w*h*q.maximum**2 <= Math.max(w*h, compact ? 1600000 : 3000000)+1)
}
assert.equal(resolutionRange(1920,1080,1,false).maximum,1)
assert.equal(resolutionRange(390,844,3,true).initial,1.5)
assert.equal(qualityDecision(70,0,0,true,1.5,1,2),null,'Require a completed slow sampling window')
assert.deepEqual(qualityDecision(70,1,0,true,1.5,1,2),{ao:false,ratio:1.5},'Disable AO before lowering resolution')
assert.deepEqual(qualityDecision(70,1,0,false,1.5,1,2),{ao:false,ratio:1.25},'Recover from severely slow frames')
assert.equal(qualityDecision(70,2,0,false,1,1,2),null,'Never render below CSS resolution')
assert.equal(qualityDecision(16,0,2,false,1,1,2),null,'Do not oscillate after a brief improvement')
assert.deepEqual(qualityDecision(16,0,8,false,1.25,1,1.5),{ao:false,ratio:1.5},'Recover gradually after ten stable seconds')
assert.equal(qualityDecision(16.7,0,8,false,1.5,1,1.5),null,'Reserve GPU headroom at 60 FPS')
assert.deepEqual(qualityDecision(12,0,8,false,1.5,1,1.5),{ao:true,ratio:1.5})
console.log('PASS: native resolution, pixel budget, overload recovery, effects-first downgrade and recovery hysteresis.')
