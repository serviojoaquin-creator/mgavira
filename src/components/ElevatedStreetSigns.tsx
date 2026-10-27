import { Suspense, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { BufferGeometry, CanvasTexture, Matrix4, Quaternion, SRGBColorSpace, Vector3, BoxGeometry, type Texture } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { atRoad } from '../experience/route'
import { avenuePosters } from '../data/avenuePosters'

const PANEL_WIDTH = 6.2
const PANEL_HEIGHT = 3.15
const PANEL_CENTER = 6.48
const PANEL_OFFSET = 1.45 // Center the artwork above the lane used by the visitor's car.
const IMAGE_WIDTH = PANEL_WIDTH - .18
const IMAGE_HEIGHT = PANEL_HEIGHT - .18
const HALF_SPAN = 5.85
const LOWER_RAIL = 4.78
const UPPER_RAIL = 8.18

type Point = [number, number, number]

/** Bake the small structural members once, instead of drawing every brace separately. */
function gantryGeometry() {
  const steel: BufferGeometry[] = []
  const footings: BufferGeometry[] = []
  const up = new Vector3(0, 1, 0)
  const addBox = (parts: BufferGeometry[], size: Point, position: Point) => {
    const geometry = new BoxGeometry(...size)
    geometry.translate(...position)
    parts.push(geometry)
  }
  const beam = (a: Point, b: Point, width = .10, depth = width) => {
    const start = new Vector3(...a), end = new Vector3(...b)
    const direction = end.clone().sub(start)
    const matrix = new Matrix4().compose(start.add(end).multiplyScalar(.5),
      new Quaternion().setFromUnitVectors(up, direction.clone().normalize()), new Vector3(1, 1, 1))
    steel.push(new BoxGeometry(width, direction.length(), depth).applyMatrix4(matrix))
  }
  for (const x of [-HALF_SPAN, HALF_SPAN]) {
    addBox(footings, [.85, .28, .95], [x, .14, 0])
    addBox(steel, [.72, .09, .82], [x, .325, 0])
    for (const z of [-.29, .29]) {
      beam([x, .37, z], [x, UPPER_RAIL + .08, z], .18)
      for (let y = .6; y < LOWER_RAIL; y += 1.3) {
        // Open lattice columns, rather than oversized solid pillars.
        beam([x, y, z], [x, Math.min(y + 1.3, LOWER_RAIL), -z], .065)
      }
    }
    for (const dx of [-.25, .25]) for (const z of [-.31, .31]) {
      addBox(steel, [.065, .075, .065], [x + dx, .40, z])
    }
  }
  const bays = 8
  const bayWidth = HALF_SPAN * 2 / bays
  for (const z of [-.29, .29]) {
    for (const y of [LOWER_RAIL, UPPER_RAIL]) beam([-HALF_SPAN, y, z], [HALF_SPAN, y, z], .15)
    for (let i = 0; i <= bays; i++) {
      const x = -HALF_SPAN + i * bayWidth
      beam([x, LOWER_RAIL, z], [x, UPPER_RAIL, z], .085)
      if (i < bays) beam([x, i % 2 ? UPPER_RAIL : LOWER_RAIL, z],
        [x + bayWidth, i % 2 ? LOWER_RAIL : UPPER_RAIL, z], .075)
      for (const y of [LOWER_RAIL, UPPER_RAIL]) beam([x, y, -.29], [x, y, .29], .075)
    }
  }
  const merge = (parts: BufferGeometry[]) => {
    const merged = mergeGeometries(parts, false)!
    parts.forEach(part => part.dispose())
    merged.computeBoundingSphere()
    return merged
  }
  return { steel: merge(steel), footings: merge(footings) }
}

function blankPoster() {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#181c20'; ctx.fillRect(0, 0, 256, 128)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function PosterFaces({ texture }: { texture: Texture }) {
  const image = texture.image as { width: number; height: number }
  const aspect = image.width / image.height
  // Contain: the people and the CUD remain complete, without stretching or cropping.
  const width = Math.min(IMAGE_WIDTH, IMAGE_HEIGHT * aspect)
  const height = width / aspect
  return <>{[1, -1].map(face => <group key={face}
    position={[PANEL_OFFSET, PANEL_CENTER, face * .455]} rotation={[0, face === 1 ? 0 : Math.PI, 0]}>
    <mesh position={[0, 0, -.006]}>
      <planeGeometry args={[IMAGE_WIDTH, IMAGE_HEIGHT]} />
      <meshBasicMaterial color="#10151a" toneMapped={false} />
    </mesh>
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  </group>)}</>
}

function SuppliedPoster({ image }: { image: string }) {
  const texture = useTexture(image)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return <PosterFaces texture={texture} />
}

export function ElevatedStreetSigns() {
  const placeholder = useMemo(blankPoster, [])
  const structure = useMemo(gantryGeometry, [])
  useEffect(() => () => {
    placeholder.dispose()
    structure.steel.dispose()
    structure.footings.dispose()
  }, [placeholder, structure])
  return <group name="Pórticos publicitarios · fotografías sobre la avenida">
    {avenuePosters.map(poster => {
      const { point, tangent } = atRoad(poster.t)
      // Local X crosses the avenue; the front faces the approaching car.
      const yaw = Math.atan2(-tangent.x, -tangent.z)
      return <group key={poster.id} name={poster.id} position={[point.x, 0, point.z]} rotation={[0, yaw, 0]}>
        <mesh geometry={structure.footings} castShadow receiveShadow>
          <meshStandardMaterial color="#b5b4ab" roughness={.91} />
        </mesh>
        <mesh geometry={structure.steel} castShadow receiveShadow>
          <meshStandardMaterial color="#9ca9af" metalness={.72} roughness={.43} />
        </mesh>
        <mesh position={[PANEL_OFFSET, PANEL_CENTER, 0]} castShadow receiveShadow>
          <boxGeometry args={[PANEL_WIDTH + .09, PANEL_HEIGHT + .09, .88]} />
          <meshStandardMaterial color="#68767e" metalness={.72} roughness={.4} />
        </mesh>
        <mesh position={[PANEL_OFFSET, PANEL_CENTER, 0]} castShadow receiveShadow>
          <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, .90]} />
          <meshStandardMaterial color="#20272c" metalness={.35} roughness={.65} />
        </mesh>
        <Suspense fallback={<PosterFaces texture={placeholder} />}>
          {poster.image ? <SuppliedPoster image={poster.image} /> : <PosterFaces texture={placeholder} />}
        </Suspense>
      </group>
    })}
  </group>
}