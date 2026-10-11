import { ApiError } from '@/types/api.type'

/** i18n keys for the machine-readable codes the competitor product API sends. */
const ERROR_KEYS: Record<string, string> = {
  code_duplicate: 'competitorProducts.errors.codeDuplicate',
  name_duplicate: 'competitorProducts.errors.nameDuplicate',
  brand_inactive: 'competitorProducts.errors.brandInactive',
  primary_required: 'competitorProducts.errors.primaryRequired',
  number_series_missing: 'competitorProducts.errors.numberSeriesMissing',
  competitor_product_in_use: 'competitorProducts.errors.inUse',
  competitor_product_inactive: 'competitorProducts.errors.targetInactive',
  recommendation_not_pending: 'competitorProducts.recommendations.alreadyResolved',
  file_limit_reached: 'competitorProducts.errors.fileLimitReached',
}

/** The localized message key for a competitor product API error, if it carries a known code. */
export function competitorProductErrorKey(e: unknown): string | undefined {
  if (!(e instanceof ApiError) || !e.code) return undefined
  return ERROR_KEYS[e.code]
}

export function competitorProductErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}
