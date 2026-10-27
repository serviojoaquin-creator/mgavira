export type AvenuePoster = {
  id: string
  t: number
  /** Public image URL. The panel fits the complete artwork at its original aspect ratio. */
  image?: string
}

// Overhead photo gantries, independent of service signs and camera stops.
// Stable IDs and the supplied image order are preserved.
export const avenuePosters: AvenuePoster[] = [
  { id: 'izquierda-01', t: .32, image: '/media/v24/acompanamiento.webp' },
  { id: 'izquierda-02', t: .42, image: '/media/v24/familia.webp' },
  { id: 'izquierda-03', t: .61, image: '/media/v24/cud.webp' },
  { id: 'izquierda-04', t: .84, image: '/media/v24/traslado-familiar.webp' },
]
