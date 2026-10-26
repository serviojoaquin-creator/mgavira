export type AvenuePoster = {
  id: string
  t: number
  /** Public image URL. The panel fits the complete artwork at its original aspect ratio. */
  image?: string
}

// Independent of service signs and camera stops; follows the supplied image order.
export const avenuePosters: AvenuePoster[] = [
  { id: 'izquierda-01', t: .245, image: '/media/v24/acompanamiento.webp' },
  { id: 'izquierda-02', t: .42, image: '/media/v24/familia.webp' },
  { id: 'izquierda-03', t: .61, image: '/media/v24/cud.webp' },
  { id: 'izquierda-04', t: .84, image: '/media/v24/traslado-familiar.webp' },
]
