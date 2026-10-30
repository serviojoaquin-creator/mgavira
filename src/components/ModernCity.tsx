import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, CanvasTexture, Color, InstancedMesh, Object3D, SRGBColorSpace, MeshPhysicalMaterial, type MeshStandardMaterial } from 'three'
import { useTexture } from '@react-three/drei'
import { atRoad, cityIntersections, routeLength } from '../experience/route'

type V3 = [number, number, number]
type Block = { position: V3; size: V3; yaw: number; color?: string }
type FacadeParts = Record<'stone' | 'glass' | 'metal' | 'bronze' | 'dark' | 'roof' | 'shopglass' | 'interior' | 'lights', Block[]>

export function BoxInstances({ blocks, color, roughness = .7, metalness = 0, map, bumpMap, shadow = true, opacity = 1, emissive = false, material }: {
  blocks: Block[]; color: string; roughness?: number; metalness?: number; map?: CanvasTexture; bumpMap?: CanvasTexture; shadow?: boolean; opacity?: number; emissive?: boolean; material?: MeshStandardMaterial
}) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new Object3D()
    blocks.forEach((block, i) => {
      dummy.position.set(...block.position)
      dummy.rotation.set(0, block.yaw, 0)
      dummy.scale.set(...block.size)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
      ref.current!.setColorAt(i, new Color(block.color ?? '#ffffff'))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [blocks])
  return <instancedMesh ref={ref} args={[geometry, material, blocks.length]} castShadow={shadow} receiveShadow>
    {!material && <meshStandardMaterial color={color} map={map} bumpMap={bumpMap} bumpScale={.008} roughness={roughness} metalness={metalness} envMapIntensity={1.1}
      transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} emissive={emissive ? '#ffe1ad' : '#000000'} emissiveIntensity={emissive ? 2 : 0} />}
  </instancedMesh>
}

function mineralSurface() {
  const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=512
  const ctx=canvas.getContext('2d')!; const pixels=ctx.createImageData(512,512)
  let seed=713
  const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296 }
  for(let y=0;y<512;y++) for(let x=0;x<512;x++) {
    const shade=210+random()*24+Math.sin(x*.025+y*.013)*11+Math.sin(y*.061)*4
    const i=(y*512+x)*4
    pixels.data[i]=shade; pixels.data[i+1]=shade; pixels.data[i+2]=shade-2; pixels.data[i+3]=255
  }
  ctx.putImageData(pixels,0,0)
  // Fine pores and rain marks stay restrained at architectural scale.
  for(let i=0;i<100;i++) {
    const x=random()*512, y=random()*512
    ctx.fillStyle=`rgba(90,86,78,${.02+random()*.035})`
    ctx.fillRect(x,y,.5+random()*1.5,8+random()*90)
  }
  ctx.fillStyle='#7a746630'; ctx.fillRect(0,507,512,5)
  const texture=new CanvasTexture(canvas); texture.colorSpace=SRGBColorSpace; texture.anisotropy=8
  return texture
}

