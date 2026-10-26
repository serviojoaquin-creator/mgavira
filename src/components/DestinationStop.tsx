import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, DoubleSide, InstancedMesh, Object3D, SRGBColorSpace } from 'three'
import { useTexture } from '@react-three/drei'
import { atRoad } from '../experience/route'

/** A landscaped meeting point gives the final stop a visible place in the city. */
export function DestinationStop() {
  const { point, tangent } = atRoad(.984, 8.6)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 320
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#201a28'; ctx.fillRect(0, 0, 1024, 320)
    ctx.fillStyle = '#c77af2'; ctx.font = '500 29px Arial'; ctx.fillText('TRANSPORTE MGAVIRA', 64, 74)
    ctx.fillStyle = '#f1f2e8'; ctx.font = '600 92px Arial'; ctx.fillText('Llegaste.', 60, 186)
    ctx.fillStyle = '#e2dbe7'; ctx.font = '28px Arial'; ctx.fillText('Cerca, de principio a fin.', 64, 255)
    ctx.strokeStyle = '#c77af2'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(864, 157, 60, 0, Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(837, 158); ctx.lineTo(857, 180); ctx.lineTo(895, 137); ctx.stroke()
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.anisotropy = 8
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <group position={point} rotation={[0,Math.atan2(-tangent.z,tangent.x),0]}>
    <mesh position={[0,1.75,.4]} castShadow receiveShadow><boxGeometry args={[7,3.2,.32]} /><meshStandardMaterial color="#c3bcab" roughness={.8} /></mesh>
    <mesh position={[0,2.1,.22]} rotation={[0,Math.PI,0]}><planeGeometry args={[4.5,1.406]} /><meshStandardMaterial map={texture} roughness={.6} /></mesh>
    <mesh position={[0,3.5,-.5]} castShadow receiveShadow><boxGeometry args={[7.6,.16,2.3]} /><meshStandardMaterial color="#293d37" roughness={.5} metalness={.35} /></mesh>
    {[-3.2,3.2].map(x => <mesh key={x} position={[x,1.78,-1.25]} castShadow><boxGeometry args={[.09,3.25,.09]} /><meshStandardMaterial color="#394c44" roughness={.45} metalness={.5} /></mesh>)}
    <mesh position={[0,.58,-.25]} castShadow><boxGeometry args={[3.7,.13,.52]} /><meshStandardMaterial color="#83735d" roughness={.8} /></mesh>
    {[-1.5,1.5].map(x => <mesh key={x} position={[x,.32,-.25]} castShadow><boxGeometry args={[.09,.46,.44]} /><meshStandardMaterial color="#394c44" /></mesh>)}
    {[-4.05,4.05].map(x => <group key={x} position={[x,0,0]}>
      <mesh position={[0,.52,0]} castShadow receiveShadow><boxGeometry args={[1.2,.75,1.65]} /><meshStandardMaterial color="#939a8b" roughness={.9} /></mesh>
      <PlanterFoliage />
    </group>)}
  </group>
}

function PlanterFoliage() {
  const ref = useRef<InstancedMesh>(null)
  const foliage = useTexture('/media/v20/follaje.webp')
  useLayoutEffect(() => {
    const dummy = new Object3D()
    for (let i = 0; i < 72; i++) {
      const angle = i * 2.39996
      dummy.position.set(Math.sin(angle) * (.13 + i % 5 * .06), .97 + i % 7 * .065, Math.cos(angle) * (.19 + i % 4 * .09))
      dummy.rotation.set(i * .7, angle, i * .31)
      dummy.scale.set(.39, .38 + i % 3 * .09, 1)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [])
  return <instancedMesh ref={ref} args={[undefined, undefined, 72]} castShadow receiveShadow>
    <planeGeometry args={[1,1]} /><meshStandardMaterial map={foliage} alphaTest={.45} color="#94a482" side={DoubleSide} roughness={.92} />
  </instancedMesh>
}
