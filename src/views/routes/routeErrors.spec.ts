import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import en from '@/i18n/locales/en-US'
import id from '@/i18n/locales/id-ID'
import {
  ROUTE_ERROR_CODES,
  holderIneligibleReason,
  invalidCustomDates,
  routeErrorCode,
  routeErrorField,
  routeErrorKey,
  teamRouteConflicts,
  translateRouteError,
} from './routeErrors'

const lookup = (messages: unknown, key: string) =>
  key
    .split('.')
    .reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], messages)

describe('routeErrors', () => {
  it('has a message in both locales for every code', () => {
    for (const code of ROUTE_ERROR_CODES) {
      const key = routeErrorKey(code)!
      expect(typeof lookup(en, key), `${code} en`).toBe('string')
      expect(typeof lookup(id, key), `${code} id`).toBe('string')
    }
  })

  it('puts form-level codes on their field', () => {
    expect(routeErrorField('ROUTE_NAME_DUPLICATE')).toBe('name')
    expect(routeErrorField('ROUTE_CODE_DUPLICATE')).toBe('code')
    expect(routeErrorField('ROUTE_TEAM_LOCKED')).toBe('salesTeamId')
    expect(routeErrorField('STALE')).toBeUndefined()
  })

  it('translates a known code and leaves other errors alone', () => {
    const known = new ApiError('server english', 409, 'ROUTE_TEAM_LOCKED')
    const out = translateRouteError(known, (k) => `t:${k}`) as Error
    expect(out.message).toBe('t:routes.errors.teamLocked')
    const unknown = new ApiError('x', 500, 'SOMETHING_ELSE')
    expect(translateRouteError(unknown, (k) => k)).toBe(unknown)
    expect(routeErrorCode(new Error('plain'))).toBeUndefined()
  })

  it('still translates the customer-branch codes', () => {
    const e = new ApiError('x', 400, 'CUSTOMER_BRANCH_MISMATCH')
    expect((translateRouteError(e, (k) => `t:${k}`) as Error).message).toMatch(/^t:/)
  })

  it('reads the details that come with a code', () => {
    const conflict = new ApiError('x', 409, 'ROUTE_CUSTOMER_IN_TEAM_ROUTE', [
      { customerId: 4, routeId: 2, routeCode: 'RT-002', routeName: 'Pondok', holderName: 'Agus' },
    ] as never)
    expect(teamRouteConflicts(conflict)).toHaveLength(1)
    expect(teamRouteConflicts(new ApiError('x', 409, 'OTHER'))).toEqual([])

    const dates = new ApiError('x', 400, 'ROUTE_CUSTOM_DATE_INVALID', [
      { date: '2026-10-20', reason: 'holiday' },
    ] as never)
    expect(invalidCustomDates(dates)[0].date).toBe('2026-10-20')

    const holder = new ApiError('x', 400, 'ROUTE_HOLDER_NOT_ELIGIBLE', {
      reason: 'not_team_member',
    } as never)
    expect(holderIneligibleReason(holder)).toBe('not_team_member')
  })
})
