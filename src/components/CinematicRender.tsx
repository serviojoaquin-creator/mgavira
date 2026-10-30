import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DepthTexture, HalfFloatType, UnsignedByteType, UnsignedIntType, Vector2, WebGLRenderTarget, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { qualityDecision, resolutionRange } from '../experience/renderQuality'

// AO needs far fewer pixels than silhouettes, typography and photographic textures.
class SceneOcclusion extends GTAOPass {
  setSize(width: number, height: number) { super.setSize(Math.ceil(width * .5), Math.ceil(height * .5)) }
  render(renderer: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget) {
    if (read.depthTexture && this.depthTexture !== read.depthTexture) this.setGBuffer(read.depthTexture)
    super.render(renderer, write, read, 0, false)
  }
  dispose() { super.dispose(); this.gtaoMaterial.dispose(); this.blendMaterial.dispose() }
}

export function CinematicRender({ compact, progress }: { compact: boolean; progress: MutableRefObject<number> }) {
  const { gl, scene, camera, size, setDpr } = useThree()
  const pipeline = useRef<{ composer: EffectComposer; ao: SceneOcclusion | null; output: OutputPass } | null>(null)
  const timing = useRef({ warmup: 0, elapsed: 0, frames: 0, slow: 0, fast: 0, aoCooldown: 0, lastProgress: 0, ratio: 1.5, minimum: 1.25, maximum: 1.5 })
  // Create GPU resources once. Resizes update targets without rebuilding effects/shaders.
  useEffect(() => {
    const hdr = gl.extensions.has('EXT_color_buffer_float')
    const target = new WebGLRenderTarget(1, 1, {
      type: hdr ? HalfFloatType : UnsignedByteType, samples: Math.min(2, gl.capabilities.maxSamples),
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    })
    const composer = new EffectComposer(gl, target)
    const render = new RenderPass(scene, camera)
    const ao = hdr ? new SceneOcclusion(scene, camera) : null
    if (ao) {
      ao.updateGtaoMaterial({ radius: .55, thickness: .8, distanceFallOff: .85, scale: 1, samples: 8 })
      ao.updatePdMaterial({ radius: 3, samples: 6, depthPhi: 3, normalPhi: 3 })
      ao.output = GTAOPass.OUTPUT.Off
      ao.needsSwap = false
    }
    // AO compositing, tone mapping and restrained color grading share a single pass.
    const output = new OutputPass()
    Object.assign(output.uniforms, { tAO: { value: ao?.gtaoMap ?? target.texture }, aoStrength: { value: ao ? .55 : 0 }, texel: { value: new Vector2(1, 1) } })
    output.material.fragmentShader = output.material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform sampler2D tAO; uniform float aoStrength; uniform vec2 texel;')
      .replace('// tone mapping', `
        vec3 center = gl_FragColor.rgb;
        vec3 neighborhood = (texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb + texture2D(tDiffuse,vUv-vec2(texel.x,0.)).rgb
          + texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb + texture2D(tDiffuse,vUv-vec2(0.,texel.y)).rgb) * .25;
        // Limited contrast recovery after MSAA; no halos on car paint or bright signs.
        gl_FragColor.rgb = max(vec3(0.), center + clamp((center-neighborhood)*.12,vec3(-.025),vec3(.025)));
        if (aoStrength > .001) gl_FragColor.rgb *= mix(1., texture2D(tAO,vUv).r, aoStrength);
        // tone mapping`)
      .replace(/}\s*$/, `
        float luma = dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
        gl_FragColor.rgb = mix(vec3(luma),gl_FragColor.rgb,.97);
        gl_FragColor.rgb += vec3(-.004,.001,.005)*(1.-smoothstep(.08,.48,luma));
        gl_FragColor.rgb *= 1.-.04*smoothstep(.28,.76,distance(vUv,vec2(.5)));
      }`)
    composer.addPass(render)
    if (ao) composer.addPass(ao)
    composer.addPass(output)
    pipeline.current = { composer, ao, output }
    return () => { pipeline.current = null; render.dispose(); ao?.dispose(); output.dispose(); composer.dispose() }
  }, [gl, scene, camera])
  useEffect(() => {
    const p = pipeline.current
    if (!p) return
    const range = resolutionRange(size.width, size.height, window.devicePixelRatio, compact)
    timing.current = { warmup: 0, elapsed: 0, frames: 0, slow: 0, fast: 0, aoCooldown: 0, lastProgress: progress.current, ratio: range.maximum, ...range }
    setDpr(range.maximum)
    p.composer.setPixelRatio(range.maximum)
    p.composer.setSize(size.width, size.height)
    p.output.uniforms.texel.value.set(1 / (size.width * range.maximum), 1 / (size.height * range.maximum))
    if (p.ao) p.ao.enabled = true
    p.output.uniforms.aoStrength.value = p.ao ? .55 : 0
    gl.domElement.dataset.renderQuality = 'high'
    gl.domElement.dataset.renderScale = range.maximum.toFixed(2)
  }, [size.width, size.height, compact, gl, setDpr, progress])
  useFrame((_, delta) => {
    const p = pipeline.current
    if (p) p.composer.render(delta)
    else gl.render(scene, camera)
    if (!p) return
    const s = timing.current
    const movement = Math.abs(progress.current - s.lastProgress)
    s.lastProgress = progress.current
    if (document.visibilityState !== 'visible' || delta > .15) { s.elapsed = 0; s.frames = 0; return }
    s.aoCooldown = Math.max(0, s.aoCooldown - delta)
    s.warmup += delta
    if (s.warmup < 5) return
    s.elapsed += delta; s.frames++
    if (s.elapsed < 2.5) return
    const ms = 1000 * s.elapsed / s.frames
    s.slow = ms > 25 ? s.slow + 1 : 0
    s.fast = ms < 18 ? s.fast + 1 : 0
    gl.domElement.dataset.sampleFps = (1000 / ms).toFixed(1)
    s.elapsed = 0; s.frames = 0
    // Resize only when the camera has settled, so target allocation cannot interrupt a scroll.
    const decision = qualityDecision(ms, s.slow, s.fast, p.ao?.enabled ?? false, s.ratio, s.minimum, s.maximum)
    if (!decision || movement > .00008) return
    if (decision.ao && !p.ao?.enabled && s.aoCooldown > 0) return
    if (!decision.ao && p.ao?.enabled) s.aoCooldown = 60
    if (p.ao) p.ao.enabled = decision.ao
    p.output.uniforms.aoStrength.value = decision.ao ? .55 : 0
    if (decision.ratio !== s.ratio) {
      s.ratio = decision.ratio
      setDpr(s.ratio); p.composer.setPixelRatio(s.ratio)
      p.output.uniforms.texel.value.set(1 / (size.width * s.ratio), 1 / (size.height * s.ratio))
    }
    gl.domElement.dataset.renderQuality = decision.ao ? 'high' : 'fluid'
    gl.domElement.dataset.renderScale = s.ratio.toFixed(2)
    s.slow = 0; s.fast = 0
  }, 1)
  return null
}
