import assert from 'node:assert/strict'
import { resolutionRange, qualityDecision } from '../src/experience/renderQuality.ts'

for (const [w,h,dpr,compact] of [[1440,900,1,false],[1920,1080,2,false],[390,844,3,true],[3840,2160,2,false]]) {
  const r = resolutionRange(w,h,dpr,compact)
  assert.ok(r.maximum >= r.minimum && r.minimum >= 1)
  assert.ok(r.maximum <= 2)
  if (w < 2000) assert.ok(r.minimum >= 1.5, 'Normal viewports must not fall to a pixelated 1x image')
}
assert.equal(qualityDecision(70,1,0,true,1.5,1.25,1.5),null,'A single spike must not resize render targets')
assert.deepEqual(qualityDecision(29,2,0,true,1.5,1.25,1.5),{ao:false,ratio:1.5},'Drop AO before image resolution')
assert.deepEqual(qualityDecision(29,2,0,false,1.5,1.25,1.5),{ao:false,ratio:1.25})
assert.equal(qualityDecision(29,3,0,false,1.25,1.25,1.5),null,'Respect the resolution floor')
assert.deepEqual(qualityDecision(16,0,4,false,1.25,1.25,1.5),{ao:false,ratio:1.5},'Recover image resolution first')
assert.deepEqual(qualityDecision(16,0,4,false,1.5,1.25,1.5),{ao:true,ratio:1.5})
console.log('Quality verified: image floor, pixel budget, spike rejection, effects-first downgrade, gradual recovery.')

assert.equal(resolutionRange(1920,1080,1,false).maximum,2,'Full HD must render a 4K internal image')
assert.equal(resolutionRange(1920,1080,1,false).minimum,1.5,'Full HD must keep a supersampled floor')
for (const [w,h,m] of [[1920,1080,false],[2560,1440,false],[390,844,true],[760,1200,true]]) {
 const q=resolutionRange(w,h,3,m); assert.ok(w*h*q.maximum*q.maximum <= (m?2400000:8294400)+1,'Respect GPU pixel budget')
}
