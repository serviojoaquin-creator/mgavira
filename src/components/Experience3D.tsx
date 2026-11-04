import { RenderDiagnostics } from './RenderDiagnostics'
import { useProgress } from '@react-three/drei'
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CitySky } from './CitySky'
import { CinematicRender } from './CinematicRender'
import { ACESFilmicToneMapping, DirectionalLight, Object3D, Vector3, PCFShadowMap, SRGBColorSpace } from 'three'
import { CityEnvironment } from './CityEnvironment'
import { VehicleController } from './VehicleController'
import { CameraDirector } from './CameraDirector'
import { InteractiveRoadSign } from './InteractiveRoadSign'
import { type PanelId } from '../data/site'
import { signStops } from '../experience/route'
import { atRoad, driveState } from '../experience/route'

function MovingSun({ progress, compact }: { progress: MutableRefObject<number>; compact: boolean }) {
  const mapSize = compact ? 1024 : 2048
  const light = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const shadowState = useMemo(() => ({ elapsed: 0, previous: new Vector3(Infinity, 0, 0),
    right: new Vector3(24, 0, -32).normalize(), up: new Vector3(), direction: new Vector3(-32, 55, -24).normalize(), focus: new Vector3() }), [])
  useFrame((_, delta) => {
    if (!light.current) return
    const { t } = driveState(progress.current)
    const road = atRoad(t).point
    const s = shadowState
    // Snap the light's target in shadow texels to stop stationary edges crawling as the car advances.
    s.up.crossVectors(s.direction, s.right).normalize()
    s.focus.copy(road)
    const texel = 44 / mapSize
    s.focus.addScaledVector(s.right, Math.round(road.dot(s.right) / texel) * texel - road.dot(s.right))
    s.focus.addScaledVector(s.up, Math.round(road.dot(s.up) / texel) * texel - road.dot(s.up))
    s.elapsed += delta
    const moving = road.distanceToSquared(s.previous) > .0004
    if (s.elapsed >= 1 / (moving ? 20 : 8) || !light.current.shadow.map) {
      light.current.position.copy(s.focus).addScaledVector(s.direction, Math.sqrt(32*32+55*55+24*24))
      target.position.copy(s.focus); target.updateMatrixWorld()
      light.current.shadow.needsUpdate = true
      s.previous.copy(road); s.elapsed = 0
    }
    if (fill.current) fill.current.position.set(road.x - 11, 11, road.z - 15)
  })
  return <>
    <directionalLight ref={light} target={target} intensity={3.0} color="#fff1df" castShadow
      shadow-mapSize-width={mapSize} shadow-mapSize-height={mapSize} shadow-autoUpdate={false}
      shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22}
      shadow-camera-near={.5} shadow-camera-far={150} shadow-bias={-.00016} shadow-normalBias={.028}
      shadow-radius={2} />
    <directionalLight ref={fill} target={target} intensity={.18} color="#c7def2" />
  </>
}

function AssetProgress({ onProgress }: { onProgress: (value: number) => void }) {
  const progress = useProgress(state => state.progress)
  useEffect(() => onProgress(progress), [progress, onProgress])
  return null
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  const mounted = useRef(true)
  const warmup = useRef<number | undefined>(undefined)
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; window.clearTimeout(warmup.current) }
  }, [])
  useFrame(() => {
    if (++frames.current !== 3) return
    // Textures already use 8x anisotropy. Re-uploading every texture here with
    // 16x filtering stalled startup and doubled sampling pressure on phones.
    // The visible scene has already rendered. Do not hold the loading screen
    // hostage to shader variants belonging to later blocks of the route.
    gl.domElement.dataset.sceneReadyMs = String(Math.round(performance.now()))
    onReady()
    warmup.current = window.setTimeout(() => {
      if (!mounted.current) return
      void gl.compileAsync(scene, camera).catch(() => {
        // Materials still compile normally on first use if warm-up is unavailable.
      })
    }, 300)
  })
  return null
}

/** Stop rendering behind the opaque contact form and in background tabs. */
function RenderActivity() {
  const { setFrameloop, gl } = useThree()
  useEffect(() => {
    let frame = 0
    let lastPaused: boolean | undefined
    const update = () => {
      frame = 0
      const contact = document.getElementById('consulta')
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0
      const covered = contact ? contact.getBoundingClientRect().top <= Math.max(0, headerBottom) : false
      const paused = document.hidden || covered
      if (paused === lastPaused) return
      lastPaused = paused
      setFrameloop(paused ? 'never' : 'always')
      gl.domElement.dataset.renderPaused = String(paused)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', update)
    }
  }, [setFrameloop, gl])
  return null
}

export const Experience3D = memo(function Experience3D({ progress, compact, onOpen, onReady, onProgress }: {
  progress: MutableRefObject<number>; compact: boolean; onOpen: (id: PanelId) => void; onReady: () => void; onProgress: (value: number) => void
}) {
  const visualProgress = useRef(0)
  const [ready, setReady] = useState(false)
  const finish = useCallback(() => { setReady(true); onReady() }, [onReady])
  return <div className="experience-canvas" aria-hidden="true">
    <AssetProgress onProgress={onProgress} />
    <Canvas shadows={{ type: PCFShadowMap }} dpr={Math.min(window.devicePixelRatio, 1.5)} camera={{ position: [7, 3.2, 9], fov: 38, near: .1, far: 240 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.outputColorSpace = SRGBColorSpace; gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
      <color attach="background" args={['#c7dce7']} />
      <fog attach="fog" args={['#c6d6de', 65, 230]} />

      <hemisphereLight args={['#d1e5f5', '#827b6b', .72]} />
      <ambientLight intensity={.02} />
      <MovingSun progress={visualProgress} compact={compact} />
      <Suspense fallback={null}>
        <CitySky />
        <CinematicRender compact={compact} progress={visualProgress} />
        {(import.meta.env.DEV || new URLSearchParams(window.location.search).has('qualityAudit')) && <RenderDiagnostics />}
        <FirstFrame onReady={finish} />
        {ready && <RenderActivity />}
        <CityEnvironment compact={compact} />
        <VehicleController progress={progress} visualProgress={visualProgress} />
        <CameraDirector progress={visualProgress} compact={compact} />
        {signStops.map(stop => <InteractiveRoadSign key={stop.id} id={stop.id} stop={stop.t}
          progress={visualProgress} onOpen={onOpen} />)}
      </Suspense>
    </Canvas>
  </div>
})
