export const WHEEL_RADIUS_METERS = .31

// Signed distance keeps the wheel reversible when the visitor scrolls upward.
export function wheelRotation(distanceMeters: number) {
  return -distanceMeters / WHEEL_RADIUS_METERS
}
