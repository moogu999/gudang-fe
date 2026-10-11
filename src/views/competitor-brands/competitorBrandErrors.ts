import { ApiError } from '@/types/api.type'

const ERROR_KEYS: Record<string, string> = {
  name_duplicate: 'competitorBrands.errors.nameDuplicate',
  competitor_brand_in_use: 'competitorBrands.errors.inUse',
}

/** The localized message key for a competitor brand API error, if it carries a known code. */
export function competitorBrandErrorKey(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.code) return undefined
  return ERROR_KEYS[e.code]
}

export function competitorBrandErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}
