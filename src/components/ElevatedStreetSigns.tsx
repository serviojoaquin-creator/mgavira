import { Suspense, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'
import { atRoad } from '../experience/route'
import { avenuePosters } from '../data/avenuePosters'

const PANEL_WIDTH = 3.2
const PANEL_HEIGHT = 2.2
const PANEL_CENTER = 3.55
const IMAGE_WIDTH = PANEL_WIDTH - .12
const IMAGE_HEIGHT = PANEL_HEIGHT - .12

function blankPoster() {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#eeece7'; ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#d5d0ca'; ctx.lineWidth = 1; ctx.strokeRect(10, 10, 236, 236)
  // Quiet brand accents leave the entire square ready for the client's artwork.
  ctx.fillStyle = '#b879de'; ctx.fillRect(97, 224, 35, 4)
  ctx.fillStyle = '#00ae83'; ctx.fillRect(138, 224, 21, 4)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function PosterFaces({ texture }: { texture: Texture }) {
  const image = texture.image as { width: number; height: number }
  const aspect = image.width / image.height
  const width = Math.min(IMAGE_WIDTH, IMAGE_HEIGHT * aspect)
  const height = width / aspect
  return <>{[1, -1].map(face => <group key={face} position={[0, PANEL_CENTER, face * .12]} rotation={[0, face === 1 ? 0 : Math.PI, 0]}>
    <mesh position={[0, 0, -.004]}>
      <planeGeometry args={[IMAGE_WIDTH, IMAGE_HEIGHT]} />
      <meshStandardMaterial color="#17151c" roughness={.72} />
    </mesh>
    <mesh>
      <planeGeometry args={[width, height]} />
      {/* Backlit artwork keeps the photographs readable on the shaded sidewalk. */}
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
  useEffect(() => () => placeholder.dispose(), [placeholder])
  return <group name="Carteles elevados · vereda izquierda">
    {avenuePosters.map(poster => {
      const { point, tangent, side } = atRoad(poster.t, -5.2)
      // Face the approaching driver and the road, rather than the building behind.
      const yaw = Math.atan2(-tangent.x * .8 + side.x * .6, -tangent.z * .8 + side.z * .6)
      return <group key={poster.id} name={poster.id} position={[point.x, .14, point.z]} rotation={[0, yaw, 0]}>
        <mesh position={[0, .035, 0]} castShadow receiveShadow>
          <boxGeometry args={[.38, .07, .38]} />
          <meshStandardMaterial color="#41444a" metalness={.7} roughness={.45} />
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[.07, .09, 3.8, 12]} />
          <meshStandardMaterial color="#383c43" metalness={.7} roughness={.38} />
        </mesh>
        <mesh position={[0, PANEL_CENTER, 0]} castShadow receiveShadow>
          <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, .20]} />
          <meshStandardMaterial color="#35363e" metalness={.5} roughness={.38} />
        </mesh>
        <Suspense fallback={<PosterFaces texture={placeholder} />}>
          {poster.image ? <SuppliedPoster image={poster.image} /> : <PosterFaces texture={placeholder} />}
        </Suspense>
      </group>
    })}
  </group>
}

