import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { insuranceLogoAtlas, insurancePartners } from '../data/insurancePartners'
import { CanvasTexture, Group, MathUtils, SRGBColorSpace } from 'three'
import { atRoad, driveState } from '../experience/route'
import { SignContactLink } from './SignContactLink'
import { chapters, insuranceCoverage, insuranceSteps, reasons, serviceOverview, signMessage, type PanelId } from '../data/site'

const W = 1400, H = 1900
const white = '#f3f7f3', muted = '#e0dae6', mint = '#cf98f0'

function wrap(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, max: number, leading: number) {
  let line = ''
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) {
      ctx.fillText(line, x, y); y += leading; line = word
    } else line = next
  }
  if (line) { ctx.fillText(line, x, y); y += leading }
  return y
}

function drawInsuranceLogos(ctx: CanvasRenderingContext2D, image: CanvasImageSource, top: number) {
  const columns = 4, gap = 16, width = (1210 - gap * (columns - 1)) / columns, height = 72
  insurancePartners.forEach((partner, index) => {
    const x = 95 + index % columns * (width + gap)
    const y = top + Math.floor(index / columns) * (height + 14)
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill()
    const [sx, sy, sw, sh] = partner.crop
    const fit = Math.min((width - 22) / sw, (height - 14) / sh)
    const dw = sw * fit, dh = sh * fit
    ctx.drawImage(image, sx, sy, sw, sh, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh)
  })
  return top + Math.ceil(insurancePartners.length / columns) * (height + 14)
}

function createSignTexture(id: PanelId, logoImage: CanvasImageSource) {
  const chapter = chapters.find(item => item.id === id)!
  const index = chapters.findIndex(item => item.id === id) + 1
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const header = canvas.getContext('2d')!
  const body = document.createElement('canvas')
  body.width = W; body.height = H
  let ctx = header
  const gradient = ctx.createLinearGradient(0, 0, W, H)
  gradient.addColorStop(0, '#28212f'); gradient.addColorStop(1, '#141217')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#a47ac0'; ctx.lineWidth = 12; ctx.strokeRect(28, 28, W - 56, H - 56)
  ctx.strokeStyle = mint; ctx.lineWidth = 5; ctx.strokeRect(49, 49, W - 98, H - 98)
  ctx.fillStyle = mint; ctx.fillRect(88, 97, 16, 80)
  ctx.textBaseline = 'top'
  ctx.fillStyle = muted; ctx.font = '700 35px Arial, sans-serif'
  ctx.fillText('TRANSPORTE MGAVIRA  /  BUENOS AIRES', 134, 111)
  ctx.textAlign = 'right'; ctx.fillText(`0${index} / 04`, 1305, 111); ctx.textAlign = 'left'
  ctx.fillStyle = white; ctx.font = '800 88px Arial, sans-serif'
  let y = wrap(ctx, chapter.sign, 94, 205, 1210, 103)
  ctx.fillStyle = mint; ctx.fillRect(94, y + 12, 1210, 5)
  y += 70
  const bodyTop = y
  ctx = body.getContext('2d')!
  ctx.textBaseline = 'top'

  const rows = (items: { title: string; text: string }[], start: number, dense = false) => {
    let rowY = start
    items.forEach((item, row) => {
      ctx.fillStyle = mint; ctx.font = `700 ${dense ? 42 : 46}px Arial, sans-serif`; ctx.fillText(`0${row + 1}`, 96, rowY + 7)
      ctx.fillStyle = white; ctx.font = `700 ${dense ? 52 : 62}px Arial, sans-serif`
      let bodyY = wrap(ctx, item.title, 210, rowY, 1070, dense ? 64 : 75) + 9
      ctx.fillStyle = muted; ctx.font = `400 ${dense ? 46 : 54}px Arial, sans-serif`
      bodyY = wrap(ctx, item.text, 210, bodyY, 1070, dense ? 59 : 68)
      rowY = bodyY + (dense ? 22 : 37)
      ctx.fillStyle = '#786781'; ctx.fillRect(95, rowY, 1210, 2)
      rowY += dense ? 20 : 31
    })
    return rowY
  }

  if (id === 'services') {
    ctx.fillStyle = white; ctx.font = '700 70px Arial, sans-serif'
    y = wrap(ctx, serviceOverview.title, 95, y, 1190, 84) + 38
    ctx.fillStyle = muted; ctx.font = '400 53px Arial, sans-serif'
    serviceOverview.paragraphs.forEach(paragraph => {
      y = wrap(ctx, paragraph, 95, y, 1190, 70) + 32
    })
    ctx.fillStyle = mint; ctx.fillRect(95, y, 1190, 3)
    ctx.font = '700 53px Arial, sans-serif'
    y = wrap(ctx, serviceOverview.coverage, 95, y + 30, 1190, 70)
  } else if (id === 'coverage') {
    ctx.fillStyle = white; ctx.font = '700 72px Arial, sans-serif'
    y = wrap(ctx, chapter.heading, 95, y + 24, 1180, 88) + 115
    ctx.fillStyle = mint; ctx.font = '800 165px Arial, sans-serif'
    ctx.fillText('CABA', 94, y); ctx.fillText('+', 582, y); ctx.fillText('AMBA', 722, y)
    y += 260
    ctx.fillStyle = white; ctx.font = '500 70px Arial, sans-serif'
    y = wrap(ctx, 'Traslados en la Ciudad Autónoma de Buenos Aires y el Área Metropolitana de Buenos Aires.', 95, y, 1190, 91) + 105
    ctx.fillStyle = muted; ctx.font = '400 62px Arial, sans-serif'
    y = wrap(ctx, 'Consultanos por tu ubicación y los horarios que necesitás. Evaluamos cada solicitud según el recorrido.', 95, y, 1180, 82)
  } else if (id === 'why') {
    ctx.fillStyle = muted; ctx.font = '500 55px Arial, sans-serif'
    y = wrap(ctx, chapter.heading, 95, y, 1180, 70) + 39
    y = rows(reasons, y, true)
    ctx.fillStyle = mint; ctx.font = '700 49px Arial, sans-serif'
    y = wrap(ctx, '6 años de experiencia acompañando a las familias en sus necesidades de traslado.', 95, y + 6, 1190, 63)
  } else {
    ctx.fillStyle = muted; ctx.font = '500 43px Arial, sans-serif'
    y = wrap(ctx, 'Trabajamos con estas obras sociales y prepagas, y otras más.', 95, y + 4, 1190, 55) + 17
    y = drawInsuranceLogos(ctx, logoImage, y) + 8
    ctx.fillStyle = mint; ctx.font = '800 50px Arial, sans-serif'
    y = wrap(ctx, insuranceCoverage.title, 95, y, 1190, 61) + 6
    ctx.fillStyle = white; ctx.font = '500 40px Arial, sans-serif'
    y = wrap(ctx, insuranceCoverage.text, 95, y, 1190, 50) + 5
    ctx.fillStyle = muted; ctx.font = '400 35px Arial, sans-serif'
    y = wrap(ctx, insuranceCoverage.requirements, 95, y, 1190, 44) + 17
    insuranceSteps.forEach(step => {
      ctx.fillStyle = white; ctx.font = '700 35px Arial, sans-serif'
      y = wrap(ctx, step.number + '  ' + step.title, 95, y, 1190, 43)
      ctx.fillStyle = muted; ctx.font = '400 33px Arial, sans-serif'
      y = wrap(ctx, step.text, 95, y + 3, 1190, 41) + 12
    })
    ctx.fillStyle = mint; ctx.font = '500 32px Arial, sans-serif'
    y = wrap(ctx, 'La disponibilidad y las autorizaciones están sujetas a evaluación y a las condiciones de cada cobertura.', 95, y + 4, 1190, 40)
  }

  ctx = header
  const bodyHeight = y - bodyTop
  const scale = Math.min(1, (1520 - bodyTop) / bodyHeight)
  ctx.drawImage(body, 0, bodyTop, W, bodyHeight, (W - W * scale) / 2, bodyTop, W * scale, bodyHeight * scale)
  // The matching HTML link sits on this reserved button area.
  ctx.fillStyle = '#00bf90'; ctx.fillRect(95, 1580, 1210, 136)
  ctx.fillStyle = '#10251f'; ctx.font = '800 55px Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.fillText('Contactanos por WhatsApp  ↗', W / 2, 1620)
  ctx.textAlign = 'left'
  ctx.fillStyle = mint; ctx.fillRect(94, 1776, 1210, 3)
  ctx.font = '700 36px Arial, sans-serif'; ctx.fillText('DESLIZÁ PARA SEGUIR EL RECORRIDO', 95, 1810)
  ctx.textAlign = 'right'; ctx.fillText('WHATSAPP  11 3486-2771', 1304, 1810)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8
  return texture
}

