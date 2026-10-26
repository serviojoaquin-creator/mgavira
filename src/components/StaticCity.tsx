import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Group } from 'three'

/** Architecture never animates: bake local transforms once, preserve normal frustum culling. */
export function StaticCity({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null)
  useLayoutEffect(() => {
    root.current?.traverse(object => { object.updateMatrix(); object.matrixAutoUpdate = false })
  }, [])
  return <group ref={root}>{children}</group>
}
