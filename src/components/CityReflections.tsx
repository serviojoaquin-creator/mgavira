import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CubeCamera, HalfFloatType, Mesh, MeshStandardMaterial, PMREMGenerator, WebGLCubeRenderTarget, type Object3D, type Texture } from 'three'
import { atRoad } from '../experience/route'

/** A local reflection capture, made once after assets are ready; no per-frame cube rendering. */
export function CityReflections() {
  const { gl, scene } = useThree()
  const capture = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!gl.extensions.has('EXT_color_buffer_float')) return
    const cube = new WebGLCubeRenderTarget(128, { type: HalfFloatType })
    const camera = new CubeCamera(.15, 150, cube)
    const point = atRoad(.14, 1.45).point
    camera.position.set(point.x, 1.55, point.z)
    const generator = new PMREMGenerator(gl)
    let filtered: ReturnType<PMREMGenerator['fromCubemap']> | undefined
    const originals = new Map<MeshStandardMaterial, Texture | null>()
    capture.current = () => {
      const hidden: Object3D[] = []
      scene.traverse(object => {
        if (object.userData.excludeReflection && object.visible) { hidden.push(object); object.visible = false }
      })
      const autoShadow = gl.shadowMap.autoUpdate
      try {
        gl.shadowMap.autoUpdate = false
        camera.update(gl, scene)
        filtered = generator.fromCubemap(cube.texture)
        scene.traverse(object => {
          if (!(object instanceof Mesh)) return
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
            if (material instanceof MeshStandardMaterial && material.roughness < .5 && !originals.has(material)) {
              originals.set(material, material.envMap)
              material.envMap = filtered!.texture
              material.needsUpdate = true
            }
          }
        })
      } finally {
        hidden.forEach(object => { object.visible = true })
        gl.shadowMap.autoUpdate = autoShadow
        capture.current = null
      }
    }
    return () => {
      capture.current = null
      originals.forEach((map, material) => { material.envMap = map; material.needsUpdate = true })
      filtered?.dispose(); cube.dispose(); generator.dispose()
    }
  }, [gl, scene])
  useFrame(() => capture.current?.(), .5)
  return null
}

