import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3, type PerspectiveCamera } from 'three'
import type { MutableRefObject } from 'react'
import { atRoad, driveState, signStops, storyBeat } from '../experience/route'

type Pose = { forward: number; side: number; height: number; fov: number; lookAhead: number }
const hero: Pose = { forward: 6.4, side: 6.5, height: 1.95, fov: 38, lookAhead: .1 }
// Driver-height chase framing keeps the car anchored in the foreground.
const chase: Pose = { forward: -7.4, side: .26, height: 2.20, fov: 46, lookAhead: 6.2 }
const finish: Pose = { forward: 5.8, side: -6.6, height: 2.6, fov: 40, lookAhead: .1 }
const position = new Vector3()
const target = new Vector3()
const currentTarget = new Vector3()
const signPosition = new Vector3()
const signTarget = new Vector3()

export function CameraDirector({ progress, compact }: { progress: MutableRefObject<number>; compact: boolean }) {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const p = progress.current
    const beat = storyBeat(p)
    const { t, offset } = driveState(p)
    const { point, tangent, side } = atRoad(t, offset)
    const heroMix = 1 - MathUtils.smoothstep(p, .065, .20)
    const finishMix = MathUtils.smoothstep(p, .855, .945)
    const pose: Pose = {
      forward: MathUtils.lerp(MathUtils.lerp(chase.forward, hero.forward, heroMix), finish.forward, finishMix),
      side: MathUtils.lerp(MathUtils.lerp(chase.side, hero.side, heroMix), finish.side, finishMix),
      height: MathUtils.lerp(MathUtils.lerp(chase.height, hero.height, heroMix), finish.height, finishMix),
      fov: MathUtils.lerp(MathUtils.lerp(chase.fov, hero.fov, heroMix), finish.fov, finishMix),
      lookAhead: MathUtils.lerp(MathUtils.lerp(chase.lookAhead, hero.lookAhead, heroMix), finish.lookAhead, finishMix),
    }
    position.copy(point).addScaledVector(tangent, pose.forward * (compact ? 1.12 : 1))
      .addScaledVector(side, pose.side * (compact ? .14 + .94 * heroMix + .86 * finishMix : 1))
    if (compact && heroMix > 0) position.addScaledVector(side, heroMix * .2).addScaledVector(tangent, heroMix * 1)
    position.y += pose.height * (compact ? 1.06 : 1)
    target.copy(point).addScaledVector(tangent, pose.lookAhead)
    // Keep the parked vehicle beside the hero copy, with a separate mobile composition.
    if (!compact) {
      position.addScaledVector(tangent, -1.4 * heroMix).addScaledVector(side, 1.4 * heroMix)
      target.addScaledVector(tangent, -1.4 * heroMix).addScaledVector(side, 1.4 * heroMix)
    }
    target.y += compact ? .85 + .65 * heroMix : .85
    target.y -= finishMix * (compact ? .85 : .45)
    target.y += (1 - heroMix) * (1 - finishMix) * .25
    let fov = pose.fov + (compact ? 8 + heroMix * 3 : 0)

    if (beat.focus > .001) {
      const sign = signStops[beat.chapter - 1]
      const frame = atRoad(sign.t, 7.15)
      signPosition.copy(frame.point)
        .addScaledVector(frame.side, compact ? -13.4 : -13.1)
      signPosition.y = 4.7
      signTarget.copy(frame.point)
      signTarget.y = 4.65
      position.lerp(signPosition, beat.focus)
      target.lerp(signTarget, beat.focus)
      fov = MathUtils.lerp(fov, compact ? 48 : 47, beat.focus)
    }

    const mix = 1 - Math.exp(-4.2 * Math.min(delta, .08))
    camera.position.lerp(position, mix)
    currentTarget.lerp(target, mix)
    camera.lookAt(currentTarget)
    const perspective = camera as PerspectiveCamera
    perspective.fov = MathUtils.lerp(perspective.fov, fov, mix)
    perspective.updateProjectionMatrix()
  })
  return null
}
