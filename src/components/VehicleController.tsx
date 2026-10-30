import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { CanvasTexture, DoubleSide, FrontSide, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D } from 'three'
import { atRoad, driveState, routeLength } from '../experience/route'
import { wheelRotation } from '../experience/wheels'

const wheelNames = ['Wheel_FL_Spin', 'Wheel_FR_Spin', 'Wheel_RL_Spin', 'Wheel_RR_Spin'] as const

export function VehicleController({ progress, visualProgress }: {
  progress: MutableRefObject<number>
  visualProgress: MutableRefObject<number>
}) {
  const car = useRef<Group>(null)
  const { scene } = useGLTF('/media/v23/cronos.glb', '/draco/v1/', false)
  const wheels = useMemo(() => wheelNames.map(name => scene.getObjectByName(name) as Object3D | undefined), [scene])
  const pivots = useMemo(() => ['Wheel_FL_Pivot', 'Wheel_FR_Pivot'].map(name => scene.getObjectByName(name) as Object3D | undefined), [scene])
  const initial = useMemo(() => wheels.map(wheel => wheel?.rotation.y ?? 0), [wheels])
  const groundShadow = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 7, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(7,17,20,.72)')
    gradient.addColorStop(.55, 'rgba(7,17,20,.31)')
    gradient.addColorStop(1, 'rgba(7,17,20,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    return new CanvasTexture(canvas)
  }, [])

  useEffect(() => {
    groundShadow.needsUpdate = true
    return () => groundShadow.dispose()
  }, [groundShadow])

  useEffect(() => {
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      if (object.userData.webFinishApplied) return
      const original = object.material
      if (!(original instanceof MeshStandardMaterial)) return
      if (original.name.includes('Pearl white')) {
        object.material = new MeshPhysicalMaterial({
          name: original.name, color: original.color, metalness: .18, roughness: .19,
          clearcoat: 1, clearcoatRoughness: .10, envMapIntensity: 1.1,
          side: FrontSide,
        })
      } else if (original.name.toLowerCase().includes('glass')) {
        object.material = new MeshPhysicalMaterial({
          name: original.name, color: original.color, metalness: 0, roughness: .045,
          clearcoat: .65, clearcoatRoughness: .045, envMapIntensity: 1.2, ior: 1.5,
          transparent: true, opacity: original.opacity, depthWrite: false,
          side: DoubleSide,
        })
      } else {
        original.envMapIntensity = original.name.toLowerCase().includes('chrome') ? 1.5 : 1.1
        original.needsUpdate = true
      }
      object.userData.webFinishApplied = true
    })
  }, [scene])

  useFrame((_, delta) => {
    visualProgress.current = MathUtils.damp(visualProgress.current, progress.current, 6, Math.min(delta, .05))
    const p = visualProgress.current
    const { t, offset } = driveState(p)
    const { point, tangent } = atRoad(t, offset)
    // Follow the curb approach with the body as well as the position.
    const before = driveState(Math.max(0, p - .00015))
    const after = driveState(Math.min(1, p + .00015))
    const heading = atRoad(after.t, after.offset).point.sub(atRoad(before.t, before.offset).point)
    const yaw = heading.lengthSq() > 1e-9 ? Math.atan2(-heading.z, heading.x) : Math.atan2(-tangent.z, tangent.x)
    if (car.current) {
      car.current.position.set(point.x, .002, point.z)
      car.current.rotation.y = yaw
    }

    // The glTF wheel geometry is Y-up. Spin turns local Y into the axle
    // direction. Negative local-Y rotation makes the contact patch move
    // backward relative to a car travelling along its local +X axis.
    const distance = routeLength * (t - .03)
    wheels.forEach((wheel, i) => { if (wheel) wheel.rotation.y = initial[i] + wheelRotation(distance) })

    const future = atRoad(Math.min(.995, t + .008)).tangent
    const curve = Math.atan2(-future.z, future.x) - Math.atan2(-tangent.z, tangent.x)
    pivots.forEach(pivot => { if (pivot) pivot.rotation.y = MathUtils.clamp(curve * 1.6 + (yaw - Math.atan2(-tangent.z, tangent.x)) * .7, -.24, .24) })
  }, -1)

  return <group ref={car} userData={{ excludeReflection: true }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .026, 0]}>
      <planeGeometry args={[4.8, 1.95]} />
      <meshBasicMaterial map={groundShadow} transparent depthWrite={false} opacity={.48} />
    </mesh>
    {[-1.162, 1.359].flatMap(x => [-.735, .735].map(z =>
      <mesh key={`${x}-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, .028, z]}>
        <planeGeometry args={[.92, .68]} />
        <meshBasicMaterial map={groundShadow} transparent depthWrite={false} opacity={.63} />
      </mesh>
    ))}
    <primitive object={scene} />
  </group>
}

useGLTF.preload('/media/v23/cronos.glb', '/draco/v1/', false)
