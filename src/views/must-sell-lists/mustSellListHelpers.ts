import dayjs from 'dayjs'
import { ApiError } from '@/types/api.type'
import type {
  CreateMustSellListRequest,
  MslDisplayStatus,
  MslItemInput,
  MslPreviewRequest,
  MslProductOption,
  MslScopeLevel,
  MslUnit,
  MustSellListItem,
  UpdateMustSellListRequest,
} from '@/types/mustSellList.type'

export type MslTagSeverity = 'secondary' | 'info' | 'success' | 'contrast'

export function statusSeverity(status: MslDisplayStatus): MslTagSeverity {
  if (status === 'active') return 'success'
  if (status === 'scheduled') return 'info'
  if (status === 'ended') return 'contrast'
  return 'secondary'
}

/** The customer-category master a scope level reads its values from. */
export const SCOPE_LEVELS: MslScopeLevel[] = ['outlet_type', 'channel', 'category']

/** i18n key of a level: the customer fields already carry the house wording. */
export function scopeLevelLabelKey(level: MslScopeLevel): string {
  return `mustSellLists.levels.${level}`
}

// ---------------------------------------------------------------------------
// Which parts of a list can still change
// ---------------------------------------------------------------------------

export interface FieldLocks {
  /** Everything is read-only. */
  all: boolean
  principal: boolean
  startDate: boolean
  /** An active list's end date can't move into the past. */
  endDateFromToday: boolean
}

/** What a display status locks. A list that doesn't exist yet (create) locks nothing. */
export function fieldLocks(status: MslDisplayStatus | undefined): FieldLocks {
  return {
    all: status === 'ended',
    principal: status === 'scheduled' || status === 'active' || status === 'ended',
    startDate: status === 'active' || status === 'ended',
    endDateFromToday: status === 'active',
  }
}

// ---------------------------------------------------------------------------
// Quantities: stored in the base unit, entered in the item's suggested unit
// ---------------------------------------------------------------------------

/** An item as the form holds it. `key` is the id of a saved item, or a client-made key. */
export interface FormItem {
  key: string
  id?: number
  productId: number
  code: string
  name: string
  categoryName?: string
  units: MslUnit[]
  /** Suggested unit; null means the base unit. */
  uomId: number | null
  /** In the base unit; undefined means any quantity. */
  minQty?: string
}

/** The unit an item is entered in, or undefined for the base unit. */
export function unitOf(item: Pick<FormItem, 'uomId' | 'units'>): MslUnit | undefined {
  if (item.uomId === null) return undefined
  const unit = item.units.find((u) => u.uomId === item.uomId)
  return unit && !unit.isBase ? unit : undefined
}

