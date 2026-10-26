import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, CapsuleGeometry, CanvasTexture, CircleGeometry, Color, InstancedMesh, Object3D, Quaternion, SphereGeometry, Vector3, RepeatWrapping } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { atRoad, routeLength } from '../experience/route'

export type Person = { start: number; end: number; offset: number; phase: number; scale: number; jacket: string; skin: string; trousers: string; standing?: boolean }
const up = new Vector3(0, 1, 0)
type Point = [number, number, number]

function tailoredTorso() {
  const rings = [[-.5,.78,.83],[-.32,.81,.87],[-.05,.91,.98],[.25,1,.97],[.40,.91,.78],[.5,.40,.55]]
  const positions: number[] = [], indices: number[] = []
  rings.forEach(([y, width, depth], r) => {
    for (let i = 0; i <= 20; i++) {
      const a = i * Math.PI / 10
      const fold = 1 + .018 * Math.sin(i * 3 + r * 2)
      positions.push(Math.cos(a) * .5 * depth * fold, y, Math.sin(a) * .5 * width * fold)
      if (r && i < 20) { const n = r * 21 + i; indices.push(n,n+1,n-21,n+1,n-20,n-21) }
    }
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function humanHead() {
  const skull = new SphereGeometry(.5, 16, 12); skull.scale(.9,1.22,.88)
  const nose = new SphereGeometry(.09, 8, 6); nose.scale(1,.85,.63); nose.translate(.43,-.045,0)
  const ears = [-1,1].map(s => { const g = new SphereGeometry(.09,8,6); g.scale(.55,1,.65); g.translate(-.01,-.02,s*.43); return g })
  const geometries = [skull,nose,...ears]
  const head = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  return head
}

/** Shared geometry batches for all pedestrians, including articulated elbows and knees. */
export function CityPedestrians({ people }: { people: Person[] }) {
  const refs = useRef<(InstancedMesh | null)[]>([])
  const geometries = useMemo(() => [tailoredTorso(), humanHead(),
    new SphereGeometry(.51,16,10,0,Math.PI*2,0,Math.PI*.59),
    new CapsuleGeometry(.5,1,4,10), new SphereGeometry(.5,12,8),
    new CapsuleGeometry(.5,1,4,10).rotateZ(Math.PI/2), tailoredTorso(), new CircleGeometry(.5,24).rotateX(-Math.PI/2)], [])
  const fabric = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#b9b9b9'; ctx.fillRect(0, 0, 64, 64)
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#aaaaaa' : '#cecece'
      ctx.fillRect(x, y, 1, 1)
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(3, 4)
    return texture
  }, [])
  const contact = useMemo(() => {
    const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64
    const ctx=canvas.getContext('2d')!; const gradient=ctx.createRadialGradient(32,32,2,32,32,32)
    gradient.addColorStop(0,'rgba(0,0,0,.45)'); gradient.addColorStop(.45,'rgba(0,0,0,.15)'); gradient.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64)
    return new CanvasTexture(canvas)
  },[])
  const scratch = useMemo(() => ({ dummy: new Object3D(), a: new Vector3(), b: new Vector3(), direction: new Vector3(), q: new Quaternion(), color: new Color(), counts: new Array(8).fill(0) as number[] }), [])
  useEffect(() => () => { geometries.forEach(g => g.dispose()); contact.dispose(); fabric.dispose() }, [geometries,contact,fabric])
  useFrame(({ clock }) => {
    if (refs.current.some(r => !r)) return
    const { dummy, a, b, direction, q, color, counts } = scratch
    counts.fill(0)
    people.forEach((person, index) => {
      const range = (person.end - person.start) * routeLength
      const distance = clock.elapsedTime * (1.02 + index % 3 * .09) + person.phase * 2
      const cycle = range > 0 ? distance % (range * 2) : 0
      const forward = cycle <= range
      const along = forward ? cycle : range * 2 - cycle
      const t = person.start + along / routeLength
      const { point, tangent } = atRoad(t, person.offset)
      const yaw = Math.atan2(-tangent.z, tangent.x) + (forward ? 0 : Math.PI)
      const cos = Math.cos(yaw), sin = Math.sin(yaw), scale = person.scale
      const gait = distance * 5.2 + person.phase
      const bob = person.standing ? Math.sin(clock.elapsedTime*.8 + index)*.003 : Math.cos(gait*2)*.012
      const world = (v: Vector3, x: number, y: number, z: number) => v.set(point.x+(x*cos+z*sin)*scale, .15+(y+bob)*scale, point.z+(-x*sin+z*cos)*scale)
      const write = (kind: number, tint: string) => {
        dummy.updateMatrix(); const mesh = refs.current[kind]!
        mesh.setMatrixAt(counts[kind],dummy.matrix); mesh.setColorAt(counts[kind]++,color.set(tint))
      }
      const part = (kind: number, p: Point, size: Point, tint: string) => {
        world(dummy.position,...p); dummy.rotation.set(0,yaw,0); dummy.scale.set(size[0]*scale,size[1]*scale,size[2]*scale); write(kind,tint)
      }
      const limb = (from: Point,to: Point,width: number,tint: string) => {
        world(a,...from); world(b,...to); direction.subVectors(b,a)
        const length = direction.length()
        q.setFromUnitVectors(up,direction.multiplyScalar(1/length))
        dummy.position.copy(a).add(b).multiplyScalar(.5); dummy.quaternion.copy(q)
        dummy.scale.set(width*scale,length/2,width*scale); write(3,tint)
      }
      const hair = ['#30251d','#5a3d28','#302d2a','#746353'][index%4]
      part(7,[0,.006-bob,0],[.72,1,.52],'#ffffff')
      // Torso, neck, pelvis and cranium meet: no floating heads or ball-shaped chest.
      part(0,[0,1.19,0],[.25,.56,.43],person.jacket)
      part(4,[0,.905,0],[.24,.20,.31],person.trousers)
      part(3,[0,1.49,0],[.105,.06,.11],person.skin)
      part(1,[.012,1.64,0],[.22,.205,.235],person.skin)
      // Small recessed eyes and brows, sized for a human face at street scale.
      for (const s of [-1,1]) {
        part(4,[.102,1.663,s*.045],[.008,.009,.015],'#3b3029')
        part(4,[.098,1.680,s*.047],[.010,.006,.025],hair)
      }
      part(4,[.108,1.603,0],[.006,.006,.034],'#80594b')
      part(2,[0,1.655,0],[.205,.235,.215],hair)
      if (index%3===0) part(4,[-.069,1.55,0],[.11,.28,.23],hair)
      // Shirt placket and collar lend recognizable clothing detail at street distance.
      part(4,[.124,1.24,0],[.008,.36,.023],'#d4d0c5')
      for (const s of [-1,1]) {
        const swing = person.standing ? .015 : Math.sin(gait + (s<0?Math.PI:0))*.26
        const lift = person.standing ? 0 : Math.max(0,Math.cos(gait + (s<0?Math.PI:0)))*.09
        const hip: Point = [0,.91,s*.09], ankle: Point = [swing,.095+lift,s*.095]
        const dx = ankle[0]-hip[0], dy = ankle[1]-hip[1], length = Math.hypot(dx,dy)
        const bend = Math.sqrt(Math.max(.0001,.43*.43-length*length/4))
        const knee: Point = [dx/2 - dy/length*bend,(hip[1]+ankle[1])/2+dx/length*bend,s*.095]
        limb(hip,knee,.145,person.trousers); limb(knee,ankle,.112,person.trousers)
        part(4,knee,[.115,.125,.118],person.trousers)
        part(5,[ankle[0]+.045,.055+lift,s*.095],[.125,.075,.11],'#292723')
        const elbow: Point = [-swing*.65,1.135,s*.225]
        const hand: Point = [-swing*.8+.07,.90,s*.225]
        limb([-.005,1.405,s*.185],elbow,.105,person.jacket)
        limb(elbow,hand,.085,person.jacket)
        part(4,elbow,[.087,.092,.087],person.jacket)
        part(4,hand,[.075,.115,.065],person.skin)
      }
      if (index%3===1) {
        part(6,[-.17,1.20,0],[.17,.39,.29],'#4e4538')
        for (const s of [-1,1]) limb([.05,1.42,s*.13],[.08,1.01,s*.13],.024,'#3c342b')
      }
    })
    refs.current.forEach((mesh,i) => {
      if (!mesh) return
      mesh.count = counts[i]; mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  })
  return <group>{geometries.map((geometry,i) => <instancedMesh key={i} ref={node => { refs.current[i]=node }}
    args={[geometry,undefined,people.length*24]} frustumCulled={false} castShadow={i!==7} receiveShadow={i!==7}>
    {i===7 ? <meshBasicMaterial map={contact} transparent depthWrite={false} toneMapped={false} /> : <meshStandardMaterial roughness={i===1?.63:i===5?.58:.89} bumpMap={i===0||i===3||i===6?fabric:undefined} bumpScale={.0016} />}
  </instancedMesh>)}</group>
}
