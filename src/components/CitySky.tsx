import { useEffect } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { EquirectangularReflectionMapping, PMREMGenerator } from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'

/** Local CC0 panoramas: real cloud detail and filtered urban reflections. */
export function CitySky() {
  const { scene, gl } = useThree()
  const [sky, street] = useLoader(HDRLoader, ['/media/v20/daylight-sky.hdr', '/media/v20/urban-street.hdr'])
  useEffect(() => {
    const previous = { background: scene.background, environment: scene.environment,
      intensity: scene.environmentIntensity, backgroundIntensity: scene.backgroundIntensity,
      rotation: scene.backgroundRotation.clone(), envRotation: scene.environmentRotation.clone() }
    sky.mapping = EquirectangularReflectionMapping
    const generator = new PMREMGenerator(gl)
    const filtered = generator.fromEquirectangular(street)
    generator.dispose()
    scene.background = sky
    scene.backgroundIntensity = .85
    scene.backgroundRotation.set(0, 2.65, 0)
    scene.environment = filtered.texture
    scene.environmentIntensity = .85
    scene.environmentRotation.set(0, .6, 0)
    return () => {
      scene.background = previous.background; scene.environment = previous.environment
      scene.backgroundIntensity = previous.backgroundIntensity; scene.environmentIntensity = previous.intensity
      scene.backgroundRotation.copy(previous.rotation); scene.environmentRotation.copy(previous.envRotation)
      filtered.dispose()
    }
  }, [scene, gl, sky, street])
  return null
}