function factorOf(unit?: MslUnit): number {
  const factor = unit ? Number(unit.factorToBase) : 1
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/** Rounds to the 4 decimals the API stores. */
function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

/** A base-unit quantity in the unit it is shown in. A missing quantity stays missing. */
export function toDisplay(baseQty: string | undefined, unit?: MslUnit): number | null {
  if (baseQty === undefined || baseQty === '') return null
  const n = Number(baseQty)
  if (!Number.isFinite(n)) return null
  return round4(n / factorOf(unit))
}

/** A displayed quantity as the base-unit string the API takes; `undefined` for an empty cell. */
export function toBase(display: number | null, unit?: MslUnit): string | undefined {
  if (display === null || display === undefined || Number.isNaN(display)) return undefined
  return String(round4(display * factorOf(unit)))
}

/** The name of the unit a quantity is shown in. */
export function unitName(item: Pick<FormItem, 'uomId' | 'units'>): string | undefined {
  const unit = unitOf(item)
  if (unit) return unit.name
  return item.units.find((u) => u.isBase)?.name
}

/** A base-unit quantity formatted in an item's suggested unit, for the overlap panel. */
export function formatMinQty(baseQty: string | undefined, item?: FormItem): string {
  if (baseQty === undefined || baseQty === '') return '—'
  const unit = item ? unitOf(item) : undefined
  const value = toDisplay(baseQty, unit)
  if (value === null) return '—'
  const name = item ? unitName(item) : undefined
  return name ? `${value} ${name}` : String(value)
}

/** A stored min qty is valid when empty or above zero. */
export function isValidMinQty(minQty: string | undefined): boolean {
  if (minQty === undefined || minQty === '') return true
  const n = Number(minQty)
  return Number.isFinite(n) && n > 0
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

let keySeq = 0
export function newItemKey(): string {
  keySeq += 1
  return `new-${keySeq}`
}

export function fromApiItem(item: MustSellListItem): FormItem {
  return {
    key: `item-${item.id}`,
    id: item.id,
    productId: item.productId,
    code: item.code,
    name: item.name,
    categoryName: item.categoryName,
    units: item.units ?? [],
    uomId: item.uomId ?? null,
    minQty: item.minQty,
  }
}

export function fromProductOption(option: MslProductOption): FormItem {
  return {
    key: newItemKey(),
    productId: option.productId,
    code: option.code,
    name: option.name,
    categoryName: option.categoryName,
    units: option.units ?? [],
    uomId: null,
  }
}

/** Items keep their array order, which is the phone order. Empty values are left out. */
export function toItemInputs(items: FormItem[]): MslItemInput[] {
  return items.map((item) => {
    const input: MslItemInput = { productId: item.productId }
    if (item.id !== undefined) input.id = item.id
    if (item.uomId !== null) input.uomId = item.uomId
    if (item.minQty !== undefined && item.minQty !== '') input.minQty = item.minQty
    return input
  })
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface FormState {
  code?: string
  branchId?: number
  name: string
  principalOptionId: number
  startDate: string
  endDate: string
  notes: string
  scopeAll: boolean
  scopeValueIds: number[]
  showInCanvass: boolean
  items: FormItem[]
}

function base(state: FormState) {
  const notes = state.notes.trim()
  return {
    name: state.name.trim(),
    principalOptionId: state.principalOptionId,
    startDate: state.startDate,
    endDate: state.endDate,
    ...(notes ? { notes } : {}),
    scopeAll: state.scopeAll,
    // Mutually exclusive with "all"; the API rejects both and neither.
    scopeValueIds: state.scopeAll ? [] : state.scopeValueIds,
    showInCanvass: state.showInCanvass,
    items: toItemInputs(state.items),
  }
}

export function buildCreatePayload(state: FormState): CreateMustSellListRequest {
  const code = state.code?.trim()
  return {
    ...(code ? { code } : {}),
    branchId: state.branchId as number,
    ...base(state),
  }
}

export function buildUpdatePayload(state: FormState, version: number): UpdateMustSellListRequest {
  return { version, ...base(state) }
}

export function buildPreviewPayload(
  state: FormState,
  level: MslScopeLevel | undefined,
  excludeId?: number,
): MslPreviewRequest {
  return {
    branchId: state.branchId as number,
    ...(excludeId ? { excludeId } : {}),
    principalOptionId: state.principalOptionId || undefined,
    startDate: state.startDate || undefined,
    endDate: state.endDate || undefined,
    ...(level ? { scopeLevel: level } : {}),
    scopeAll: state.scopeAll,
    scopeValueIds: state.scopeAll ? [] : state.scopeValueIds,
    items: state.items.map((i) => ({
      productId: i.productId,
      ...(i.minQty !== undefined && i.minQty !== '' ? { minQty: i.minQty } : {}),
    })),
  }
}

/** A calendar date as the API reads it, never shifted by the browser's timezone. */
export function toApiDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The machine-readable code on an API error, if it has one. */
export function mslErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/**
 * Replaces an API error's message with its translation when the code is a known one,
 * so toasts show the localized text rather than the server's English.
 */
export function translateMslError(
  e: unknown,
  t: (key: string) => string,
  exists: (key: string) => boolean,
): unknown {
  const code = mslErrorCode(e)
  if (!code) return e
  const key = `mustSellLists.errors.${code}`
  return exists(key) ? new Error(t(key)) : e
}

/** Codes the form shows on a field instead of in a toast. */
export function errorField(code: string | undefined): 'code' | undefined {
  if (code === 'MSL_CODE_DUPLICATE' || code === 'MSL_CODE_TOO_LONG') return 'code'
  return undefined
}

/** A number grouped for the active locale. */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

/** `01 Oct – 31 Dec 2026`, or with both years when they differ. */
export function formatPeriod(start: string, end: string, locale: string): string {
  const s = dayjs(start).locale(locale.startsWith('id') ? 'id' : 'en')
  const e = dayjs(end).locale(locale.startsWith('id') ? 'id' : 'en')
  if (s.year() === e.year()) return `${s.format('DD MMM')} – ${e.format('DD MMM YYYY')}`
  return `${s.format('DD MMM YYYY')} – ${e.format('DD MMM YYYY')}`
}
