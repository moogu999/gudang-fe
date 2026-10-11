import { ApiError } from '@/types/api.type'

/** Every code the display program API returns, and the form field it belongs to, if any. */
const ERRORS: Record<string, { key: string; field?: 'code' }> = {
  DISPLAY_PROGRAM_CODE_DUPLICATE: { key: 'codeDuplicate', field: 'code' },
  DISPLAY_PROGRAM_CODE_TOO_LONG: { key: 'codeTooLong', field: 'code' },
  DISPLAY_PROGRAM_NUMBER_SERIES_MISSING: { key: 'numberSeriesMissing' },
  DISPLAY_PROGRAM_STALE: { key: 'stale' },
  DISPLAY_PROGRAM_FIELD_LOCKED: { key: 'fieldLocked' },
  DISPLAY_PROGRAM_ENDED: { key: 'ended' },
  DISPLAY_PROGRAM_NOT_DRAFT: { key: 'notDraft' },
  DISPLAY_PROGRAM_NOT_SCHEDULED: { key: 'notScheduled' },
  DISPLAY_PROGRAM_NOT_ACTIVE: { key: 'notActive' },
  DISPLAY_PROGRAM_NO_CRITERIA: { key: 'noCriteria' },
  DISPLAY_PROGRAM_NO_PHOTOS: { key: 'noPhotos' },
  DISPLAY_PROGRAM_NO_PARTICIPANTS: { key: 'noParticipants' },
  DISPLAY_PROGRAM_NO_CUSTOMERS: { key: 'noCustomers' },
  DISPLAY_PROGRAM_PERIOD_EXCLUDES_PARTICIPANTS: { key: 'periodExcludesParticipants' },
  DISPLAY_PROGRAM_PARTICIPANT_REMOVE_ACTIVE: { key: 'participantRemoveActive' },
  DISPLAY_PROGRAM_PARTICIPANT_ALREADY_EXITED: { key: 'participantAlreadyExited' },
  DISPLAY_PROGRAM_PARTICIPANT_NOT_FOUND: { key: 'participantNotFound' },
  DISPLAY_PROGRAM_PARTICIPANT_DATE_OUT_OF_RANGE: { key: 'participantDateOutOfRange' },
  DISPLAY_PROGRAM_END_BEFORE_TODAY: { key: 'endBeforeToday' },
  DISPLAY_PROGRAM_INVALID_NAME: { key: 'invalidName' },
  DISPLAY_PROGRAM_INVALID_PERIOD: { key: 'invalidPeriod' },
  DISPLAY_PROGRAM_INVALID_FREQUENCY: { key: 'invalidFrequency' },
  DISPLAY_PROGRAM_INVALID_COMPENSATION: { key: 'invalidCompensation' },
  DISPLAY_PROGRAM_INVALID_RENT: { key: 'invalidRent' },
  DISPLAY_PROGRAM_INVALID_CRITERIA: { key: 'invalidCriteria' },
  DISPLAY_PROGRAM_UNKNOWN_CRITERION: { key: 'unknownCriterion' },
  DISPLAY_PROGRAM_INVALID_PRINCIPAL: { key: 'invalidPrincipal' },
  DISPLAY_PROGRAM_INVALID_DISPLAY_TYPE: { key: 'invalidDisplayType' },
  DISPLAY_PROGRAM_DISPLAY_TYPE_INACTIVE: { key: 'displayTypeInactive' },
  DISPLAY_PROGRAM_INVALID_CUSTOMER: { key: 'invalidCustomer' },
  DISPLAY_PROGRAM_TOO_MANY_CUSTOMERS: { key: 'tooManyCustomers' },
  DISPLAY_PROGRAM_NOTES_TOO_LONG: { key: 'notesTooLong' },
  DISPLAY_PROGRAM_INVALID_STATE: { key: 'invalidState' },
  DISPLAY_PROGRAM_INVALID_STATUS: { key: 'invalidStatus' },
  DISPLAY_PROGRAM_BRANCH_NOT_ASSIGNED: { key: 'branchNotAssigned' },
  DISPLAY_PROGRAM_NOT_FOUND: { key: 'notFound' },
}

/** The codes this module knows, for tests and for keeping the locale files complete. */
export const DISPLAY_PROGRAM_ERROR_CODES = Object.keys(ERRORS)

/** The machine-readable code on an API error, if it has one. */
export function displayProgramErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/** The i18n key of a code's message, or undefined for a code this module doesn't know. */
export function displayProgramErrorKey(code: string | undefined): string | undefined {
  const entry = code ? ERRORS[code] : undefined
  return entry ? `displayPrograms.errors.${entry.key}` : undefined
}

/** Codes the form shows on a field instead of in a toast. */
export function displayProgramErrorField(code: string | undefined): 'code' | undefined {
  return code ? ERRORS[code]?.field : undefined
}

/**
 * Replaces an API error's message with its translation when the code is a known one,
 * so toasts show the localized text rather than the server's English.
 */
export function translateDisplayProgramError(e: unknown, t: (key: string) => string): unknown {
  const key = displayProgramErrorKey(displayProgramErrorCode(e))
  return key ? new Error(t(key)) : e
}
