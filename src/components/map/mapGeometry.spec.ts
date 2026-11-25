import { describe, it, expect } from 'vitest'
import { circleRing, circlesToGeoJson } from './mapGeometry'

function metres(a: [number, number], lat: number, lng: number): number {
  const dLat = ((a[1] - lat) * Math.PI) / 180
  const dLng = ((a[0] - lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((a[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

describe('circleRing', () => {
  const circle = { id: 1, lat: -6.2, lng: 106.8, radiusM: 150 }

  it('closes the ring', () => {
    const ring = circleRing(circle)
    expect(ring).toHaveLength(65)
    expect(ring[0]).toEqual(ring[64])
  })

  it('keeps every point at the radius from the centre', () => {
    for (const p of circleRing(circle)) {
      expect(metres(p, circle.lat, circle.lng)).toBeCloseTo(150, 0)
    }
  })

  it('wraps rings into a feature collection', () => {
    const json = circlesToGeoJson([circle])
    expect(json.features).toHaveLength(1)
    expect(json.features[0]!.geometry.type).toBe('Polygon')
  })
})
