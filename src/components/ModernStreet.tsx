import { useEffect, useMemo } from 'react'
import { CanvasTexture, CatmullRomCurve3, DoubleSide, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { atRoad, cityIntersections, routeLength, signStops } from '../experience/route'

function cityMapTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 768
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e3ebe4'; ctx.fillRect(0, 0, 384, 768)
  ctx.fillStyle = '#163f49'; ctx.fillRect(0, 0, 384, 175)
  ctx.fillStyle = '#bde1cf'; ctx.font = '700 26px Arial'; ctx.fillText('BUENOS AIRES', 28, 58)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 43px Arial'; ctx.fillText('Nos mueve', 28, 114); ctx.fillText('la ciudad.', 28, 160)
  ctx.lineWidth = 20; ctx.strokeStyle = '#c3d5cf'
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 83 - 30, 200); ctx.lineTo(i * 83 - 110, 670); ctx.stroke() }
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(0, 230 + i * 62); ctx.lineTo(384, 260 + i * 62); ctx.stroke() }
  ctx.strokeStyle = '#448c7a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(78, 630); ctx.lineTo(113, 435); ctx.lineTo(273, 446); ctx.lineTo(300, 249); ctx.stroke()
  for (const [x, y] of [[78, 630], [113, 435], [273, 446], [300, 249]]) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#2e776c'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#163f49'; ctx.fillRect(0, 700, 384, 68)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 24px Arial'; ctx.fillText('CABA / AMBA', 28, 744)
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8
  return texture
}

function Shelter({ t, side }: { t: number; side: number }) {
  const { point, tangent } = atRoad(t, side * 7.65)
  const yaw = Math.atan2(-tangent.z, tangent.x) + (side < 0 ? Math.PI : 0)
  return <group position={[point.x, .14, point.z]} rotation={[0, yaw, 0]}>
    <mesh position={[0, 2.68, 0]} castShadow><boxGeometry args={[4.7, .13, 1.85]} /><meshStandardMaterial color="#3b4d58" metalness={.6} roughness={.38} /></mesh>
    {[-2.05, 2.05].map(x => <mesh key={x} position={[x, 1.33, .62]} castShadow><boxGeometry args={[.08, 2.66, .09]} /><meshStandardMaterial color="#42535f" metalness={.65} roughness={.4} /></mesh>)}
    <mesh position={[0, 1.4, .65]}><planeGeometry args={[4.08, 2.35]} /><meshPhysicalMaterial color="#bddce0" transparent opacity={.25} roughness={.12} metalness={.1} side={DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[2.08, 1.4, .08]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.15, 2.35]} /><meshPhysicalMaterial color="#b5d0d7" transparent opacity={.25} roughness={.12} side={DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, .62, .2]} castShadow><boxGeometry args={[3.4, .11, .48]} /><meshStandardMaterial color="#7e8c91" metalness={.5} roughness={.48} /></mesh>
    {[-1.35, 1.35].map(x => <mesh key={x} position={[x, .33, .2]} castShadow><boxGeometry args={[.10, .6, .35]} /><meshStandardMaterial color="#42535f" metalness={.55} roughness={.5} /></mesh>)}
    <mesh position={[0, 2.53, -.12]}><boxGeometry args={[2.9, .025, .08]} /><meshStandardMaterial color="#f4f7ed" emissive="#e8f0e5" emissiveIntensity={.6} /></mesh>
  </group>
}

export function ModernStreetFurniture() {
  const lamp = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0, 0, 0), new Vector3(0, 5.4, 0), new Vector3(0, 6.1, -.3),
    new Vector3(0, 6.32, -1.1), new Vector3(0, 6.32, -2.1),
  ]), 24, .055, 7, false), [])
  const texture = useMemo(cityMapTexture, [])
  useEffect(() => () => { lamp.dispose(); texture.dispose() }, [lamp, texture])
  const lamps = useMemo(() => {
    const out: { t: number; side: number }[] = []
    for (let distance = 7; distance < routeLength - 6; distance += 15) {
      const t = distance / routeLength
      if (cityIntersections.some(cross => Math.abs(cross - t) * routeLength < 6)) continue
      for (const side of [-1, 1]) {
        if (signStops.some(stop => Math.abs(stop.t - t) * routeLength < (side > 0 ? 5 : 2))) continue
        out.push({ t, side })
      }
    }
    return out
  }, [])
  return <group>
    {lamps.map(({ t, side }, i) => {
      const { point, tangent } = atRoad(t, side * 5.65)
      const yaw = Math.atan2(-tangent.z, tangent.x) + (side < 0 ? Math.PI : 0)
      return <group key={`lamp-${i}`} position={[point.x, .14, point.z]} rotation={[0, yaw, 0]}>
        <mesh geometry={lamp} castShadow><meshStandardMaterial color="#71848f" metalness={.65} roughness={.36} /></mesh>
        <mesh position={[0, 6.28, -2.12]} castShadow><boxGeometry args={[.38, .09, .67]} /><meshStandardMaterial color="#70848f" metalness={.55} roughness={.38} /></mesh>
        <mesh position={[0, 6.225, -2.12]}><boxGeometry args={[.29, .015, .51]} /><meshStandardMaterial color="#edf3ef" emissive="#e4eee5" emissiveIntensity={.3} /></mesh>
      </group>
    })}
    {cityIntersections.flatMap(t => [-1, 1].map(side => {
      const { point, tangent } = atRoad(t - side * 5.3 / routeLength, side * 5.1)
      const yaw = Math.atan2(-tangent.z, tangent.x) + (side < 0 ? Math.PI : 0)
      return <group key={`signal-${t}-${side}`} position={[point.x, .14, point.z]} rotation={[0, yaw, 0]}>
        <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[.055, .075, 3.6, 8]} /><meshStandardMaterial color="#253b46" roughness={.6} /></mesh>
        <mesh position={[0, 3.05, 0]} castShadow><boxGeometry args={[.24, .84, .34]} /><meshStandardMaterial color="#20313b" roughness={.55} /></mesh>
        {['#572a24', '#62512a', '#72e78b'].map((color, i) => <mesh key={i} position={[-.135, 3.3 - i * .24, 0]} scale={[.25, 1, 1]}>
          <sphereGeometry args={[.087, 10, 8]} /><meshStandardMaterial color={color} emissive={i === 2 ? '#48b66b' : '#000000'} emissiveIntensity={i === 2 ? .8 : 0} roughness={.4} />
        </mesh>)}
      </group>
    }))}
    <Shelter t={.23} side={-1} />
    <Shelter t={.515} side={1} />
    <Shelter t={.85} side={-1} />
    {[.225, .51, .855].map((t, i) => {
      const side = i === 1 ? 1 : -1
      const { point, tangent } = atRoad(t, side * 6.3)
      return <group key={`totem-${i}`} position={[point.x, .14, point.z]} rotation={[0, Math.atan2(-tangent.z, tangent.x) + (side > 0 ? Math.PI : 0), 0]}>
        <mesh position={[0, .12, 0]} castShadow><boxGeometry args={[.75, .24, .42]} /><meshStandardMaterial color="#3f535f" metalness={.5} roughness={.5} /></mesh>
        <mesh position={[0, 1.23, 0]} castShadow><boxGeometry args={[.84, 2.04, .18]} /><meshStandardMaterial color="#233c49" metalness={.55} roughness={.35} /></mesh>
        <mesh position={[0, 1.23, .095]}><planeGeometry args={[.73, 1.86]} /><meshStandardMaterial map={texture} roughness={.45} emissive="#a9d5ce" emissiveIntensity={.18} /></mesh>
      </group>
    })}
  </group>
}
