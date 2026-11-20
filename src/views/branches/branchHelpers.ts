/**
 * True when the depot point is half filled or out of range. Both fields empty is
 * valid: a branch without a depot point skips the radius check.
 */
export function coordinatesError(latitude: string, longitude: string): boolean {
  const lat = latitude.trim()
  const lng = longitude.trim()
  if (!lat && !lng) return false
  if (!lat || !lng) return true
  const latValue = Number(lat)
  const lngValue = Number(lng)
  return (
    !Number.isFinite(latValue) ||
    !Number.isFinite(lngValue) ||
    Math.abs(latValue) > 90 ||
    Math.abs(lngValue) > 180
  )
}

/** The decimal string the API takes, or `null` to clear the point. */
export function toCoordinate(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
