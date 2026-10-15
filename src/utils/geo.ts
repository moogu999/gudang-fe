export interface GeoPoint {
  id: number
  /** Null or undefined when the customer has no location. */
  lat?: number | null
  lng?: number | null
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Straight-line distance between two coordinates, in kilometres. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function located(p: GeoPoint): p is GeoPoint & { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number'
}

/**
 * Orders points by repeatedly going to the nearest unvisited one, starting from `startId`
 * (the first point when it is not found). Ties are broken by id so the result is stable.
 * Points without a location keep their relative order at the end.
 *
 * @returns The ids in the new order
 */
export function nearestNeighbourOrder(points: GeoPoint[], startId?: number): number[] {
  const withLocation = points.filter(located)
  const without = points.filter((p) => !located(p)).map((p) => p.id)
  if (withLocation.length === 0) return points.map((p) => p.id)

  const remaining = [...withLocation]
  const startIndex = Math.max(
    0,
    remaining.findIndex((p) => p.id === startId),
  )
  const order: number[] = []
  let current = remaining.splice(startIndex, 1)[0]
  order.push(current.id)

  while (remaining.length > 0) {
    let best = 0
    let bestDistance = Infinity
    remaining.forEach((candidate, i) => {
      const distance = haversineKm(current, candidate)
      if (distance < bestDistance || (distance === bestDistance && candidate.id < remaining[best].id)) {
        best = i
        bestDistance = distance
      }
    })
    current = remaining.splice(best, 1)[0]
    order.push(current.id)
  }
  return [...order, ...without]
}

/**
 * Applies a new relative order of a subset to the full route order: the subset's items
 * take the new order within the slots they occupied, and everything else stays put.
 *
 * @param fullOrder - Every id of the route, in the current order
 * @param subsetOrder - The subset's ids in the order they should now appear
 */
export function mergeSlotOrder(fullOrder: number[], subsetOrder: number[]): number[] {
  const subset = new Set(subsetOrder)
  let next = 0
  return fullOrder.map((id) => (subset.has(id) ? subsetOrder[next++] : id))
}
