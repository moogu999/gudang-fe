export interface MapCircle {
  id: number
  lat: number
  lng: number
  radiusM: number
}

const EARTH_RADIUS_M = 6_371_000

/**
 * A circle on the map as a closed GeoJSON ring of `steps` points. The ring is
 * an approximation, accurate to well under a metre at the radii attendance
 * uses (hundreds of metres), and its first and last points are the same.
 */
export function circleRing(circle: MapCircle, steps = 64): [number, number][] {
  const latRad = (circle.lat * Math.PI) / 180
  const lngRad = (circle.lng * Math.PI) / 180
  const angular = circle.radiusM / EARTH_RADIUS_M
  const ring: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const bearing = (2 * Math.PI * i) / steps
    const lat = Math.asin(
      Math.sin(latRad) * Math.cos(angular) +
        Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
    )
    const lng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(lat),
      )
    ring.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI])
  }
  ring.push(ring[0]!)
  return ring
}

/** The circles as a GeoJSON FeatureCollection of polygons. */
export function circlesToGeoJson(circles: MapCircle[]) {
  return {
    type: 'FeatureCollection' as const,
    features: circles.map((c) => ({
      type: 'Feature' as const,
      properties: { id: c.id },
      geometry: { type: 'Polygon' as const, coordinates: [circleRing(c)] },
    })),
  }
}