function facadeBlocks() {
  const parts: FacadeParts = { stone: [], glass: [], metal: [], bronze: [], dark: [], roof: [], shopglass: [], interior: [], lights: [] }
  const shops: { position: V3; yaw: number; style: number }[] = []
  const palette = ['#b7a48b', '#929b9c', '#d1c5b2', '#998d7a']
  const glassTints = ['#f0efeb', '#c8cfd0', '#e1e1da', '#bec8cb', '#d7d6cf']

  function building(t: number, side: number, index: number, distant = false) {
    const style = (index + (side < 0 ? 1 : 0)) % 4
    const w = distant ? 15 + index % 3 * 3 : 11.4 + index % 3 * 2.1
    const d = distant ? 13 : 12.5 + index % 2 * 2.2
    const stories = distant ? 13 + index % 5 * 2 : 6 + (index * 3 + (side > 0 ? 2 : 0)) % 5
    const floorHeight = 3.05
    const h = 3.7 + stories * floorHeight
    const { point, tangent } = atRoad(t, side * (distant ? 33 + d / 2 : 9.9 + d / 2 + (style === 2 ? .7 : 0)))
    if (t > 1) point.addScaledVector(tangent, (t - 1) * routeLength)
    const yaw = Math.atan2(-tangent.z, tangent.x)
    const cos = Math.cos(yaw), sin = Math.sin(yaw)
    const tint = style === 3 ? '#c6baa6' : palette[(index + style) % palette.length]
    const add = (part: keyof FacadeParts, x: number, y: number, z: number, size: V3, color?: string) => {
      parts[part].push({ position: [point.x + x * cos + z * sin, y, point.z - x * sin + z * cos], yaw, size, color })
    }

    function volume(cx: number, cz: number, bottom: number, width: number, depth: number, floors: number, simple = false) {
      const height = floors * floorHeight
      add('stone', cx, bottom + height / 2, cz, [width - .17, height, depth - .17], tint)
      // Glazing sits behind aluminium piers and projecting concrete floor edges.
      const colsX = Math.max(3, Math.round(width / (style === 1 ? 2.5 : style === 3 ? 2.15 : 1.8)))
      const colsZ = Math.max(3, Math.round(depth / (style === 1 ? 2.5 : 1.8)))
      const band = style === 3 ? 1.05 : style === 1 ? .65 : style === 0 ? .13 : .24
      for (let floor = 0; floor < floors; floor++) {
        const y = bottom + floor * floorHeight
        add(style === 1 ? 'stone' : 'metal', cx, y + .08, cz, [width + .04, band, depth + .04], style === 1 ? tint : '#c2ced3')
        for (const face of [-1, 1]) {
          for (let column = 0; column < colsX; column++) {
            add('glass', cx - width / 2 + (column + .5) * width / colsX, y + floorHeight / 2 + band / 4,
              cz + face * depth / 2, [width / colsX - (style === 3 ? .68 : .085), floorHeight - band - .05, .08],
              glassTints[(index * 11 + column * 3 + floor * 7 + (face > 0 ? 2 : 0)) % glassTints.length])
            // Limestone window surrounds, projecting sills and iron Juliet balconies.
            if (!simple && style === 3) {
              const x = cx - width / 2 + (column + .5) * width / colsX
              const z = cz + face * (depth / 2 + .12)
              const windowWidth = width / colsX - .52
              add('stone', x, y + .60, z, [windowWidth + .20, .15, .44], '#d6c9b4')
              add('stone', x, y + 2.68, z, [windowWidth + .22, .14, .35], '#d6c9b4')
              for (const edge of [-1, 1]) add('stone', x + edge * windowWidth / 2, y + 1.63, z,
                [.10, 2.0, .20], '#cbbca5')
              if (floor % 3 === 1 && column % 2 === 0) {
                add('stone', x, y + .60, z + face * .17, [windowWidth + .35, .14, .65], '#b5aa99')
                for (let bar = 0; bar < 8; bar++) add('dark', x - windowWidth / 2 + bar * windowWidth / 7,
                  y + 1.12, z + face * .43, [.022, .90, .022], '#454740')
                add('dark', x, y + 1.58, z + face * .43, [windowWidth + .06, .036, .035], '#55534a')
              }
            }
            // Recessed blinds, transoms and deep lintels break the identical grid.
            if (!simple && (column * 13 + floor * 7 + index) % 5 === 0) {
              add('roof', cx - width / 2 + (column + .5) * width / colsX, y + 2.43,
                cz + face * (depth / 2 + .055), [width / colsX - .15, .66, .028], '#a2a49b')
              for (let slat = 0; slat < 5; slat++) add('metal', cx - width / 2 + (column + .5) * width / colsX,
                y + 2.16 + slat * .13, cz + face * (depth / 2 + .077), [width / colsX - .15, .018, .04], '#777e7a')
            }
            if (!simple && style === 1) add('stone', cx - width / 2 + (column + .5) * width / colsX,
              y + .12, cz + face * (depth / 2 + .14), [width / colsX, .12, .34], tint)
          }
          for (let column = 0; column < colsZ; column++) {
            add('glass', cx + face * width / 2, y + floorHeight / 2 + band / 4,
              cz - depth / 2 + (column + .5) * depth / colsZ, [.08, floorHeight - band - .05, depth / colsZ - (style === 3 ? .68 : .085)],
              glassTints[(index * 3 + column * 7 + floor * 2) % glassTints.length])
          }
        }
      }
      if (!simple) {
        for (const face of [-1, 1]) {
          for (let col = 0; col <= colsX; col++) add(style === 1 ? 'stone' : 'metal',
            cx - width / 2 + col * width / colsX, bottom + height / 2, cz + face * (depth / 2 + .045),
            [style === 1 ? .23 : .065, height, style === 1 ? .22 : .11], style === 1 ? tint : '#a7b6bf')
          for (let col = 0; col <= colsZ; col++) add(style === 1 ? 'stone' : 'metal',
            cx + face * (width / 2 + .045), bottom + height / 2, cz - depth / 2 + col * depth / colsZ,
            [style === 1 ? .22 : .11, height, style === 1 ? .23 : .065], style === 1 ? tint : '#a7b6bf')
        }
      }
      add('roof', cx, bottom + height + .12, cz, [width + .24, .24, depth + .24], '#c4cdd0')
    }

    // Recessed rooms behind real transparent glazing, with warm back walls.
    const streetFace=-side*d/2
    const insideZ=streetFace+side*2.8
    add('interior',0,1.85,insideZ,[w-.35,3.5,.18],['#ada38c','#b4aaa0','#9caaa1','#b9ab95'][style])
    add('interior',0,.29,streetFace+side*1.5,[w-.35,.12,2.8],'#938675')
    add('interior',0,3.46,streetFace+side*1.5,[w-.35,.12,2.8],'#c8bba3')
    for(const edge of [-1,1]) {
      add('stone',edge*(w/2-.14),1.85,0,[.28,3.5,d],tint)
      // Return the shopfront around the corner instead of leaving a blank plinth.
      if (!distant) {
        const bays = Math.round(d / 2.5)
        for (let bay = 0; bay < bays; bay++) {
          const z = -d / 2 + (bay + .5) * d / bays
          add('glass', edge * (w / 2 + .015), 1.8, z, [.055, 2.65, d / bays - .34], '#829596')
          add('stone', edge * (w / 2 + .08), 1.85, z - d / bays / 2, [.25, 3.5, .28], tint)
          add('metal', edge * (w / 2 + .06), 2.73, z, [.08, .05, d / bays - .30], '#928a7b')
        }
      }
    }
    const cols = Math.round(w / 3)
    for (let col = 0; col <= cols; col++) {
      for (const face of [-1, 1]) add('stone', -w / 2 + col * w / cols, 1.85, face * d / 2, [.32, 3.7, .48], tint)
    }
    add('stone', 0, .19, 0, [w + .15, .25, d + .15], '#9aabb3')
    add('metal', 0, 3.55, -side * (d / 2 + .38), [w + .3, .16, 1.12], '#83949d')
    add('shopglass', 0, 1.85, -side * (d / 2 - .24), [w - .7, 3.1, .025], '#c5d8d7')
    // Entrance doors have visible frames, handles, a stone surround and warm soffit.
    const entranceZ = -side * (d / 2 + .06)
    for (const x of [-1.1, 0, 1.1]) add('metal', x, 1.47, entranceZ, [.055, 2.7, .12], '#565b59')
    for (const x of [-.13, .13]) add('metal', x, 1.45, entranceZ - side * .08, [.035, .47, .04], '#c2b8a0')
    add('stone', 0, 2.98, entranceZ, [2.45, .20, .24], '#817e73')
    add('roof', 0, 3.43, entranceZ - side * .4, [2.6, .035, .5], '#d8cfb3')
    if (!distant) {
      // Projecting bronze fins and stone surrounds catch the sun at street level.
      if (style !== 0) {
        for (const edge of [-1, 1]) {
          for (let fin = 0; fin < 5; fin++) add('bronze', edge * (w / 2 - .35 - fin * .24),
            3.75, entranceZ - side * .18, [.075, 7.1, .42], style === 1 ? '#b98b54' : '#8e7860')
        }
        add('stone', 0, 7.36, entranceZ - side * .1, [w + .15, .26, .5], tint)
      }
      const z = entranceZ - side * .12
      shops.push({ position: [point.x + z*sin,3.16,point.z+z*cos], yaw:yaw+(side>0?Math.PI:0), style:index%3 })
      for (let col = 0; col < cols; col++) {
        const x = -w/2+(col+.5)*w/cols
        if (Math.abs(x)<1.3) continue
        // Window displays have furniture, books, a recessed ceiling lamp and depth.
        const roomZ=streetFace+side*1.6
        add('lights',x,3.32,roomZ,[.65,.025,.30])
        add('interior',x,.91,roomZ,[w/cols-.55,.10,.65],'#8e6d48')
        for(const leg of [-1,1]) add('dark',x+leg*(w/cols-.85)/2,.58,roomZ,[.055,.61,.055],'#8e9691')
        add('interior',x,1.70,insideZ-side*.22,[w/cols-.4,.07,.36],'#82705a')
        for(let book=0;book<7;book++) {
          const bx=x-(w/cols-.8)/2+book*.20
          add('interior',bx,1.90+(book%3)*.035,insideZ-side*.25,[.12,.34+(book%3)*.07,.20],['#687c72','#b2916c','#c8bd9f','#775a4c'][book%4])
        }
        add('interior',x+.25,1.12,roomZ,[.16,.30,.16],'#b7a789')
        add('interior',x+.25,1.37,roomZ,[.32,.30,.29],'#52664b')
        add('metal', x,1.5,z,[.038,2.8,.055],'#62635c')
        add('roof',x,2.65,z,[w/cols-.2,.07,.18],'#baac8c')
        add('roof',x,.68,z,[w/cols-.25,.12,.16],'#7e7360')
        add('stone',x,.38,z-side*.20,[w/cols-.55,.42,.47],'#817f71')
        add('dark',x,.596,z-side*.20,[w/cols-.67,.015,.35],'#91826b')
      }
    }
    // Three profiles: curtain wall, concrete floor bands, and a set-back tower.
    if (style === 2 && !distant) {
      volume(0, 0, 3.7, w, d, 4)
      volume(-w * .08, side * 1.3, 3.7 + 4 * floorHeight + .25, w * .76, d * .76, stories - 2)
    } else volume(0, 0, 3.7, w, d, stories, distant)
    if (style === 3 && !distant) {
      for (const y of [3.65, h - .35, h + .10]) add('stone', 0, y, 0,
        [w + .55, .22, d + .55], '#d0c2ac')
      for (const edge of [-1, 1]) add('stone', edge * (w / 2 - .20), h / 2 + 1.8,
        -side * (d / 2 + .16), [.50, h - 3.5, .35], '#cdbfa9')
    }
    add('roof', w * .16, h + .55, d * .12, [2.2, .8, 1.5], '#7f9097')
  }

  let index = 0
  for (let distance = 3; distance < routeLength - 5; distance += 15.6, index++) {
    const t = distance / routeLength
    if (cityIntersections.some(cross => Math.abs(cross - t) * routeLength < 9.6)) continue
    for (const side of [-1, 1]) building(t, side, index)
  }
  for (const side of [-1, 1]) { building(1.10, side, 12); building(1.21, side, 13) }
  for (let i = 0; i < 10; i++) {
    for (const side of [-1, 1]) building(.025 + i * .102, side, i + 8, true)
  }
  // The avenue continues beyond the arrival instead of ending at a flat facade.
  return { parts, shops }
}

