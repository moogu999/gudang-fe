import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import {
  canCloseDay,
  checkInOutText,
  dayRowKey,
  dayStatusSeverity,
  distanceText,
  isValidRange,
  qtyText,
  rowKey,
  sequenceText,
  statusSeverity,
} from './visitHelpers'

describe('statusSeverity', () => {
  it('maps statuses to tag colours', () => {
    expect(statusSeverity('completed')).toBe('success')
    expect(statusSeverity('active')).toBe('info')
    expect(statusSeverity('closed')).toBe('contrast')
    expect(statusSeverity('not_visited')).toBe('warn')
    expect(statusSeverity('not_checked_out')).toBe('warn')
    expect(statusSeverity('pending')).toBe('secondary')
    expect(statusSeverity('skipped')).toBe('secondary')
  })
})

describe('isValidRange', () => {
  it('allows one day and 31 days, rejects reversed or longer', () => {
    expect(isValidRange(dayjs('2026-11-19'), dayjs('2026-11-19'))).toBe(true)
    expect(isValidRange(dayjs('2026-10-20'), dayjs('2026-11-19'))).toBe(true)
    expect(isValidRange(dayjs('2026-11-19'), dayjs('2026-11-18'))).toBe(false)
    expect(isValidRange(dayjs('2026-10-01'), dayjs('2026-11-19'))).toBe(false)
  })
})

describe('text helpers', () => {
  it('formats distance, sequence and row key', () => {
    expect(distanceText(120, 150)).toBe('120 m / 150 m')
    expect(distanceText(120)).toBe('120 m')
    expect(distanceText(null, 150)).toBe('—')
    expect(sequenceText(3, 2)).toBe('3 / 2')
    expect(sequenceText(3, null)).toBe('3 / —')
    expect(
      rowKey({
        planDate: '2026-11-19',
        employee: { id: 2, name: 'x' },
        customer: { id: 9, code: 'c', name: 'n' },
      }),
    ).toBe('2026-11-19:2:9')
  })

  it('trims decimal-string quantities', () => {
    expect(qtyText('4.0000')).toBe('4')
    expect(qtyText('1.5000')).toBe('1.5')
    expect(qtyText('10')).toBe('10')
    expect(qtyText(null)).toBe('—')
  })

  it('shows check-in and out in WIB', () => {
    expect(checkInOutText('2026-11-19T01:05:00Z', '2026-11-19T01:40:00Z')).toBe('08:05 – 08:40')
    expect(checkInOutText('2026-11-19T01:05:00Z', null)).toBe('08:05 –')
    expect(checkInOutText(null, null)).toBe('—')
  })
})

describe('day helpers', () => {
  it('maps day statuses to severities', () => {
    expect(dayStatusSeverity('open')).toBe('warn')
    expect(dayStatusSeverity('closed')).toBe('success')
    expect(dayStatusSeverity('closed_by_supervisor')).toBe('secondary')
  })

  it('keys a day by date and salesman', () => {
    expect(dayRowKey({ date: '2026-11-19', employee: { id: 4, name: 'B' } })).toBe('2026-11-19:4')
  })

  it('lets a supervisor close only an open, past day', () => {
    const today = '2026-11-22'
    expect(canCloseDay({ status: 'open', date: '2026-11-21' }, true, today)).toBe(true)
    expect(canCloseDay({ status: 'open', date: today }, true, today)).toBe(false)
    expect(canCloseDay({ status: 'closed', date: '2026-11-21' }, true, today)).toBe(false)
    expect(canCloseDay({ status: 'open', date: '2026-11-21' }, false, today)).toBe(false)
  })
})
