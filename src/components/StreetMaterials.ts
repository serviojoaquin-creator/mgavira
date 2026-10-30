import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { CanvasTexture, MeshStandardMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'

/** Photographic CC0 surfaces, tiled in metres instead of stretching over the avenue. */
export function useStreetMaterials() {
  const source = useTexture([
    '/media/v22/asphalt-color.webp', '/media/v27/asphalt-normal.webp', '/media/v22/asphalt-arm.webp',
    '/media/v22/paving-color.webp', '/media/v27/paving-normal.webp', '/media/v22/paving-arm.webp',
  ])
  const materials = useMemo(() => {
    const textures = [] as CanvasTexture[]
    const surface = (paving: boolean, x: number, y: number) => {
      const maps = source.slice(paving ? 3 : 0, paving ? 6 : 3).map((texture, i) => {
        const copy = texture.clone()
        copy.colorSpace = i === 0 ? SRGBColorSpace : NoColorSpace
        copy.wrapS = copy.wrapT = RepeatWrapping
        copy.repeat.set(x, y); copy.anisotropy = 8; copy.needsUpdate = true
        return copy
      })
      const material = new MeshStandardMaterial({
        color: paving ? '#e1ded5' : '#9a9c9c',
        map: maps[0], normalMap: maps[1], roughnessMap: maps[2], aoMap: maps[2],
        aoMapIntensity: .65, roughness: .93,
        normalScale: new Vector2(paving ? .35 : .19, paving ? .35 : .19),
      })
      return { material, maps }
    }
    const road = surface(false, 4 / 1.5, 9.2 / 1.5)
    const crossing = surface(false, 9.25 / 1.5, 72 / 1.5)
    const roadEnd = surface(false, 44 / 1.5, 9.2 / 1.5)
    const paving = surface(true, 4 / 1.8, 5.08 / 1.8)
    const pavingEnd = surface(true, 44 / 1.8, 5.08 / 1.8)
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#e3e0d6'; ctx.fillRect(0, 0, 128, 128)
    let seed = 91
    for (let i = 0; i < 1000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const x = seed % 128, y = (seed >>> 9) % 128
      ctx.fillStyle = i % 4 ? '#bcbab0' : '#878781'
      ctx.fillRect(x, y, i % 3 ? 1 : 2, 1)
    }
    const wear = new CanvasTexture(canvas); wear.colorSpace = SRGBColorSpace; wear.anisotropy = 8
    textures.push(wear)
    const paint = new MeshStandardMaterial({ color: '#f4f1e5', map: wear, roughness: .86 })
    const yellow = paint.clone(); yellow.color.set('#e2c36d')
    return { road, crossing, roadEnd, paving, pavingEnd, paint, yellow, textures }
  }, [source])
  useEffect(() => () => {
    for (const item of [materials.road, materials.crossing, materials.roadEnd, materials.paving, materials.pavingEnd]) {
      item.material.dispose(); item.maps.forEach(t => t.dispose())
    }
    materials.paint.dispose(); materials.yellow.dispose(); materials.textures.forEach(t => t.dispose())
  }, [materials])
  return materials
}

