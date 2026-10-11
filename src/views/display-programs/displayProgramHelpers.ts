import dayjs from 'dayjs'
import { fromApiDate, toApiDate } from '../sales-teams/salesTeamHelpers'
import type {
  CreateDisplayProgramRequest,
  DisplayCriterion,
  DisplayFrequencyMode,
  DisplayProgramDisplayStatus,
  DisplayProgramFields,
  DisplayProgramListItem,
  UpdateDisplayProgramRequest,
} from '@/types/displayProgram.type'

export { fromApiDate, toApiDate }

export const MAX_CRITERIA = 20
export const MAX_CRITERION_LENGTH = 200
export const MAX_PHOTOS = 5
export const MAX_ADD_CUSTOMERS = 500

export type DisplayTagSeverity = 'warn' | 'info' | 'success' | 'secondary'

export function statusSeverity(status: DisplayProgramDisplayStatus): DisplayTagSeverity {
  if (status === 'active') return 'success'
  if (status === 'scheduled') return 'info'
  if (status === 'ended') return 'secondary'
  return 'warn'
}

// ---------------------------------------------------------------------------
// Which parts of a program can still change
// ---------------------------------------------------------------------------

export interface FieldLocks {
  /** Everything is read-only. */
  all: boolean
  principal: boolean
  startDate: boolean
  displayType: boolean
  frequency: boolean
  minPhotos: boolean
  criteria: boolean
  compensation: boolean
  /** An active program's end date can't move into the past. */
  endDateFromToday: boolean
}

