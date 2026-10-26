import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/** Opt-in, DOM-readable frame telemetry for comparing the same route and viewport. */
export function RenderDiagnostics() {
  const { gl } = useThree()
  const sample = useRef({ start: 0, beforeRender: 0, animation: 0, elapsed: 0, frames: [] as number[], cpu: 0, calls: 0, triangles: 0, warmup: 0 })
  useEffect(() => {
    const previous = gl.info.autoReset
    gl.info.autoReset = false
    return () => { gl.info.autoReset = previous; delete gl.domElement.dataset.frameStats }
  }, [gl])
  useFrame(() => { sample.current.start = performance.now(); gl.info.reset() }, -10)
  useFrame(() => { sample.current.beforeRender = performance.now() }, .9)
  useFrame((_, delta) => {
    const s = sample.current
    if (document.visibilityState !== 'visible' || delta > .5) { s.frames = []; s.elapsed = 0; s.cpu = 0; s.animation = 0; return }
    s.warmup += delta
    if (s.warmup < 5) return
    s.elapsed += delta; s.frames.push(delta * 1000)
    s.cpu += performance.now() - s.start
    s.animation += s.beforeRender - s.start
    s.calls = Math.max(s.calls, gl.info.render.calls)
    s.triangles = Math.max(s.triangles, gl.info.render.triangles)
    if (s.elapsed < 2) return
    const sorted = [...s.frames].sort((a,b)=>a-b)
    gl.domElement.dataset.frameStats = JSON.stringify({
      fps: +(s.frames.length / s.elapsed).toFixed(1), p95: +sorted[Math.floor(sorted.length * .95)].toFixed(1),
      animationMs: +(s.animation / s.frames.length).toFixed(2), programs: gl.info.programs?.length,
      cpuMs: +(s.cpu / s.frames.length).toFixed(2), over50ms: sorted.filter(n=>n>50).length,
      calls: s.calls, triangles: s.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
    })
    s.frames = []; s.elapsed = 0; s.cpu = 0; s.animation = 0; s.calls = 0; s.triangles = 0
  }, 2)
  return null
}
