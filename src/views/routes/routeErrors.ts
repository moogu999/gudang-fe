import { ApiError } from '@/types/api.type'
import { translateCustomerBranchError } from '@/utils/customerBranchErrors'
import type { InvalidCustomDate, TeamRouteConflict } from '@/types/route.type'

/** Every code the route API returns, with the form field it belongs to, if any. */
const ERRORS: Record<string, { key: string; field?: 'code' | 'name' | 'salesTeamId' }> = {
  ROUTE_NOT_FOUND: { key: 'notFound' },
  ROUTE_CODE_DUPLICATE: { key: 'codeDuplicate', field: 'code' },
  ROUTE_NAME_DUPLICATE: { key: 'nameDuplicate', field: 'name' },
  ROUTE_TEAM_BRANCH_MISMATCH: { key: 'teamBranchMismatch', field: 'salesTeamId' },
  ROUTE_TEAM_INACTIVE: { key: 'teamInactive', field: 'salesTeamId' },
  ROUTE_TEAM_LOCKED: { key: 'teamLocked', field: 'salesTeamId' },
  ROUTE_INACTIVE: { key: 'inactive' },
  STALE: { key: 'stale' },
  ROUTE_CUSTOMER_IN_TEAM_ROUTE: { key: 'customerInTeamRoute' },
  ROUTE_CUSTOMER_ALREADY_IN_ROUTE: { key: 'customerAlreadyInRoute' },
  ROUTE_MOVE_TEAM_MISMATCH: { key: 'moveTeamMismatch' },
  ROUTE_PATTERN_INVALID: { key: 'patternInvalid' },
  ROUTE_SUNDAY_NOT_ALLOWED: { key: 'sundayNotAllowed' },
  ROUTE_CUSTOM_DATE_INVALID: { key: 'customDateInvalid' },
  ROUTE_REORDER_MISMATCH: { key: 'reorderMismatch' },
  ROUTE_HANDOVER_DATE_INVALID: { key: 'handoverDateInvalid' },
  ROUTE_HOLDER_NOT_ELIGIBLE: { key: 'holderNotEligible' },
  ROUTE_HOLDER_UNCHANGED: { key: 'holderUnchanged' },
  ROUTE_NO_PENDING_HANDOVER: { key: 'noPendingHandover' },
}

/** The codes this module knows, for tests and for keeping the locale files complete. */
export const ROUTE_ERROR_CODES = Object.keys(ERRORS)

/** The machine-readable code on an API error, if it has one. */
export function routeErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/** The i18n key of a code's message, or undefined for a code this module doesn't know. */
export function routeErrorKey(code: string | undefined): string | undefined {
  const entry = code ? ERRORS[code] : undefined
  return entry ? `routes.errors.${entry.key}` : undefined
}

/** The form field a code belongs to, shown inline instead of in a toast. */
export function routeErrorField(code: string | undefined): 'code' | 'name' | 'salesTeamId' | undefined {
  return code ? ERRORS[code]?.field : undefined
}

function detailList<T>(e: unknown, code: string): T[] {
  if (!(e instanceof ApiError) || e.code !== code) return []
  const details = e.details as unknown
  return Array.isArray(details) ? (details as T[]) : []
}

/** The routes a customer already sits in, from `ROUTE_CUSTOMER_IN_TEAM_ROUTE`. */
export function teamRouteConflicts(e: unknown): TeamRouteConflict[] {
  return detailList<TeamRouteConflict>(e, 'ROUTE_CUSTOMER_IN_TEAM_ROUTE')
}

/** The refused dates, from `ROUTE_CUSTOM_DATE_INVALID`. */
export function invalidCustomDates(e: unknown): InvalidCustomDate[] {
  return detailList<InvalidCustomDate>(e, 'ROUTE_CUSTOM_DATE_INVALID')
}

/** Why a salesman can't hold the route, from `ROUTE_HOLDER_NOT_ELIGIBLE`. */
export function holderIneligibleReason(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || e.code !== 'ROUTE_HOLDER_NOT_ELIGIBLE') return undefined
  const details = e.details as { reason?: string } | undefined
  return details?.reason
}

/**
 * Replaces an API error's message with its translation when the code is one the route
 * module knows (or a customer-branch code), so toasts are localized. Any other error is
 * returned unchanged.
 */
export function translateRouteError(e: unknown, t: (key: string) => string): unknown {
  const key = routeErrorKey(routeErrorCode(e))
  if (key) return new Error(t(key))
  return translateCustomerBranchError(e, t)
}
