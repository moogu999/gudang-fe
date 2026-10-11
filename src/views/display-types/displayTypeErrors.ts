import { ApiError } from '@/types/api.type'

const ERRORS: Record<string, { key: string; field?: 'code' | 'name' | 'minPhotos' }> = {
  DISPLAY_TYPE_CODE_DUPLICATE: { key: 'codeDuplicate', field: 'code' },
  DISPLAY_TYPE_INVALID_CODE: { key: 'invalidCode', field: 'code' },
  DISPLAY_TYPE_INVALID_NAME: { key: 'invalidName', field: 'name' },
  DISPLAY_TYPE_INVALID_MIN_PHOTOS: { key: 'invalidMinPhotos', field: 'minPhotos' },
  DISPLAY_TYPE_DESCRIPTION_TOO_LONG: { key: 'descriptionTooLong' },
  DISPLAY_TYPE_IN_USE: { key: 'inUse' },
  DISPLAY_TYPE_NOT_FOUND: { key: 'notFound' },
}

export const DISPLAY_TYPE_ERROR_CODES = Object.keys(ERRORS)

export function displayTypeErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/** The localized message key for a display type API error, if it carries a known code. */
export function displayTypeErrorKey(e: unknown): string | undefined {
  const code = displayTypeErrorCode(e)
  const entry = code ? ERRORS[code] : undefined
  return entry ? `displayTypes.errors.${entry.key}` : undefined
}

/** The form field an error belongs to, when it should show there rather than in a toast. */
export function displayTypeErrorField(e: unknown): 'code' | 'name' | 'minPhotos' | undefined {
  const code = displayTypeErrorCode(e)
  return code ? ERRORS[code]?.field : undefined
}
