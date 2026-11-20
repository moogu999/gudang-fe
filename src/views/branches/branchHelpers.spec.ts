import { describe, it, expect } from 'vitest'
import { coordinatesError, toCoordinate } from './branchHelpers'

describe('coordinatesError', () => {
  it('accepts both empty and a valid pair', () => {
    expect(coordinatesError('', '')).toBe(false)
    expect(coordinatesError('-6.2', '106.8')).toBe(false)
  })
  it('rejects half a pair, junk and out of range', () => {
    expect(coordinatesError('-6.2', '')).toBe(true)
    expect(coordinatesError('', '106.8')).toBe(true)
    expect(coordinatesError('abc', '106.8')).toBe(true)
    expect(coordinatesError('91', '10')).toBe(true)
    expect(coordinatesError('10', '181')).toBe(true)
  })
})

describe('toCoordinate', () => {
  it('trims and maps blank to null', () => {
    expect(toCoordinate(' -6.2 ')).toBe('-6.2')
    expect(toCoordinate('  ')).toBeNull()
  })
})