export function InteractiveRoadSign({ id, stop, progress, onOpen }: {
  id: PanelId; stop: number; progress: MutableRefObject<number>; onOpen: (id: PanelId) => void
}) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<Group>(null)
  const { point, tangent } = atRoad(stop, 7.15)
  const yaw = Math.atan2(-tangent.z, tangent.x) + Math.PI
  const logoAtlas = useTexture(insuranceLogoAtlas.src)
  const texture = useMemo(() => createSignTexture(id, logoAtlas.image as CanvasImageSource), [id, logoAtlas])
  useEffect(() => () => texture.dispose(), [texture])
  useFrame((_, delta) => {
    if (!ref.current) return
    const near = Math.abs(driveState(progress.current).t - stop) < .045
    const target = hovered ? 1.025 : near ? 1.012 : 1
    ref.current.scale.setScalar(MathUtils.damp(ref.current.scale.x, target, 6, delta))
  })
  const pointerOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'
  }
  const pointerOut = () => { setHovered(false); document.body.style.cursor = '' }
  return <group position={[point.x, 0, point.z]} rotation={[0, yaw, 0]}>
    <group ref={ref}>
      {[-2.74, 2.74].map(x => <mesh key={x} position={[x, 4.25, 0]} castShadow>
        <cylinderGeometry args={[.12, .14, 8.5, 12]} />
        <meshStandardMaterial color="#40565d" metalness={.7} roughness={.32} />
      </mesh>)}
      <mesh position={[0, 4.65, 0]} castShadow onClick={() => onOpen(id)} onPointerOver={pointerOver} onPointerOut={pointerOut}>
        <boxGeometry args={[6.35, 8.68, .24]} />
        <meshStandardMaterial color={hovered ? '#426574' : '#253f4c'} metalness={.55} roughness={.38} />
      </mesh>
      <mesh position={[0, 4.65, .124]} onClick={() => onOpen(id)} onPointerOver={pointerOver} onPointerOut={pointerOut}>
        <planeGeometry args={[6.2, 8.42]} />
        <meshStandardMaterial map={texture} roughness={.67} metalness={.02} emissive="#173b3e" emissiveIntensity={.12} />
      </mesh>
      <SignContactLink position={[0, 1.557, .18]} message={signMessage(id)} label={`Contactar por WhatsApp sobre ${chapters.find(chapter => chapter.id === id)!.sign.toLowerCase()}`} />
    </group>
  </group>
}

