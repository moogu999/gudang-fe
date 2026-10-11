import type {
  SalesmanTargetItem,
  TargetItemInput,
  TargetLevel,
  TargetLineInput,
  TargetSource,
  TargetUnit,
  UpdateSalesmanTargetRequest,
} from '@/types/salesmanTarget.type'

/** An item as the form holds it. `key` is the id of a saved item, or a client-made key. */
export interface FormItem {
  key: string
  id?: number
  productId?: number
  productCode?: string
  productName?: string
  categoryOptionId?: number
  categoryName?: string
  principalOptionId?: number
  principalName?: string
  /** Null means the base unit. */
  uomId: number | null
  units: TargetUnit[]
  skuCount?: number
  skuSample?: string[]
  /** Keys of other items whose products overlap this one. */
  alsoIn: string[]
}

/** A salesman row as the form holds it. An empty number is `null`; `0` is a real target. */
export interface FormLine {
  key: string
  id?: number
  employeeId: number
  employeeCode?: string
  employeeName: string
  employeeTypeName: string
  employeeActive: boolean
  teamCodes: string[]
  principals: string[]
  isNew: boolean
  targetValue: number | null
  effectiveCall: number | null
  activeOutlet: number | null
  /** Base-unit qty per item key. A missing key is not targeted. */
  cells: Record<string, string>
}

export interface FormTypes {
  hasValue: boolean
  hasQty: boolean
  hasEffectiveCall: boolean
  hasActiveOutlet: boolean
}

export interface ColumnTotals {
  value: number
  effectiveCall: number
  activeOutlet: number
  /** Base-unit qty per item key. */
  qty: Record<string, number>
}

/** Whether a salesman row has anything entered. */
export function lineHasValues(line: FormLine): boolean {
  return (
    line.targetValue !== null ||
    line.effectiveCall !== null ||
    line.activeOutlet !== null ||
    Object.keys(line.cells).length > 0
  )
}

/** The unit an item is entered in, or undefined for the base unit. */
export function unitOf(item: Pick<FormItem, 'uomId' | 'units'>): TargetUnit | undefined {
  if (item.uomId === null) return undefined
  const unit = item.units.find((u) => u.uomId === item.uomId)
  return unit && !unit.isBase ? unit : undefined
}

function factorOf(unit?: TargetUnit): number {
  const factor = unit ? Number(unit.factorToBase) : 1
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/** Rounds to the 4 decimals the API stores. */
function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

/** A base-unit quantity in the unit it is shown in. A missing quantity stays missing. */
export function toDisplay(baseQty: string | undefined, unit?: TargetUnit): number | null {
  if (baseQty === undefined || baseQty === '') return null
  const n = Number(baseQty)
  if (!Number.isFinite(n)) return null
  return round4(n / factorOf(unit))
}

/** A displayed quantity as the base-unit string the API takes; `undefined` for an empty cell. */
export function toBase(display: number | null, unit?: TargetUnit): string | undefined {
  if (display === null || display === undefined || Number.isNaN(display)) return undefined
  return String(round4(display * factorOf(unit)))
}

/** Sums each column; a missing cell counts as nothing, not as zero. */
export function columnTotals(lines: FormLine[], itemKeys: string[]): ColumnTotals {
  const totals: ColumnTotals = { value: 0, effectiveCall: 0, activeOutlet: 0, qty: {} }
  for (const key of itemKeys) totals.qty[key] = 0
  for (const line of lines) {
    totals.value += line.targetValue ?? 0
    totals.effectiveCall += line.effectiveCall ?? 0
    totals.activeOutlet += line.activeOutlet ?? 0
    for (const key of itemKeys) {
      const cell = line.cells[key]
      if (cell !== undefined) totals.qty[key] += Number(cell)
    }
  }
  return totals
}

/**
 * How far the allocation is from the principal's target. Negative `amount` is short of it.
 * Null when there is no target to compare with.
 */
export function principalGap(
  totalValue: number,
  principalTarget: number | null | undefined,
): { amount: number; pct: number } | null {
  if (principalTarget === null || principalTarget === undefined || principalTarget <= 0) return null
  const amount = totalValue - principalTarget
  return { amount, pct: (amount / principalTarget) * 100 }
}

/** Divides a total into whole Rupiah shares; the remainder goes to the last one. */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return []
  const share = Math.floor(total / n)
  const shares = new Array<number>(n).fill(share)
  shares[n - 1] += total - share * n
  return shares
}

