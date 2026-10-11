import { describe, it, expect } from 'vitest'
import {
  buildCreatePayload,
  buildUpdatePayload,
  criteriaErrors,
  fieldLocks,
  formatRent,
  frequencyLabel,
  isParticipantOpen,
  minPhotosAfterTypeChange,
  publishBlockers,
  statusSeverity,
  type FormState,
} from './displayProgramHelpers'

const state = (over: Partial<FormState> = {}): FormState => ({
  branchId: 1,
  name: '  Indomie shelf ',
  displayTypeId: 3,
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  notes: '',
  frequencyMode: 'every_visit',
  minPhotos: 2,
  criteria: [
    { key: 'a', id: 10, text: ' Strip installed ' },
    { key: 'b', text: 'Eye level' },
  ],
  ...over,
})

describe('fieldLocks', () => {
  it('locks nothing before the program exists', () => {
    expect(Object.values(fieldLocks(undefined)).some(Boolean)).toBe(false)
  })
  it('locks nothing in a draft', () => {
    expect(fieldLocks('draft').principal).toBe(false)
    expect(fieldLocks('draft').criteria).toBe(false)
  })
  it('locks only the principal once scheduled', () => {
    const l = fieldLocks('scheduled')
    expect(l.principal).toBe(true)
    expect(l.startDate || l.displayType || l.frequency || l.criteria || l.compensation).toBe(false)
  })
  it('locks the basis of field answers and rent once active', () => {
    const l = fieldLocks('active')
    expect([
      l.startDate,
      l.displayType,
      l.frequency,
      l.minPhotos,
      l.criteria,
      l.compensation,
    ]).toEqual([true, true, true, true, true, true])
    expect(l.all).toBe(false)
    expect(l.endDateFromToday).toBe(true)
  })
  it('locks everything once ended', () => {
    expect(fieldLocks('ended').all).toBe(true)
  })
})

describe('publishBlockers', () => {
  const ok = { criteriaCount: 1, photoCount: 1, participantCount: 1, endDate: '2026-12-31' }
  const now = new Date('2026-10-11T10:00:00')
  it('has none for a complete program', () => {
    expect(publishBlockers(ok, now)).toEqual([])
  })
  it('reports in the order the API does', () => {
    expect(
      publishBlockers(
        { criteriaCount: 0, photoCount: 0, participantCount: 0, endDate: '2026-10-01' },
        now,
      ),
    ).toEqual(['noCriteria', 'noPhotos', 'noParticipants', 'endInPast'])
  })
  it('lets a program end today', () => {
    expect(publishBlockers({ ...ok, endDate: '2026-10-11' }, now)).toEqual([])
  })
})

describe('labels', () => {
  const t = (key: string, p?: Record<string, unknown>) => (p ? `${key}:${p.n}` : key)
  it('names the frequency', () => {
    expect(frequencyLabel('every_visit', undefined, t)).toBe('displayPrograms.frequency.everyVisit')
    expect(frequencyLabel('min_per_month', 2, t)).toBe('displayPrograms.frequency.minPerMonth:2')
  })
  it('tells no rent from a rent of 0', () => {
    expect(formatRent(undefined, 'en-US')).toBeUndefined()
    expect(formatRent('', 'en-US')).toBeUndefined()
    expect(formatRent('0', 'en-US')).toBe('Rp 0')
    expect(formatRent('150000.00', 'en-US')).toBe('Rp 150,000')
  })
  it('maps statuses to severities', () => {
    expect(statusSeverity('draft')).toBe('warn')
    expect(statusSeverity('scheduled')).toBe('info')
    expect(statusSeverity('active')).toBe('success')
    expect(statusSeverity('ended')).toBe('secondary')
  })
  it('treats a future exit as still open', () => {
    const now = new Date('2026-10-11T10:00:00')
    expect(isParticipantOpen(undefined, now)).toBe(true)
    expect(isParticipantOpen('2026-10-11', now)).toBe(true)
    expect(isParticipantOpen('2026-10-10', now)).toBe(false)
  })
})

describe('minPhotosAfterTypeChange', () => {
  it('takes the new default while the user kept the old one', () => {
    expect(minPhotosAfterTypeChange(1, 1, 3)).toBe(3)
  })
  it('keeps a value the user changed', () => {
    expect(minPhotosAfterTypeChange(5, 1, 3)).toBe(5)
  })
  it('takes the default when there was no previous type', () => {
    expect(minPhotosAfterTypeChange(1, undefined, 2)).toBe(2)
  })
})

describe('criteriaErrors', () => {
  it('flags empty, long and repeated texts', () => {
    expect(criteriaErrors(['A', ' ', 'a', 'x'.repeat(201), 'B'])).toEqual([
      undefined,
      'required',
      'duplicate',
      'tooLong',
      undefined,
    ])
  })
})

describe('payloads', () => {
  it('omits an empty principal, notes and compensation', () => {
    const p = buildCreatePayload(state())
    expect(p).not.toHaveProperty('principalOptionId')
    expect(p).not.toHaveProperty('notes')
    expect(p).not.toHaveProperty('rentPerMonth')
    expect(p).not.toHaveProperty('minComplyPct')
    expect(p).not.toHaveProperty('minPerMonth')
    expect(p.name).toBe('Indomie shelf')
  })
  it('keeps the criteria order and the ids of saved ones', () => {
    expect(buildCreatePayload(state()).criteria).toEqual([
      { id: 10, text: 'Strip installed' },
      { text: 'Eye level' },
    ])
  })
  it('sends rent and the percentage together as strings', () => {
    const p = buildCreatePayload(state({ rentPerMonth: 150000, minComplyPct: 75 }))
    expect(p.rentPerMonth).toBe('150000')
    expect(p.minComplyPct).toBe('75')
  })
  it('keeps a rent of 0', () => {
    expect(buildCreatePayload(state({ rentPerMonth: 0, minComplyPct: 50 })).rentPerMonth).toBe('0')
  })
  it('drops min per month for every visit', () => {
    expect(buildCreatePayload(state({ minPerMonth: 4 }))).not.toHaveProperty('minPerMonth')
    expect(
      buildCreatePayload(state({ frequencyMode: 'min_per_month', minPerMonth: 4 })).minPerMonth,
    ).toBe(4)
  })
  it('sends a manual code only when given', () => {
    expect(buildCreatePayload(state())).not.toHaveProperty('code')
    expect(buildCreatePayload(state({ code: ' PDS-9 ' })).code).toBe('PDS-9')
  })
  it('carries the version on update and no branch or code', () => {
    const p = buildUpdatePayload(state(), 4)
    expect(p.version).toBe(4)
    expect(p).not.toHaveProperty('branchId')
    expect(p).not.toHaveProperty('code')
  })
})
