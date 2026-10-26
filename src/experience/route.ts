import { CatmullRomCurve3, Vector3 } from 'three'

// One continuous road. getPointAt() uses distance-normalized progress.
export const route = new CatmullRomCurve3([
  new Vector3(-5, 0, 0), new Vector3(0, 0, 0), new Vector3(10, 0, -.8),
  new Vector3(21, 0, -2.2), new Vector3(32, 0, -1.4), new Vector3(43, 0, 2.2),
  new Vector3(54, 0, 4.2), new Vector3(65, 0, 2.5), new Vector3(76, 0, -1.5),
  new Vector3(88, 0, -2), new Vector3(100, 0, 1.5), new Vector3(112, 0, 2),
].map(point => point.multiplyScalar(1.45)), false, 'catmullrom', .52)

export const routeLength = route.getLength()

export const signStops = [
  { id: 'services', t: .275, side: 1 },
  { id: 'coverage', t: .455, side: 1 },
  { id: 'why', t: .645, side: 1 },
  { id: 'insurance', t: .805, side: 1 },
] as const

const stopPositions = [.125, .18, ...signStops.map(sign => sign.t), .984]
const departure = .045
export const cityIntersections = [.105, .365, .565, .735, .925] as const
export const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

// The six scroll chapters share a single timeline. Each sign chapter contains
// an approach, a complete stop for reading, and a camera pullback.
export function storyBeat(progress: number) {
  const scaled = Math.max(0, Math.min(5.99999, progress * 6))
  const chapter = Math.floor(scaled)
  const local = scaled - chapter
  const focus = chapter > 0 && chapter < 5
    ? smooth((local - .30) / .20) * (1 - smooth((local - .76) / .18))
    : 0
  return { chapter, local, focus }
}

export function driveState(progress: number) {
  const { chapter, local } = storyBeat(progress)
  const start = stopPositions[chapter] + (chapter > 1 ? departure : 0)
  const end = stopPositions[chapter + 1]
  const movement = chapter === 0 ? smooth(local) : chapter === 5
    ? smooth(local / .70) : smooth(local / .44)
  const exit = chapter > 0 && chapter < 5 ? departure * smooth((local - .92) / .08) : 0
  const arrival = chapter === 5 ? smooth((local - .16) / .48) : 0
  return { t: start + (end - start) * movement + exit, offset: 1.45 + arrival * 1.55 }
}

export function atRoad(progress: number, offset = 0) {
  const t = Math.max(0, Math.min(1, progress))
  const point = route.getPointAt(t)
  const tangent = route.getTangentAt(t).normalize()
  // Perpendicular in the horizontal plane; positive offset is camera-facing curb.
  const side = new Vector3(-tangent.z, 0, tangent.x)
  return { point: point.addScaledVector(side, offset), tangent, side }
}