/** Parses one pasted number in either `id-ID` or `en-US` notation; null when it isn't one. */
export function parseNumber(raw: string): number | null {
  const text = raw.replace(/\s+/g, '').replace(/^rp\.?/i, '')
  if (!/^-?[\d.,]+$/.test(text)) return null
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  if (!body || !/\d/.test(body)) return null

  const dots = body.split('.').length - 1
  const commas = body.split(',').length - 1
  let normalized: string

  if (dots > 0 && commas > 0) {
    // Both present: whichever comes last is the decimal separator.
    const decimalSep = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ','
    const thousandsSep = decimalSep === '.' ? ',' : '.'
    normalized = body.split(thousandsSep).join('').replace(decimalSep, '.')
  } else if (dots > 0 || commas > 0) {
    const sep = dots > 0 ? '.' : ','
    const count = dots > 0 ? dots : commas
    const parts = body.split(sep)
    const last = parts[parts.length - 1]
    // One separator followed by 1-2 digits is a decimal point; anything else groups thousands.
    if (count === 1 && last.length >= 1 && last.length <= 2) normalized = parts.join('.')
    else if (parts.slice(1).every((p) => p.length === 3)) normalized = parts.join('')
    else return null
  } else {
    normalized = body
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

/**
 * Parses clipboard text from a spreadsheet into rows of numbers.
 * An empty cell is `null`; a negative or non-numeric one is `'invalid'`.
 */
export function parseTsv(text: string): (number | null | 'invalid')[][] {
  const trimmed = text.replace(/(\r?\n)+$/, '')
  if (trimmed === '') return []
  return trimmed.split(/\r?\n/).map((row) =>
    row.split('\t').map((cell) => {
      if (cell.trim() === '') return null
      const n = parseNumber(cell)
      return n === null || n < 0 ? 'invalid' : n
    }),
  )
}

/** A key for an item that isn't saved yet. Never all digits, so it can't collide with an item id. */
export function newItemKey(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `k-${random}`
}

/** Builds the form item for a saved item. */
export function fromApiItem(item: SalesmanTargetItem, allItems: SalesmanTargetItem[]): FormItem {
  return {
    key: String(item.id),
    id: item.id,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    categoryOptionId: item.categoryOptionId,
    categoryName: item.categoryName,
    principalOptionId: item.principalOptionId,
    principalName: item.principalName,
    uomId: item.uomId ?? null,
    units: item.units ?? [],
    skuCount: item.skuCount,
    alsoIn: (item.alsoIn ?? []).filter((id) => allItems.some((i) => i.id === id)).map(String),
  }
}

/** A display name for an item: a product's name, or a category's name with its principal. */
export function itemLabel(item: Pick<FormItem, 'productName' | 'categoryName' | 'principalName'>) {
  return item.productName ?? item.categoryName ?? ''
}

/** The request body for a save: switched-off types are stripped and form keys mapped. */
export function buildPayload(
  version: number,
  types: FormTypes,
  principalTargetValue: number | null,
  notes: string,
  items: FormItem[],
  lines: FormLine[],
  source: TargetSource,
  level: TargetLevel,
): UpdateSalesmanTargetRequest {
  const keptItems = types.hasQty ? items : []
  const itemInputs: TargetItemInput[] = keptItems.map((i) => ({
    id: i.id,
    key: i.id === undefined ? i.key : undefined,
    productId: level === 'product' ? i.productId : undefined,
    categoryOptionId: level === 'category' ? i.categoryOptionId : undefined,
    principalOptionId:
      source === 'internal' && level === 'category' ? i.principalOptionId : undefined,
    uomId: i.uomId,
  }))

  const lineInputs: TargetLineInput[] = lines.map((l) => {
    const cells: Record<string, string> = {}
    for (const item of keptItems) {
      const cell = l.cells[item.key]
      if (cell !== undefined) cells[item.key] = cell
    }
    return {
      employeeId: l.employeeId,
      targetValue: types.hasValue && l.targetValue !== null ? String(l.targetValue) : null,
      effectiveCall: types.hasEffectiveCall ? l.effectiveCall : null,
      activeOutlet: types.hasActiveOutlet ? l.activeOutlet : null,
      cells,
    }
  })

  return {
    version,
    ...types,
    principalTargetValue:
      source === 'principal' && principalTargetValue !== null ? String(principalTargetValue) : null,
    notes: notes.trim() === '' ? null : notes.trim(),
    items: itemInputs,
    lines: lineInputs,
  }
}
