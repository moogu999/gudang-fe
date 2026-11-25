import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import {
  distanceText,
  formatClockTime,
  isValidRange,
  rowKey,
  statusSeverity,
} from './depotAttendanceHelpers'

describe('statusSeverity', () => {
  it('maps statuses to tag colours', () => {
    expect(statusSeverity('in_radius')).toBe('success')
    expect(statusSeverity('outside_radius')).toBe('danger')
    expect(statusSeverity('missing')).toBe('warn')
    expect(statusSeverity('exempt_missing')).toBe('warn')
    expect(statusSeverity('no_depot_point')).toBe('info')
    expect(statusSeverity('holiday')).toBe('secondary')
    expect(statusSeverity('not_scheduled')).toBe('secondary')
    expect(statusSeverity('not_required')).toBe('secondary')
  })
})

describe('isValidRange', () => {
  const day = (s: string) => dayjs(s)
  it('allows one day and 31 days', () => {
    expect(isValidRange(day('2026-11-19'), day('2026-11-19'))).toBe(true)
    expect(isValidRange(day('2026-10-20'), day('2026-11-19'))).toBe(true)
  })
  it('rejects a reversed range and more than 31 days', () => {
    expect(isValidRange(day('2026-11-19'), day('2026-11-18'))).toBe(false)
    expect(isValidRange(day('2026-10-01'), day('2026-11-19'))).toBe(false)
  })
})

describe('distanceText', () => {
  it('shows distance against radius', () => {
    expect(distanceText(120, 150)).toBe('120 m / 150 m')
    expect(distanceText(120, null)).toBe('120 m')
    expect(distanceText(null, 150)).toBe('—')
  })
})

describe('rowKey', () => {
  it('is unique per salesman and day', () => {
    expect(rowKey({ employee: { id: 4 }, date: '2026-11-19' })).toBe('4:2026-11-19')
  })
})

describe('formatClockTime', () => {
  it('reads the time in WIB', () => {
    expect(formatClockTime('2026-11-19T01:05:00Z')).toBe('08:05')
    expect(formatClockTime(null)).toBe('—')
  })
})
