import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Group, Matrix4, Vector3 } from 'three'
import { whatsapp } from '../data/site'

/** Synchronizes a real DOM link with the sign plane without a second React root. */
export function SignContactLink({ message, label, position, rotation = [0, 0, 0], width = 5.36, height = .60 }: {
  message: string
  label: string
  position: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  height?: number
}) {
  const group = useRef<Group>(null)
  const anchor = useRef<HTMLAnchorElement | null>(null)
  const [world, normal, toCamera, screen] = useMemo(() => [new Vector3(), new Vector3(), new Vector3(), new Vector3()], [])
  const projection = useMemo(() => new Matrix4(), [])
  const pixelsToPlane = useMemo(() => new Matrix4().makeScale(.01, -.01, 1).setPosition(-width / 2, height / 2, 0), [width, height])
  const css = useMemo(() => new Array<number>(16).fill(0), [])

  useEffect(() => {
    const layer = document.getElementById('sign-contact-layer')
    if (!layer) return
    const link = document.createElement('a')
    link.className = 'sign-contact-link'
    link.href = whatsapp(message)
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.setAttribute('aria-label', label)
    link.style.cssText = `position:absolute;left:0;top:0;transform-origin:0 0;width:${width * 100}px;height:${height * 100}px;font-size:${height * 40}px;`
    const text = document.createElement('span')
    text.textContent = 'Contactanos por WhatsApp'
    const arrow = document.createElement('span')
    arrow.textContent = '↗'
    arrow.setAttribute('aria-hidden', 'true')
    link.append(text, arrow)
    link.hidden = true
    layer.appendChild(link)
    anchor.current = link
    return () => {
      anchor.current = null
      link.remove()
    }
  }, [message, label, width, height])

  useFrame(({ camera, size }) => {
    const link = anchor.current
    if (!group.current || !link) return
    camera.updateMatrixWorld()
    group.current.getWorldPosition(world)
    normal.set(0, 0, 1).transformDirection(group.current.matrixWorld)
    toCamera.copy(camera.position).sub(world)
    screen.copy(world).project(camera)
    const hidden = toCamera.dot(normal) <= 0 || toCamera.lengthSq() > 70 * 70 ||
      Math.abs(screen.x) > 1.2 || Math.abs(screen.y) > 1.15 || screen.z > 1
    if (link.hidden !== hidden) link.hidden = hidden
    if (hidden) return

    // Map the link's CSS pixels through the same world/view/projection matrices
    // as the sign. The homogeneous denominator preserves perspective exactly.
    projection.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
      .multiply(group.current.matrixWorld).multiply(pixelsToPlane)
    const p = projection.elements
    const halfW = size.width / 2, halfH = size.height / 2
    css[0] = (p[0] + p[3]) * halfW
    css[1] = (p[3] - p[1]) * halfH
    css[3] = p[3]
    css[4] = (p[4] + p[7]) * halfW
    css[5] = (p[7] - p[5]) * halfH
    css[7] = p[7]
    css[10] = 1
    css[12] = (p[12] + p[15]) * halfW
    css[13] = (p[15] - p[13]) * halfH
    css[15] = p[15]
    link.style.transform = `matrix3d(${css.join(',')})`
    link.style.zIndex = String(Math.max(1, 1000 - Math.round(toCamera.length() * 10)))
  }, .5)

  return <group ref={group} position={position} rotation={rotation} />
}