export function ModernBuildings() {
  const { parts: blocks, shops } = useMemo(facadeBlocks, [])
  const glass = useTexture('/media/v27/office-windows.webp')
  const mineral = useMemo(mineralSurface, [])
  const glazing = useMemo(() => {
    glass.colorSpace = SRGBColorSpace; glass.anisotropy = 8
    const material = new MeshPhysicalMaterial({ color: '#ffffff', map: glass, roughness: .24,
      metalness: .12, clearcoat: .7, clearcoatRoughness: .16, envMapIntensity: .65 })
    // Four photographic panes share one texture and one draw batch. No extra geometry.
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 vPane;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float pane = mod(floor(abs(instanceMatrix[3].x)*7. + abs(instanceMatrix[3].y)*13. + abs(instanceMatrix[3].z)*3.),4.);
        vPane = vec2(mod(pane,2.),floor(pane/2.));`)
      shader.fragmentShader = 'varying vec2 vPane;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec2 paneUV = (clamp(vMapUv,vec2(.008),vec2(.992)) + vPane) * .5;
        diffuseColor *= texture2D(map,paneUV);`)
    }
    material.customProgramCacheKey = () => 'office-panes-v27'
    return material
  }, [glass])
  const lettering = useMemo(() => ['CAFÉ DEL CENTRO','LIBRERÍA • PAPELERÍA','GALERÍA NORTE'].map((label,i) => {
    const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=128
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle=['#303b35','#484237','#374347'][i]; ctx.fillRect(0,0,1024,128)
    ctx.fillStyle='#d9cfb6'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='500 47px Georgia'
    ctx.fillText(label,512,66)
    ctx.fillStyle='#b5a782'; ctx.fillRect(20,12,984,2); ctx.fillRect(20,114,984,2)
    const texture=new CanvasTexture(canvas); texture.colorSpace=SRGBColorSpace; texture.anisotropy=8
    return texture
  }),[])
  useEffect(() => () => { mineral.dispose(); glazing.dispose(); lettering.forEach(t=>t.dispose()) }, [glass,mineral,lettering,glazing])
  return <group>
    <BoxInstances blocks={blocks.stone} color="#ffffff" roughness={.83} map={mineral} bumpMap={mineral} />
    <BoxInstances blocks={blocks.glass} color="#ffffff" material={glazing} shadow={false} />
    <BoxInstances blocks={blocks.metal} color="#a7aca9" roughness={.4} metalness={.65} />
    <BoxInstances blocks={blocks.bronze} color="#ffffff" roughness={.31} metalness={.72} />
    <BoxInstances blocks={blocks.dark} color="#252c2b" roughness={.28} metalness={.28} />
    <BoxInstances blocks={blocks.roof} color="#c7cbc9" roughness={.8} map={mineral} />
    <BoxInstances blocks={blocks.interior} color="#ffffff" roughness={.8} />
    <BoxInstances blocks={blocks.lights} color="#fff0ce" emissive shadow={false} />
    <BoxInstances blocks={blocks.shopglass} color="#ffffff" roughness={.08} metalness={.12} opacity={.24} shadow={false} />
    {shops.map((shop,i)=><mesh key={i} position={shop.position} rotation={[0,shop.yaw,0]}>
      <planeGeometry args={[4.8,.60]} />
      <meshStandardMaterial map={lettering[shop.style]} roughness={.64} emissive="#c7b48a" emissiveIntensity={.10} />
    </mesh>)}
  </group>
}