/** What a display status locks. A program that doesn't exist yet (create) locks nothing. */
export function fieldLocks(status: DisplayProgramDisplayStatus | undefined): FieldLocks {
  const ended = status === 'ended'
  const active = status === 'active' || ended
  return {
    all: ended,
    principal: status === 'scheduled' || active,
    startDate: active,
    displayType: active,
    frequency: active,
    minPhotos: active,
    criteria: active,
    compensation: active,
    endDateFromToday: status === 'active',
  }
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export type PublishBlocker = 'noCriteria' | 'noPhotos' | 'noParticipants' | 'endInPast'

export interface PublishFacts {
  criteriaCount: number
  photoCount: number
  participantCount: number
  /** `YYYY-MM-DD`; an empty value is checked by the form, not here. */
  endDate: string
}

/** What stops a draft from being published, in the order the API reports it. */
export function publishBlockers(facts: PublishFacts, now: Date = new Date()): PublishBlocker[] {
  const blockers: PublishBlocker[] = []
  if (facts.criteriaCount === 0) blockers.push('noCriteria')
  if (facts.photoCount === 0) blockers.push('noPhotos')
  if (facts.participantCount === 0) blockers.push('noParticipants')
  if (facts.endDate && dayjs(facts.endDate).isBefore(dayjs(now).startOf('day'))) {
    blockers.push('endInPast')
  }
  return blockers
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** "Every visit" or "Min 2× / month", as the translated labels. */
export function frequencyLabel(
  mode: DisplayFrequencyMode,
  minPerMonth: number | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (mode === 'every_visit') return t('displayPrograms.frequency.everyVisit')
  return t('displayPrograms.frequency.minPerMonth', { n: minPerMonth ?? 0 })
}

/**
 * A rent as `Rp 150.000`. An absent rent is "no rent" and returns undefined, which is not the
 * same as a rent of 0.
 */
export function formatRent(rent: string | undefined, locale: string): string | undefined {
  if (rent === undefined || rent === '') return undefined
  const n = Number(rent)
  if (!Number.isFinite(n)) return undefined
  return `Rp ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)}`
}

/** The money field's number for a stored decimal string; null for an absent one. */
export function rentToInput(rent: string | undefined): number | null {
  if (rent === undefined || rent === '') return null
  const n = Number(rent)
  return Number.isFinite(n) ? n : null
}

/** The decimal string the API takes for an entered number; undefined for an empty field. */
export function inputToDecimal(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined
  return String(value)
}

/** `01 Oct – 31 Dec 2026`, or with both years when they differ. */
export function formatPeriod(start: string, end: string, locale: string): string {
  const lang = locale.startsWith('id') ? 'id' : 'en'
  const s = dayjs(start).locale(lang)
  const e = dayjs(end).locale(lang)
  if (s.year() === e.year()) return `${s.format('DD MMM')} – ${e.format('DD MMM YYYY')}`
  return `${s.format('DD MMM YYYY')} – ${e.format('DD MMM YYYY')}`
}

export function formatDate(date: string, locale: string): string {
  return dayjs(date)
    .locale(locale.startsWith('id') ? 'id' : 'en')
    .format('DD MMM YYYY')
}

/** A participant is still in the program on `now` unless its exit date has passed. */
export function isParticipantOpen(exitDate: string | undefined, now: Date = new Date()): boolean {
  return exitDate === undefined || !dayjs(exitDate).isBefore(dayjs(now).startOf('day'))
}

// ---------------------------------------------------------------------------
// Min photos follows the display type until the user sets their own
// ---------------------------------------------------------------------------

/**
 * The min photos to show after the display type changes: the new type's default, unless the
 * user already moved away from the old type's default.
 */
export function minPhotosAfterTypeChange(
  current: number,
  previousTypeDefault: number | undefined,
  nextTypeDefault: number,
): number {
  return previousTypeDefault === undefined || current === previousTypeDefault
    ? nextTypeDefault
    : current
}

// ---------------------------------------------------------------------------
// Criteria
// ---------------------------------------------------------------------------

export type CriterionError = 'required' | 'tooLong' | 'duplicate'

/** One entry per criterion text: why it is invalid, or undefined. */
export function criteriaErrors(texts: string[]): (CriterionError | undefined)[] {
  const seen = new Set<string>()
  return texts.map((raw) => {
    const text = raw.trim()
    if (!text) return 'required'
    if (text.length > MAX_CRITERION_LENGTH) return 'tooLong'
    const key = text.toLowerCase()
    if (seen.has(key)) return 'duplicate'
    seen.add(key)
    return undefined
  })
}

export interface FormCriterion {
  /** A saved criterion's id, or a client-made key. Stable across reorders. */
  key: string
  id?: number
  text: string
}

let keySeq = 0
export function newCriterionKey(): string {
  keySeq += 1
  return `new-${keySeq}`
}

export function fromApiCriterion(c: DisplayCriterion): FormCriterion {
  return { key: `criterion-${c.id}`, id: c.id, text: c.text }
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface FormState {
  code?: string
  branchId?: number
  name: string
  principalOptionId?: number
  displayTypeId: number
  startDate: string
  endDate: string
  notes: string
  frequencyMode: DisplayFrequencyMode
  minPerMonth?: number | null
  minPhotos: number
  rentPerMonth?: number | null
  minComplyPct?: number | null
  criteria: FormCriterion[]
}

function fields(state: FormState): DisplayProgramFields & { minPhotos: number } {
  const notes = state.notes.trim()
  const rent = inputToDecimal(state.rentPerMonth)
  const everyVisit = state.frequencyMode === 'every_visit'
  return {
    name: state.name.trim(),
    // Absent means an internal program.
    ...(state.principalOptionId ? { principalOptionId: state.principalOptionId } : {}),
    displayTypeId: state.displayTypeId,
    startDate: state.startDate,
    endDate: state.endDate,
    ...(notes ? { notes } : {}),
    frequencyMode: state.frequencyMode,
    ...(!everyVisit && state.minPerMonth ? { minPerMonth: state.minPerMonth } : {}),
    minPhotos: state.minPhotos,
    // Rent and the comply percentage are set together or not at all.
    ...(rent !== undefined
      ? {
          rentPerMonth: rent,
          ...(inputToDecimal(state.minComplyPct) !== undefined
            ? { minComplyPct: inputToDecimal(state.minComplyPct) }
            : {}),
        }
      : {}),
    // Array order is the checklist order.
    criteria: state.criteria.map((c) => ({
      ...(c.id !== undefined ? { id: c.id } : {}),
      text: c.text.trim(),
    })),
  }
}

export function buildCreatePayload(state: FormState): CreateDisplayProgramRequest {
  const code = state.code?.trim()
  return {
    ...(code ? { code } : {}),
    branchId: state.branchId as number,
    ...fields(state),
  }
}

export function buildUpdatePayload(state: FormState, version: number): UpdateDisplayProgramRequest {
  return { version, ...fields(state) }
}

// ---------------------------------------------------------------------------
// List rows
// ---------------------------------------------------------------------------

/** The sub-line of a list row: `PDS-0021 · every visit`. */
export function rowSubline(
  row: Pick<DisplayProgramListItem, 'code' | 'frequencyMode' | 'minPerMonth'>,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  return `${row.code} · ${frequencyLabel(row.frequencyMode, row.minPerMonth, t).toLowerCase()}`
}
