import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { CanvasTexture, MeshBasicMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { insuranceLogoAtlas, insurancePartners } from '../data/insurancePartners'
import { driveState } from '../experience/route'

useTexture.preload(insuranceLogoAtlas.src)
const PITCH = 176, HEIGHT = 96, VISIBLE_CARDS = 2.65, SECONDS_PER_CARD = 2.6

/** One reusable strip: scrolling UVs never uploads pixels during animation. */
export function InsuranceLogoCarousel({ progress, stop }: { progress: MutableRefObject<number>; stop: number }) {
  const atlas = useTexture(insuranceLogoAtlas.src)
  const { gl } = useThree()
  const paused = useRef(false)
  const travel = useRef(0)
  const artwork = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = PITCH * insurancePartners.length; canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')!
    insurancePartners.forEach((partner,index) => {
      const left = index * PITCH + 9
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.roundRect(left,8,PITCH-18,80,10); ctx.fill()
      const [x,y,w,h] = partner.crop
      const fit = Math.min((PITCH-38)/w,58/h)
      // Full supplied artwork at its original proportions, without extra captions.
      ctx.save(); ctx.beginPath(); ctx.roundRect(left,8,PITCH-18,80,10); ctx.clip()
      ctx.drawImage(atlas.image as CanvasImageSource,x,y,w,h,
        index*PITCH+(PITCH-w*fit)/2,(HEIGHT-h*fit)/2,w*fit,h*fit)
      ctx.restore()
    })
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8
    texture.wrapS = RepeatWrapping
    texture.repeat.set(VISIBLE_CARDS / insurancePartners.length,1)
    const material = new MeshBasicMaterial({ map:texture, toneMapped:false, transparent:true, depthWrite:false })
    material.onBeforeCompile = shader => {
      // Edge fades hide the wrapping strip without clipping extra geometry.
      shader.vertexShader = 'varying vec2 vCarouselUv;\n'+shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvCarouselUv = uv;')
      shader.fragmentShader = 'varying vec2 vCarouselUv;\n'+shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        '#include <opaque_fragment>\ngl_FragColor.a *= smoothstep(0.0,0.065,vCarouselUv.x) * smoothstep(0.0,0.065,1.0-vCarouselUv.x);')
    }
    material.customProgramCacheKey = () => 'insurance-logo-strip-v31'
    return { texture, material }
  }, [atlas])
  useEffect(() => {
    gl.domElement.dataset.insuranceMotion = 'continuous-right-to-left'
    return () => {
      artwork.material.dispose(); artwork.texture.dispose()
      delete gl.domElement.dataset.insuranceLogo; delete gl.domElement.dataset.insuranceMotion
      delete gl.domElement.dataset.insuranceOffset
    }
  }, [artwork,gl])
  useFrame((_,delta) => {
    const visible = Math.abs(driveState(progress.current).t-stop) < .075
    if (!visible || document.hidden || paused.current) return
    travel.current = (travel.current + Math.min(delta,.05)/SECONDS_PER_CARD) % insurancePartners.length
    // Increasing sampled X moves the artwork from right to left.
    artwork.texture.offset.x = travel.current / insurancePartners.length
    gl.domElement.dataset.insuranceLogo = insurancePartners[Math.floor(travel.current)].name
    gl.domElement.dataset.insuranceOffset = travel.current.toFixed(3)
  })
  return <mesh position={[0,4.65+(950-675)*8.42/1900,.129]}
    material={artwork.material}
    onPointerOver={() => { paused.current = true }} onPointerOut={() => { paused.current = false }}>
    <planeGeometry args={[5.35,5.35*HEIGHT/(PITCH*VISIBLE_CARDS)]} />
  </mesh>
}
