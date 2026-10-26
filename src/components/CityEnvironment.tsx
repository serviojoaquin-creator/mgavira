import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Texture, Vector3 } from 'three'
import { atRoad, cityIntersections, route, routeLength, signStops } from '../experience/route'
import { BoxInstances, ModernBuildings } from './ModernCity'
import { ModernStreetFurniture } from './ModernStreet'
import { DestinationStop } from './DestinationStop'
import { CityLife } from './CityLife'
import { CityStreetDetails } from './CityStreetDetails'
import { ElevatedStreetSigns } from './ElevatedStreetSigns'
import { avenuePosters } from '../data/avenuePosters'
import { useStreetMaterials } from './StreetMaterials'

function ribbon(a: number, b: number, height: number, segments = 240, start = 0, end = 1) {
  const vertices: number[] = []
  const indices: number[] = []
  const uvs: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = start + (end - start) * i / segments
    const { point, side } = atRoad(t)
    vertices.push(point.x + side.x * a, height, point.z + side.z * a)
    vertices.push(point.x + side.x * b, height, point.z + side.z * b)
    uvs.push(t * route.getLength() / 4, 0, t * route.getLength() / 4, 1)
    if (i < segments) {
      const j = i * 2
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function curbFace(offset: number, start: number, end: number) {
  const geometry = ribbon(offset, offset, 0, 48, start, end)
  const vertices = geometry.attributes.position
  for (let i = 0; i < vertices.count; i++) vertices.setY(i, i % 2 ? .145 : .016)
  geometry.computeVertexNormals()
  return geometry
}

function RoadSystem() {
  const road = useMemo(() => ribbon(-4.6, 4.6, .018), [])
  const surface = useStreetMaterials()
  const walks = useMemo(() => {
    const gap = 4.65 / routeLength
    const intervals: [number, number][] = []
    let from = 0
    for (const t of cityIntersections) { intervals.push([from, t - gap]); from = t + gap }
    intervals.push([from, 1])
    return intervals.flatMap(([a, b]) => [
      { paving: ribbon(4.72, 9.8, .14, 48, a, b), curb: ribbon(4.58, 4.76, .145, 48, a, b), face: curbFace(4.58, a, b) },
      { paving: ribbon(-9.8, -4.72, .14, 48, a, b), curb: ribbon(-4.76, -4.58, .145, 48, a, b), face: curbFace(-4.58, a, b) },
    ])
  }, [])
  const laneMarks = useMemo(() => Array.from({ length: Math.floor(routeLength / 4.5) }, (_, i) => {
    const t = (i * 4.5 + 1) / routeLength
    if (cityIntersections.some(cross => Math.abs(cross - t) * routeLength < 6.5)) return []
    return [-2.3, 2.3].map(offset => {
      const { point, tangent } = atRoad(t, offset)
      return { p: [point.x, .035, point.z] as [number, number, number], yaw: Math.atan2(-tangent.z, tangent.x) }
    })
  }).flat(), [])
  const centerLines = useMemo(() => {
    const cuts: [number, number][] = []; let from = 0
    for (const t of cityIntersections) { cuts.push([from, t - 6.8 / routeLength]); from = t + 6.8 / routeLength }
    cuts.push([from, 1])
    return cuts.flatMap(([a, b]) => [ribbon(-.15, -.07, .035, 32, a, b), ribbon(.07, .15, .035, 32, a, b)])
  }, [])
  const crossings = useMemo(() => cityIntersections.flatMap(cross => [-1, 1].flatMap(direction => {
    const t = cross + direction * 6.1 / routeLength
    return Array.from({ length: 18 }, (_, i) => {
      const { point, tangent, side } = atRoad(t)
      const d = (i - 8.5) * .48
      return { p: [point.x + side.x * d, .039, point.z + side.z * d] as [number, number, number], yaw: Math.atan2(-tangent.z, tangent.x) }
    })
  })), [])
  const whitePaint = useMemo(() => [
    ...laneMarks.map(mark => ({ position: mark.p, yaw: mark.yaw, size: [1.9, .008, .09] as [number, number, number] })),
    ...crossings.map(mark => ({ position: mark.p, yaw: mark.yaw, size: [2.1, .01, .28] as [number, number, number] })),
  ], [laneMarks, crossings])
  useEffect(() => () => {
    road.dispose()
    walks.forEach(walk => { walk.paving.dispose(); walk.curb.dispose(); walk.face.dispose() })
    centerLines.forEach(line => line.dispose())
  }, [road, walks, centerLines])
  return <group>
    <mesh geometry={road} material={surface.road.material} receiveShadow />
    <group position={atRoad(1).point} rotation={[0, Math.atan2(-atRoad(1).tangent.z, atRoad(1).tangent.x), 0]}>
      <mesh position={[22, .018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[44,9.2]} /><primitive object={surface.roadEnd.material} attach="material" /></mesh>
      {[-1,1].map(s => <group key={s}>
        <mesh position={[22,.14,s*7.26]} rotation={[-Math.PI / 2,0,0]} receiveShadow><planeGeometry args={[44,5.08]} /><primitive object={surface.pavingEnd.material} attach="material" /></mesh>
        <mesh position={[22,.115,s*4.67]} receiveShadow><boxGeometry args={[44,.07,.18]} /><meshStandardMaterial color="#b4b0a5" roughness={.87} /></mesh>
        <mesh position={[22,.035,s*.11]} receiveShadow><boxGeometry args={[44,.008,.08]} /><meshStandardMaterial color="#e2cc85" roughness={.9} /></mesh>
        {Array.from({length:9},(_,i)=><mesh key={i} position={[2+i*4.5,.035,s*2.3]}><boxGeometry args={[1.9,.008,.09]} /><meshStandardMaterial color="#edf0ee" roughness={.93} /></mesh>)}
      </group>)}
    </group>
    {walks.map((walk, i) => <group key={i}>
      <mesh geometry={walk.paving} material={surface.paving.material} receiveShadow />
      <mesh geometry={walk.face} castShadow receiveShadow><meshStandardMaterial color="#908e84" roughness={.92} side={DoubleSide} /></mesh>
      <mesh geometry={walk.curb} receiveShadow><meshStandardMaterial color="#b4b0a5" roughness={.87} /></mesh>
    </group>)}
    {centerLines.map((line, i) => <mesh key={`yellow-${i}`} geometry={line} material={surface.yellow} receiveShadow />)}
    {cityIntersections.map(t => {
      const { point, tangent } = atRoad(t)
      return <group key={t} position={[point.x, 0, point.z]} rotation={[0, Math.atan2(-tangent.z, tangent.x), 0]}>
        <mesh position={[0, .018, 0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[9.25,72]} /><primitive object={surface.crossing.material} attach="material" /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * 5.42, .038, 0]} receiveShadow>
          <boxGeometry args={[.20, .009, 8.6]} /><meshStandardMaterial color="#edf0ee" roughness={.9} />
        </mesh>)}
      </group>
    })}
    <BoxInstances blocks={whitePaint} color="#edf0ee" material={surface.paint} shadow={false} />
  </group>
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

type Foliage = { x: number; y: number; z: number; scale: number; color: string; rotation: number }
type Branch = { position: Vector3; quaternion: Quaternion; length: number; width: number }

function Tree({ position, height = 6, seed = 1, species = 0, compact = false, bark, foliage }: {
  position: [number, number, number]; height?: number; seed?: number; species?: number; compact?: boolean; bark: Texture; foliage: Texture
}) {
  const clusterRef = useRef<InstancedMesh>(null)
  const branchRef = useRef<InstancedMesh>(null)
  const clusterGeometry = useMemo(() => {
    const geometry=new PlaneGeometry(1,1,3,3)
    const vertices=geometry.attributes.position
    for(let i=0;i<vertices.count;i++) {
      const x=vertices.getX(i), y=vertices.getY(i)
      vertices.setZ(i,.16*x*x+.13*x*y-.04)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
  const trunkGeometry = useMemo(() => {
    const geometry=new CylinderGeometry(.095,.18,height*.68,12,10)
    const vertices=geometry.attributes.position
    for(let i=0;i<vertices.count;i++) {
      const y=vertices.getY(i), t=(y+height*.34)/(height*.68)
      const flare=1+.5*Math.exp(-t*24)
      vertices.setXYZ(i,vertices.getX(i)*flare+.035*Math.sin(t*4+seed),y,vertices.getZ(i)*flare+.07*t*t)
    }
    geometry.computeVertexNormals()
    return geometry
  },[height,seed])
  const branchGeometry = useMemo(() => new CylinderGeometry(.35, 1, 1, 7), [])
  const branchMaterial = useMemo(() => new MeshStandardMaterial({ map: bark, color: '#b5a88e', roughness: 1 }), [bark])
  const clusterMaterial = useMemo(() => new MeshStandardMaterial({ map: foliage, alphaTest: .48, alphaToCoverage: true, side: DoubleSide, roughness: .78, depthWrite: true, envMapIntensity: .7, emissiveMap: foliage, emissive: '#b2c88b', emissiveIntensity: .12 }), [foliage])
  useEffect(() => () => {
    clusterGeometry.dispose(); trunkGeometry.dispose(); clusterMaterial.dispose(); branchGeometry.dispose(); branchMaterial.dispose()
  }, [clusterGeometry, trunkGeometry, clusterMaterial, branchGeometry, branchMaterial])
  const crown = useMemo(() => {
    const random = seededRandom(seed * 1031 + species * 117)
    const clusters: Foliage[] = [], branches: Branch[] = []
    const tints = species === 1
      ? ['#a4b99a', '#b9c6a6', '#95ae92', '#b0c3a2']
      : species === 2
        ? ['#9fb781', '#b4c597', '#92ae8b', '#bec6a4']
        : ['#adc29f', '#98b18d', '#b3c6a5', '#8faa80']
    const lobes = species === 1 ? 8 : 7
    for (let lobe = 0; lobe < lobes; lobe++) {
      const angle = lobe * Math.PI * 2 / lobes + random() * .4
      const radius = height * (.12 + random() * .055)
      const centerX = Math.cos(angle) * radius
      const centerZ = Math.sin(angle) * radius
      const centerY = height * (.69 + random() * .14)
      const origin = new Vector3(0, height * (.42 + random() * .06), 0)
      const tip = new Vector3(centerX, centerY, centerZ)
      const direction = tip.clone().sub(origin)
      branches.push({
        position: origin.clone().add(tip).multiplyScalar(.5),
        quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()),
        length: direction.length(), width: .075 + random() * .035,
      })
      for (let i = 0; i < (compact ? 25 : 40); i++) {
        const a = random() * Math.PI * 2, r = Math.sqrt(random())
        const x = centerX + Math.cos(a) * r * height * .15
        const z = centerZ + Math.sin(a) * r * height * .15
        const y = centerY + (random() - .5) * height * .28
        clusters.push({ x, y, z, scale: .38 + random() * .58, color: tints[Math.floor(random() * tints.length)], rotation: random() * Math.PI * 2 })
      }
    }
    return { clusters, branches }
  }, [seed, species, height, compact])
  useLayoutEffect(() => {
    const dummy = new Object3D()
    if (branchRef.current) {
      crown.branches.forEach((branch, i) => {
        dummy.position.copy(branch.position)
        dummy.quaternion.copy(branch.quaternion)
        dummy.scale.set(branch.width, branch.length, branch.width)
        dummy.updateMatrix()
        branchRef.current!.setMatrixAt(i, dummy.matrix)
      })
      branchRef.current.instanceMatrix.needsUpdate = true
      branchRef.current.computeBoundingSphere()
    }
    if (clusterRef.current) {
      crown.clusters.forEach((cluster, i) => {
        dummy.position.set(cluster.x, cluster.y, cluster.z)
        dummy.rotation.set(i * .91, cluster.rotation, i * .37)
        dummy.scale.set(cluster.scale * 1.25, cluster.scale, 1)
        dummy.updateMatrix()
        clusterRef.current!.setMatrixAt(i, dummy.matrix)
        clusterRef.current!.setColorAt(i, new Color(cluster.color))
      })
      clusterRef.current.instanceMatrix.needsUpdate = true
      if (clusterRef.current.instanceColor) clusterRef.current.instanceColor.needsUpdate = true
      clusterRef.current.computeBoundingSphere()
    }
  }, [crown])
  useFrame(({ clock }) => {
    const breeze = Math.sin(clock.elapsedTime * .8 + seed * .7)
    if (clusterRef.current) { clusterRef.current.rotation.z = breeze * .009; clusterRef.current.rotation.x = Math.sin(clock.elapsedTime * .55 + seed) * .006 }
    if (branchRef.current) branchRef.current.rotation.z = breeze * .003
  })
  return <group position={position}>
    <mesh geometry={trunkGeometry} position={[0, height * .34, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={bark} bumpMap={bark} bumpScale={.035} color="#a9a08c" roughness={1} />
    </mesh>
    <instancedMesh ref={branchRef} args={[branchGeometry, branchMaterial, crown.branches.length]} castShadow />
    <instancedMesh ref={clusterRef} args={[clusterGeometry, clusterMaterial, crown.clusters.length]} castShadow receiveShadow />
  </group>
}

function Vegetation({ compact }: { compact: boolean }) {
  const bark = useTexture('/media/v20/corteza.webp')
  const foliage = useTexture('/media/v20/follaje.webp')
  bark.colorSpace = SRGBColorSpace
  bark.wrapS = RepeatWrapping; bark.wrapT = RepeatWrapping
  bark.repeat.set(1, 2)
  foliage.colorSpace = SRGBColorSpace
  foliage.anisotropy = 8
  const trees = useMemo(() => {
    const out: { p: [number, number, number]; h: number; species: number }[] = []
    const step = 10.5 / routeLength
    for (let t = .026, i = 0; t < .98; t += step, i++) {
      for (const s of [-1, 1]) {
        if (s === 1 && t > .11 && t < .17) continue
        if (s === -1 && avenuePosters.some(poster => Math.abs(poster.t - t) * routeLength < 3.2)) continue
        if (cityIntersections.some(cross => Math.abs(cross - t) * routeLength < 6.4)) continue
        // Keep both the sign and the camera approach free of foliage.
        if (signStops.some(stop => Math.abs(stop.t - t) * routeLength < (s > 0 ? 5.7 : 6.8))) continue
        const { point } = atRoad(t, s * 6.55)
        out.push({ p: [point.x, .14, point.z], h: 5.8 + (i % 4) * .44, species: (i + (s > 0 ? 0 : 2)) % 3 })
      }
    }
    return out
  }, [])
  return <group>
    {trees.map((tree, i) => <group key={`tree-${i}`}>
      <mesh position={[tree.p[0], .16, tree.p[2]]} receiveShadow><boxGeometry args={[1.38, .10, 1.38]} /><meshStandardMaterial color="#879b9f" roughness={.9} /></mesh>
      <mesh position={[tree.p[0], .218, tree.p[2]]} receiveShadow><boxGeometry args={[1.14, .012, 1.14]} /><meshStandardMaterial color="#4c5344" roughness={1} /></mesh>
      <Tree position={tree.p} height={tree.h} species={tree.species} seed={i + 11} compact={compact} bark={bark} foliage={foliage} />
    </group>)}
  </group>
}

function AvenueIdentity() {
  const signs = useMemo(() => ['AV. CORRIENTES', 'DIAGONAL NORTE', 'AV. DE MAYO'].map((label, i) => {
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 130
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#123f52'; ctx.fillRect(0, 0, 600, 130)
    ctx.strokeStyle = '#e9f2ec'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 584, 114)
    ctx.fillStyle = '#f4f5e8'; ctx.font = '700 50px Arial, sans-serif'; ctx.textBaseline = 'middle'
    ctx.fillText(label, 29, 68, 550)
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace
    return { texture, t: [.09, .47, .72][i] }
  }), [])
  return <group>{signs.map((sign, i) => {
    const { point, tangent } = atRoad(sign.t, -6.7)
    return <group key={i} position={[point.x, .12, point.z]} rotation={[0, Math.atan2(-tangent.z, tangent.x), 0]}>
      <mesh position={[0, 2.45, 0]} castShadow><cylinderGeometry args={[.055, .075, 4.9, 8]} /><meshStandardMaterial color="#566568" metalness={.62} roughness={.45} /></mesh>
      <mesh position={[.88, 4.7, 0]} castShadow><boxGeometry args={[1.85, .06, .07]} /><meshStandardMaterial color="#566568" metalness={.62} roughness={.45} /></mesh>
      <mesh position={[2.05, 4.7, 0]} castShadow><boxGeometry args={[2.6, .58, .1]} /><meshStandardMaterial color="#153b4b" metalness={.15} roughness={.62} /></mesh>
      <mesh position={[2.05, 4.7, .055]}><planeGeometry args={[2.5, .48]} /><meshStandardMaterial map={sign.texture} roughness={.8} /></mesh>
    </group>
  })}</group>
}

export function CityEnvironment({ compact }: { compact: boolean }) {
  return <group>
    <mesh position={[routeLength / 2 - 8, -.12, 0]} receiveShadow><boxGeometry args={[routeLength + 100, .22, 240]} /><meshStandardMaterial color="#94948b" roughness={1} /></mesh>
    <RoadSystem />
    <DestinationStop />
    <ModernBuildings />
    <Vegetation compact={compact} />
    <ModernStreetFurniture />
    <CityStreetDetails />
    <AvenueIdentity />
    <ElevatedStreetSigns />
    <CityLife compact={compact} />
  </group>
}

export const cityBounds = { min: route.getPointAt(0).x, max: route.getPointAt(1).x }


