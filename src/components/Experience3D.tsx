import { useProgress } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CitySky } from './CitySky'
import { CinematicRender } from './CinematicRender'
import { CityReflections } from './CityReflections'
import { ACESFilmicToneMapping, DirectionalLight, Object3D, PCFShadowMap, SRGBColorSpace } from 'three'
import { CityEnvironment } from './CityEnvironment'
import { VehicleController } from './VehicleController'
import { CameraDirector } from './CameraDirector'
import { InteractiveRoadSign } from './InteractiveRoadSign'
import { type PanelId } from '../data/site'
import { signStops } from '../experience/route'
import { atRoad, driveState } from '../experience/route'

function MovingSun({ progress, compact }: { progress: MutableRefObject<number>; compact: boolean }) {
  const light = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  useFrame(() => {
    if (!light.current) return
    const { t } = driveState(progress.current)
    const road = atRoad(t).point
    light.current.position.set(road.x - 32, 55, road.z - 24)
    if (fill.current) fill.current.position.set(road.x - 11, 11, road.z - 15)
    target.position.copy(road)
    target.updateMatrixWorld()
  })
  return <>
    <directionalLight ref={light} target={target} intensity={3.65} color="#fff1da" castShadow
      shadow-mapSize-width={compact ? 1024 : 2048} shadow-mapSize-height={compact ? 1024 : 2048}
      shadow-camera-left={-23} shadow-camera-right={23} shadow-camera-top={23} shadow-camera-bottom={-23}
      shadow-camera-near={.5} shadow-camera-far={150} shadow-bias={-.00008} shadow-normalBias={.012}
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
  useFrame(() => { if (++frames.current === 3) onReady() })
  return null
}

export function Experience3D({ progress, compact, onOpen, onReady, onProgress }: {
  progress: MutableRefObject<number>; compact: boolean; onOpen: (id: PanelId) => void; onReady: () => void; onProgress: (value: number) => void
}) {
  const visualProgress = useRef(0)
  return <div className="experience-canvas" aria-hidden="true">
    <AssetProgress onProgress={onProgress} />
    <Canvas shadows={{ type: PCFShadowMap }} dpr={compact ? 1.5 : [1, 1.7]} camera={{ position: [7, 3.2, 9], fov: 38, near: .1, far: 240 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.outputColorSpace = SRGBColorSpace; gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.02 }}>
      <color attach="background" args={['#c7dce7']} />
      <fog attach="fog" args={['#c6d6de', 65, 230]} />

      <hemisphereLight args={['#d1e5f5', '#8c7963', .52]} />
      <ambientLight intensity={.02} />
      <MovingSun progress={visualProgress} compact={compact} />
      <Suspense fallback={null}>
        <CitySky />
        <CinematicRender compact={compact} />
        <CityReflections />
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
