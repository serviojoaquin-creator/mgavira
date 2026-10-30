import { RenderDiagnostics } from './RenderDiagnostics'
import { useProgress } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CitySky } from './CitySky'
import { CinematicRender } from './CinematicRender'
import { ACESFilmicToneMapping, DirectionalLight, Object3D, Vector3, PCFSoftShadowMap, SRGBColorSpace, Mesh, Texture } from 'three'
import { CityEnvironment } from './CityEnvironment'
import { VehicleController } from './VehicleController'
import { CameraDirector } from './CameraDirector'
import { InteractiveRoadSign } from './InteractiveRoadSign'
import { type PanelId } from '../data/site'
import { signStops } from '../experience/route'
import { atRoad, driveState } from '../experience/route'

function MovingSun({ progress }: { progress: MutableRefObject<number> }) {
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
    const texel = 44 / 2048
    s.focus.addScaledVector(s.right, Math.round(road.dot(s.right) / texel) * texel - road.dot(s.right))
    s.focus.addScaledVector(s.up, Math.round(road.dot(s.up) / texel) * texel - road.dot(s.up))
    s.elapsed += delta
    if (s.elapsed >= 1 / 20 || !light.current.shadow.map) {
      light.current.position.copy(s.focus).addScaledVector(s.direction, Math.sqrt(32*32+55*55+24*24))
      target.position.copy(s.focus); target.updateMatrixWorld()
      light.current.shadow.needsUpdate = true
      s.previous.copy(road); s.elapsed = 0
    }
    if (fill.current) fill.current.position.set(road.x - 11, 11, road.z - 15)
  })
  return <>
    <directionalLight ref={light} target={target} intensity={3.0} color="#fff1df" castShadow
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-autoUpdate={false}
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
  const { gl, scene, camera } = useThree()
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useFrame(() => {
    if (++frames.current !== 3) return
    // Improve oblique road, facade and sign detail once, before shader warm-up.
    const anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) for (const value of Object.values(material)) {
        if (value instanceof Texture && !value.isRenderTargetTexture && value.anisotropy !== anisotropy) {
          value.anisotropy = anisotropy; value.needsUpdate = true
        }
      }
    })
    // Compile offscreen building/traffic variants while the loading screen is still visible.
    void gl.compileAsync(scene, camera).then(() => { if (mounted.current) onReady() })
      .catch(() => { if (mounted.current) onReady() })
  })
  return null
}

export function Experience3D({ progress, compact, onOpen, onReady, onProgress }: {
  progress: MutableRefObject<number>; compact: boolean; onOpen: (id: PanelId) => void; onReady: () => void; onProgress: (value: number) => void
}) {
  const visualProgress = useRef(0)
  return <div className="experience-canvas" aria-hidden="true">
    <AssetProgress onProgress={onProgress} />
    <Canvas shadows={{ type: PCFSoftShadowMap }} dpr={1.5} camera={{ position: [7, 3.2, 9], fov: 38, near: .1, far: 240 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.outputColorSpace = SRGBColorSpace; gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
      <color attach="background" args={['#c7dce7']} />
      <fog attach="fog" args={['#c6d6de', 65, 230]} />

      <hemisphereLight args={['#d1e5f5', '#827b6b', .72]} />
      <ambientLight intensity={.02} />
      <MovingSun progress={visualProgress} />
      <Suspense fallback={null}>
        <CitySky />
        <CinematicRender compact={compact} progress={visualProgress} />
        {(import.meta.env.DEV || new URLSearchParams(window.location.search).has('qualityAudit')) && <RenderDiagnostics />}
        <FirstFrame onReady={onReady} />
        <CityEnvironment compact={compact} />
        <VehicleController progress={progress} visualProgress={visualProgress} />
        <CameraDirector progress={visualProgress} compact={compact} />
        {signStops.map(stop => <InteractiveRoadSign key={stop.id} id={stop.id} stop={stop.t}
          progress={visualProgress} onOpen={onOpen} />)}
      </Suspense>
    </Canvas>
  </div>
}
