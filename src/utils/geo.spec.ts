import { describe, expect, it } from 'vitest'
import { haversineKm, mergeSlotOrder, nearestNeighbourOrder } from './geo'

describe('haversineKm', () => {
  it('measures a known distance', () => {
    // Jakarta (Monas) to Bandung (Gedung Sate) is about 116 km as the crow flies.
    const d = haversineKm({ lat: -6.1754, lng: 106.8272 }, { lat: -6.9025, lng: 107.6187 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(122)
  })

  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 1, lng: 2 }, { lat: 1, lng: 2 })).toBe(0)
  })
})

describe('nearestNeighbourOrder', () => {
  const line = [
    { id: 1, lat: 0, lng: 0 },
    { id: 2, lat: 0, lng: 3 },
    { id: 3, lat: 0, lng: 1 },
    { id: 4, lat: 0, lng: 2 },
  ]

  it('walks to the nearest remaining point from the start', () => {
    expect(nearestNeighbourOrder(line, 1)).toEqual([1, 3, 4, 2])
  })

  it('starts from the first point when the start id is unknown', () => {
    expect(nearestNeighbourOrder(line, 99)).toEqual([1, 3, 4, 2])
  })

  it('breaks distance ties by id', () => {
    const tie = [
      { id: 10, lat: 0, lng: 0 },
      { id: 7, lat: 1, lng: 0 },
      { id: 5, lat: -1, lng: 0 },
    ]
    expect(nearestNeighbourOrder(tie, 10)).toEqual([10, 5, 7])
  })

  it('puts points without a location last, in their relative order', () => {
    const mixed = [
      { id: 1, lat: 0, lng: 0 },
      { id: 8, lat: null, lng: null },
      { id: 2, lat: 0, lng: 1 },
      { id: 9 },
    ]
    expect(nearestNeighbourOrder(mixed, 1)).toEqual([1, 2, 8, 9])
  })
})

describe('mergeSlotOrder', () => {
  it('reorders a subset within the slots it occupied', () => {
    expect(mergeSlotOrder([1, 2, 3, 4, 5], [5, 2, 1])).toEqual([5, 2, 3, 4, 1])
  })

  it('leaves the order alone for an unchanged subset', () => {
    expect(mergeSlotOrder([1, 2, 3], [1, 3])).toEqual([1, 2, 3])
  })
})
