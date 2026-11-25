import type { ToastMessageOptions } from 'primevue'
import ToastLife from '@/constants/toastLife'
import { commonErrorToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import { toQty } from '@/utils/canvassHelpers'
import { translateCustomerBranchError } from '@/utils/customerBranchErrors'

/** API error codes of the canvass modules that have a localized message, by locale key. */
const ERRORS: Record<string, string> = {
  CANVASS_LOADING_VAN_WAREHOUSE_MISSING: 'vanWarehouseMissing',
  CANVASS_LOADING_INSUFFICIENT_STOCK: 'insufficientStock',
  CANVASS_LOADING_DUPLICATE_DAY: 'duplicateDay',
  CANVASS_LOADING_DUPLICATE_NO: 'duplicateNo',
  CANVASS_LOADING_NOT_EDITABLE: 'notEditable',
  CANVASS_LOADING_HEADER_LOCKED: 'headerLocked',
  CANVASS_LOADING_NOT_SENDABLE: 'notSendable',
  CANVASS_LOADING_NOT_CANCELLABLE: 'notCancellable',
  CANVASS_LOADING_STALE_REVISION: 'staleRevision',
  CANVASS_LOADING_SOURCE_BRANCH: 'sourceBranch',
  CANVASS_LOADING_NO_LINES: 'noLines',
  CANVASS_UNLOADING_EXCEEDS_VAN_STOCK: 'exceedsVanStock',
  CANVASS_UNLOADING_NOT_DRAFT: 'unloadingNotDraft',
  CANVASS_UNLOADING_DUPLICATE_NO: 'duplicateNo',
  CANVASS_UNLOADING_DESTINATION_BRANCH: 'destinationBranch',
  CANVASS_UNLOADING_NO_LINES: 'unloadingNoLines',
}

/** The codes this module translates, for keeping the locale files complete. */
export const CANVASS_ERROR_CODES = Object.keys(ERRORS)

/** The i18n key of a code's message, or undefined for a code this module doesn't know. */
export function canvassErrorKey(code: string | undefined): string | undefined {
  const key = code ? ERRORS[code] : undefined
  return key ? `canvass.errors.${key}` : undefined
}

type Translate = (key: string, params?: Record<string, unknown>) => string

interface ItemDetail {
  code?: string
  name?: string
  productId?: number
  stockType?: string
  requested?: string
  available?: string
  returned?: string
  onHand?: string
}

/** Codes whose `details` list the offending products, and the locale key of one line each. */
const ITEM_LINES: Record<string, string> = {
  CANVASS_LOADING_INSUFFICIENT_STOCK: 'canvass.errors.shortageLine',
  CANVASS_UNLOADING_EXCEEDS_VAN_STOCK: 'canvass.errors.excessLine',
}

const MAX_ITEMS = 5

function itemLine(item: ItemDetail, key: string, t: Translate): string {
  return t(key, {
    product: [item.code, item.name].filter(Boolean).join(' ') || `#${item.productId ?? '?'}`,
    stockType: item.stockType ? t(`canvassUnloadings.stockTypes.${item.stockType}`) : '',
    requested: formatQty(item.requested),
    available: formatQty(item.available),
    returned: formatQty(item.returned),
    onHand: formatQty(item.onHand),
  })
}

function formatQty(value?: string): string {
  return toQty(value).toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/**
 * The per-product lines of an error that carries them, capped so a long list
 * stays readable ("… and 3 more"). Empty when the error has none.
 */
export function canvassErrorItemLines(e: unknown, t: Translate): string[] {
  if (!(e instanceof ApiError) || !e.code) return []
  const key = ITEM_LINES[e.code]
  const items = e.details?.items
  if (!key || !Array.isArray(items)) return []
  const lines = (items as ItemDetail[]).slice(0, MAX_ITEMS).map((i) => itemLine(i, key, t))
  if (items.length > MAX_ITEMS) {
    lines.push(t('canvass.errors.andMore', { n: items.length - MAX_ITEMS }))
  }
  return lines
}

/**
 * Swaps an API error's message for its translation when the code is a known one,
 * appending the offending products when the server named them.
 */
export function translateCanvassError(e: unknown, t: Translate): unknown {
  const key = canvassErrorKey(e instanceof ApiError ? e.code : undefined)
  if (!key) return translateCustomerBranchError(e, t)
  return new Error([t(key), ...canvassErrorItemLines(e, t)].join('\n'))
}

/**
 * Error toast for the canvass modules: translated, line breaks kept for the
 * per-product list, and on screen long enough to read it.
 */
export function canvassErrorToast(e: unknown, t: Translate, group: string): ToastMessageOptions {
  const translated = translateCanvassError(e, t)
  const multiLine = translated instanceof Error && translated.message.includes('\n')
  return {
    ...commonErrorToast(translated, group, multiLine ? ToastLife.FIVE_SECONDS : undefined),
    styleClass: 'whitespace-pre-line',
  }
}
