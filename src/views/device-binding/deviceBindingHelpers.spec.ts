import { describe, it, expect } from 'vitest'
import {
  blockingCheck,
  deviceDifferences,
  formatCode,
  initials,
  normalizePhone,
  relativeDay,
  reviewChecks,
  shortUid,
  waMeLink,
} from './deviceBindingHelpers'
import type { ChangeRequestReview, Device } from '@/types/deviceBinding.type'

function device(overrides: Partial<Device> = {}): Device {
  return {
    id: 1,
    deviceUid: 'aaaa',
    platform: 'android',
    model: 'Redmi 9A',
    osVersion: '11',
    status: 'active',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

function review(overrides: Partial<ChangeRequestReview> = {}): ChangeRequestReview {
  return {
    employee: { id: 1, name: 'Budi', typeName: 'Salesman' },
    current: device(),
    requested: device({ id: 2, status: 'pending', model: 'Galaxy A15' }),
    checks: { pinLogin: true, notBoundElsewhere: true, notBlocked: true, noRiskFlags: true },
    differences: ['model'],
    approval: { flowConfigured: true, submitted: true },
    ...overrides,
  }
}

describe('shortUid', () => {
  it('keeps the first and last four characters', () => {
    expect(shortUid('9f3a1b2c3d4e5f60c21e')).toBe('9f3a…c21e')
  })
  it('leaves short ids alone and dashes a missing one', () => {
    expect(shortUid('abc')).toBe('abc')
    expect(shortUid(undefined)).toBe('—')
  })
})

describe('normalizePhone', () => {
  // The same cases as the backend's normalize_phone parity test.
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['(021) 555-1234', '62215551234'],
    [undefined, ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('waMeLink', () => {
  it('points at the normalized number with the text encoded', () => {
    expect(waMeLink('0812-3456-7890', 'Kode: 731 905')).toBe(
      'https://wa.me/6281234567890?text=Kode%3A%20731%20905',
    )
  })
})

describe('formatCode', () => {
  it('groups a 6-digit code 3 + 3', () => {
    expect(formatCode('731905')).toBe('731 905')
    expect(formatCode(undefined)).toBe('')
  })
})

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Budi Santoso Wijaya')).toBe('BW')
    expect(initials('Budi')).toBe('BU')
  })
})

describe('relativeDay', () => {
  const now = new Date(2026, 9, 10, 15, 0)
  it('says today, yesterday or N days ago', () => {
    expect(relativeDay(new Date(2026, 9, 10, 7, 12).toISOString(), now)).toEqual({
      kind: 'today',
      time: '07:12',
    })
    expect(relativeDay(new Date(2026, 9, 9, 23, 0).toISOString(), now).kind).toBe('yesterday')
    expect(relativeDay(new Date(2026, 9, 8, 9, 0).toISOString(), now)).toMatchObject({
      kind: 'daysAgo',
      days: 2,
    })
  })
})

describe('reviewChecks', () => {
  it('passes everything on a clean request and warns about the old phone', () => {
    const checks = reviewChecks(review())
    expect(checks.map((c) => c.key)).toEqual([
      'pinLogin',
      'notBoundElsewhere',
      'notBlocked',
      'noRiskFlags',
      'oldLastSync',
    ])
    expect(checks.slice(0, 4).every((c) => c.ok && c.severity === 'success')).toBe(true)
    expect(checks[4]!.severity).toBe('warn')
  })

  it('marks binding failures as errors and risk flags as warnings', () => {
    const checks = reviewChecks(
      review({
        checks: { pinLogin: true, notBoundElsewhere: false, notBlocked: false, noRiskFlags: false },
      }),
    )
    const byKey = Object.fromEntries(checks.map((c) => [c.key, c]))
    expect(byKey.notBoundElsewhere!.severity).toBe('danger')
    expect(byKey.notBlocked!.severity).toBe('danger')
    expect(byKey.noRiskFlags!.severity).toBe('warn')
  })

  it('skips the old-phone check when nothing is bound', () => {
    expect(reviewChecks(review({ current: undefined })).map((c) => c.key)).not.toContain(
      'oldLastSync',
    )
  })
})

describe('blockingCheck', () => {
  it('names the first check that would make the approval fail', () => {
    expect(blockingCheck(review())).toBeUndefined()
    expect(
      blockingCheck(
        review({
          checks: {
            pinLogin: true,
            notBoundElsewhere: false,
            notBlocked: false,
            noRiskFlags: true,
          },
        }),
      ),
    ).toBe('notBoundElsewhere')
    expect(
      blockingCheck(
        review({
          checks: { pinLogin: true, notBoundElsewhere: true, notBlocked: false, noRiskFlags: true },
        }),
      ),
    ).toBe('notBlocked')
  })
})

describe('deviceDifferences', () => {
  it('trusts the server list when there is one', () => {
    expect([...deviceDifferences(device(), device(), ['platform'])]).toEqual(['platform'])
  })
  it('compares platform, model and OS otherwise', () => {
    const diff = deviceDifferences(
      device(),
      device({ platform: 'ios', model: 'iPhone 13', osVersion: '17' }),
    )
    expect([...diff].sort()).toEqual(['model', 'osVersion', 'platform'])
    expect(deviceDifferences(undefined, device()).size).toBe(0)
  })
})
