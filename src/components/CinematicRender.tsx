import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DepthTexture, HalfFloatType, UnsignedIntType, WebGLRenderTarget, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

// Reuse beauty-pass depth: no second city draw, and cutout leaves keep their silhouette.
class SceneOcclusion extends GTAOPass {
  render(renderer: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget) {
    if (read.depthTexture) this.setGBuffer(read.depthTexture)
    super.render(renderer, write, read, 0, false)
  }
  dispose() {
    super.dispose()
    this.gtaoMaterial.dispose()
    this.blendMaterial.dispose()
  }
}

const photographicFinish = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(color, vec3(.2126, .7152, .0722));
      color = mix(vec3(luma), color, .96);
      color += vec3(-.006, .001, .008) * (1.0 - smoothstep(.08, .48, luma));
      color += vec3(.008, .003, -.005) * smoothstep(.55, .95, luma);
      float edge = smoothstep(.28, .76, distance(vUv, vec2(.5)));
      gl_FragColor = vec4(color * (1.0 - .075 * edge), 1.0);
    }`,
}

export function CinematicRender({ compact }: { compact: boolean }) {
  const { gl, scene, camera, size } = useThree()
  const pipeline = useRef<EffectComposer | null>(null)
  const timing = useRef({ warmup: 0, elapsed: 0, frames: 0, checked: false, ao: null as GTAOPass | null })
  useEffect(() => {
    if (!gl.extensions.has('EXT_color_buffer_float')) return
    const target = new WebGLRenderTarget(size.width, size.height, {
      type: HalfFloatType, samples: 2,
      depthTexture: new DepthTexture(size.width, size.height, UnsignedIntType),
    })
    const composer = new EffectComposer(gl, target)
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), compact ? 1.25 : 1.5))
    const render = new RenderPass(scene, camera)
    const ao = new SceneOcclusion(scene, camera)
    ao.updateGtaoMaterial({ radius: .65, thickness: 1.1, distanceFallOff: .8, scale: 1, samples: compact ? 8 : 12 })
    ao.updatePdMaterial({ radius: 3, samples: compact ? 6 : 10, depthPhi: 2, normalPhi: 3 })
    ao.blendIntensity = .72
    const output = new OutputPass()
    const finish = new ShaderPass(photographicFinish)
    composer.addPass(render)
    composer.addPass(ao)
    composer.addPass(output)
    composer.addPass(finish)
    composer.setSize(size.width, size.height)
    pipeline.current = composer
    timing.current = { warmup: 0, elapsed: 0, frames: 0, checked: false, ao }
    gl.domElement.dataset.renderQuality = 'cinematic'
    return () => {
      pipeline.current = null
      render.dispose(); ao.dispose(); output.dispose(); finish.dispose(); composer.dispose()
    }
  }, [gl, scene, camera, compact, size.width, size.height])
  useFrame((_, delta) => {
    if (pipeline.current) pipeline.current.render(delta)
    else gl.render(scene, camera)
    const sample = timing.current
    if (!pipeline.current || sample.checked || document.visibilityState !== 'visible' || delta > .2) return
    sample.warmup += delta
    if (sample.warmup < 4) return
    sample.elapsed += delta; sample.frames++
    if (sample.elapsed < 3) return
    const fps = sample.frames / sample.elapsed
    // Preserve smooth scrolling on slower GPUs while retaining all photographic materials.
    if (fps < 26 && sample.ao) {
      sample.ao.enabled = false
      pipeline.current.setPixelRatio(1)
      gl.domElement.dataset.renderQuality = 'balanced'
      sample.ao = null; sample.elapsed = 0; sample.frames = 0
      return
    }
    if (import.meta.env.DEV) gl.domElement.dataset.sampleFps = fps.toFixed(1)
    sample.checked = true
  }, 1)
  return null
}


