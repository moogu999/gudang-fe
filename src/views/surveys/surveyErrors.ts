import { ApiError } from '@/types/api.type'

/** The machine-readable code on an API error, if it has one. */
export function surveyErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/**
 * Replaces an API error's message with its translation when the code is a known one,
 * so toasts show the localized text rather than the server's English.
 */
export function translateSurveyError(
  e: unknown,
  t: (key: string) => string,
  exists: (key: string) => boolean,
): unknown {
  const code = surveyErrorCode(e)
  if (!code) return e
  const key = `surveys.errors.${code}`
  return exists(key) ? new Error(t(key)) : e
}

/** Codes the form shows on a field instead of in a toast. */
export function errorField(code: string | undefined): 'code' | undefined {
  if (code === 'SURVEY_CODE_DUPLICATE' || code === 'SURVEY_CODE_TOO_LONG') return 'code'
  return undefined
}

export interface ErrorLocation {
  /** Zero-based position of the question in the submitted array. */
  questionIndex?: number
  questionId?: number
  productIds?: number[]
}

/** Which question or products an error points at, when the API says. */
export function errorLocation(e: unknown): ErrorLocation {
  if (!(e instanceof ApiError) || !e.details) return {}
  const { index, questionId, productIds } = e.details
  const code = e.code
  const location: ErrorLocation = {}
  if (code === 'SURVEY_INVALID_QUESTION' || code === 'SURVEY_INVALID_OPTIONS') {
    if (index !== undefined) location.questionIndex = index
  }
  if (code === 'SURVEY_GRID_EMPTY' && questionId !== undefined) location.questionId = questionId
  if (code === 'SURVEY_PRODUCT_PRINCIPAL_MISMATCH' && productIds?.length) {
    location.productIds = productIds
  }
  return location
}

/** Codes that make the saved document stale: reload it. */
export function isReloadError(code: string | undefined): boolean {
  return (
    code === 'SURVEY_FIELD_LOCKED' ||
    code === 'SURVEY_UNKNOWN_QUESTION' ||
    code === 'SURVEY_UNKNOWN_OPTION'
  )
}
