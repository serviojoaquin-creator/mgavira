import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Frustum, Sphere, Color, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { atRoad, cityIntersections, routeLength, signStops } from '../experience/route'
import { wheelRotation } from '../experience/wheels'

import { CityPedestrians, type Person } from './CityPedestrians'
const paintColors = ['#c5a537', '#294d65', '#78888c', '#754a43', '#395651']

/** One draw per part for the whole fleet, including independently rolling wheels. */
function TrafficFleet({ count }: { count: number }) {
  const { scene } = useGLTF('/media/v22/traffic-cronos.glb', '/draco/v1/', false)
  const refs = useRef<(InstancedMesh | null)[]>([])
  const frames = useMemo(() => Array.from({ length: count }, () => {
    const copy = scene.clone(true)
    const meshes: Mesh[] = []
    copy.traverse(object => { if (object instanceof Mesh) meshes.push(object) })
    return { copy, meshes, wheels: ['FL', 'FR', 'RL', 'RR'].map(code => copy.getObjectByName(`Wheel_${code}_Spin`)) }
  }), [scene, count])
  const tint = useMemo(() => new Color(), [])
  const scratch = useMemo(() => ({ frustum: new Frustum(), view: new Matrix4(), bounds: new Sphere(new Vector3(), 3), matrix: new Matrix4(), pose: new Matrix4(),
    position: new Vector3(), rotation: new Quaternion(), scale: new Vector3(1,1,1), up: new Vector3(0,1,0) }), [])
  useLayoutEffect(() => {
    frames[0].meshes.forEach((mesh, part) => {
      const instance = refs.current[part]
      if (!instance) return
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      const paint = material instanceof MeshStandardMaterial && material.name.includes('Pearl white')
      frames.forEach((_, index) => {
        const taxiRoof = /roof|pillar/i.test(mesh.name)
        const tint = !paint ? '#ffffff' : index === 0 ? (taxiRoof ? '#d9af32' : '#20272b') : paintColors[index]
        instance.setColorAt(index, new Color(tint))
      })
      if (instance.instanceColor) instance.instanceColor.needsUpdate = true
    })
  }, [frames])
  const animationTime = useRef(0)
  useFrame(({ camera }, delta) => {
    animationTime.current += Math.min(delta, .05)
    const distance = animationTime.current * 4.6
    camera.updateMatrixWorld()
    scratch.frustum.setFromProjectionMatrix(scratch.view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    let visible = 0
    const { position, rotation, scale, pose, matrix, up } = scratch
    frames.forEach((frame, index) => {
      const t = .035 + ((.91 + index * .182 - distance / routeLength) % .91 + .91) % .91
      const { point, tangent } = atRoad(t, -1.45)
      scratch.bounds.center.copy(point); scratch.bounds.center.y = .9
      if (camera.position.distanceToSquared(point) > 22 * 22 && !scratch.frustum.intersectsSphere(scratch.bounds)) return
      position.set(point.x, .025, point.z)
      rotation.setFromAxisAngle(up, Math.atan2(-tangent.z, tangent.x) + Math.PI)
      pose.compose(position, rotation, scale)
      frame.wheels.forEach(wheel => { if (wheel) wheel.rotation.y = wheelRotation(distance) })
      frame.copy.updateMatrixWorld(true)
      frame.meshes.forEach((mesh, part) => {
        const instance = refs.current[part]
        if (!instance) return
        instance.setMatrixAt(visible, matrix.multiplyMatrices(pose, mesh.matrixWorld))
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        const paint = material instanceof MeshStandardMaterial && material.name.includes('Pearl white')
        instance.setColorAt(visible, tint.set(!paint ? '#ffffff' : index === 0 ? (/roof|pillar/i.test(mesh.name) ? '#d9af32' : '#20272b') : paintColors[index]))
      })
      visible++
    })
    refs.current.forEach(mesh => { if (mesh) { mesh.count = visible; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true } })
  }, .1)
  return <group userData={{ excludeReflection: true }}>
    {frames[0].meshes.map((mesh, part) => <instancedMesh key={mesh.uuid}
      ref={node => { refs.current[part] = node }} args={[mesh.geometry, mesh.material, count]}
      frustumCulled={false} castShadow receiveShadow />)}
  </group>
}

function residents(compact: boolean) {
  const people: Person[] = []
  const jackets = ['#8a5145', '#34596a', '#b7a382', '#53684b', '#3b4650', '#b8b8b0', '#8a7855']
  const skins = ['#bb8564', '#d6ac8b', '#8b5c44', '#e0bba0', '#a77152']
  for (const side of [-1, 1]) {
    const exclusions = [
      ...cityIntersections.map(t => [t - 6 / routeLength, t + 6 / routeLength]),
      ...signStops.map(stop => [stop.t - 6 / routeLength, stop.t + 6 / routeLength]),
      ...[.31, .69].map(t => [t - 4 / routeLength, t + 4 / routeLength]),
    ].sort((a, b) => a[0] - b[0])
    let cursor = .015
    const intervals: [number, number][] = []
    for (const [a, b] of exclusions) {
      if ((a - cursor) * routeLength > 5) intervals.push([cursor, a])
      cursor = Math.max(cursor, b)
    }
    if (cursor < .95) intervals.push([cursor, .98])
    intervals.forEach(([start, end], i) => {
      for (let j = 0; j < (compact ? 2 : 3); j++) {
        const id = people.length
        people.push({ start, end, offset: side * (8.12 + j * .43), phase: i * 1.8 + j * 2.1,
          scale: .93 + (id % 4) * .045, jacket: jackets[id % jackets.length], skin: skins[id % skins.length], trousers: id % 3 ? '#29353d' : '#74756b' })
      }
    })
  }
  // Waiting passengers beside the shelters, outside the walking strip.
  for (const [t, side] of [[.23, -1], [.515, 1], [.85, -1]]) {
    for (let i = 0; i < 2; i++) people.push({ start: t + i * .006, end: t + i * .006, offset: side * 7.3,
      phase: i * 3, scale: .96 + i * .08, jacket: jackets[(people.length + i) % jackets.length], skin: skins[i + 1], trousers: '#35414a', standing: true })
  }
  return people
}

function SidewalkCafe({ t, side }: { t: number; side: number }) {
  const { point, tangent } = atRoad(t, side * 8.4)
  return <group position={[point.x, .14, point.z]} rotation={[0, Math.atan2(-tangent.z, tangent.x), 0]}>
    {[-1.3, 1.3].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, .73, 0]} castShadow><cylinderGeometry args={[.43, .43, .07, 16]} /><meshStandardMaterial color="#927b5d" roughness={.8} /></mesh>
      <mesh position={[0, .36, 0]} castShadow><cylinderGeometry args={[.04, .07, .72, 7]} /><meshStandardMaterial color="#33434b" metalness={.5} roughness={.5} /></mesh>
      {[-1, 1].map(s => <group key={s} position={[s * .68, 0, 0]}>
        <mesh position={[0, .43, 0]} castShadow><boxGeometry args={[.38, .07, .4]} /><meshStandardMaterial color="#697862" roughness={.85} /></mesh>
        <mesh position={[s * .16, .68, 0]} castShadow><boxGeometry args={[.06, .45, .4]} /><meshStandardMaterial color="#697862" roughness={.85} /></mesh>
        {[-.13, .13].flatMap(a => [-.13, .13].map(b => <mesh key={`${a}-${b}`} position={[a, .21, b]} castShadow><boxGeometry args={[.035, .42, .035]} /><meshStandardMaterial color="#35444a" roughness={.7} /></mesh>))}
      </group>)}
    </group>)}
    <mesh position={[0, 1.18, side * .55]} castShadow><cylinderGeometry args={[.028, .034, 2.36, 8]} /><meshStandardMaterial color="#55534b" roughness={.65} /></mesh>
    <mesh position={[0, 2.45, side * .55]} castShadow><coneGeometry args={[1.95, .34, 8]} /><meshStandardMaterial color="#b5a184" roughness={.9} /></mesh>
  </group>
}

export function CityLife({ compact }: { compact: boolean }) {
  const people = useMemo(() => residents(compact), [compact])
  return <group>
    <CityPedestrians people={people} />
    <TrafficFleet count={compact ? 3 : 5} />
    <SidewalkCafe t={.31} side={-1} />
    <SidewalkCafe t={.69} side={1} />
  </group>
}
