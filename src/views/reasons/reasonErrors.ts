import { ApiError } from '@/types/api.type'

/** i18n keys for the machine-readable codes the reasons API sends on a 409. */
const ERROR_KEYS: Record<string, string> = {
  code_duplicate: 'reasons.errors.codeDuplicate',
  name_duplicate: 'reasons.errors.nameDuplicate',
  last_active_reason: 'reasons.errors.lastActiveReason',
  reason_in_use: 'reasons.errors.inUse',
  stale_order: 'reasons.errors.staleOrder',
}

/** The localized message key for a reasons API error, if it carries a known code. */
export function reasonErrorKey(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.code) return undefined
  return ERROR_KEYS[e.code]
}

export function reasonErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}
