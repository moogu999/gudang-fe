/**
 * Reason codes: the admin-managed answers a salesman picks in N-Force, in six
 * fixed types. Mirrors `gudang-be/internal/reason`.
 */
export type ReasonType =
  | 'customer_no_order'
  | 'outside_radius'
  | 'skipped_visit'
  | 'return'
  | 'order_cancellation'
  | 'msl_not_sold'

/** Tab order. The prefix is display-only; the number series owns the real one. */
export const REASON_TYPES: { key: ReasonType; prefix: string }[] = [
  { key: 'customer_no_order', prefix: 'OTO' },
  { key: 'outside_radius', prefix: 'RAD' },
  { key: 'skipped_visit', prefix: 'SKP' },
  { key: 'return', prefix: 'RTR' },
  { key: 'order_cancellation', prefix: 'BTL' },
  { key: 'msl_not_sold', prefix: 'MSL' },
]

export type ReasonStockType = 'good' | 'bad'

export type ReasonSellingMode = 'taking_order' | 'canvass'

export interface Reason {
  id: number
  code: string
  type: ReasonType
  name: string
  forTakingOrder: boolean
  forCanvass: boolean
  requiresPhoto: boolean
  requiresNote: boolean
  /** Omitted by the API (not `null`) for every type but `return`. */
  defaultStockType?: ReasonStockType
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
  updatedByName?: string
}

export interface ReasonListQuery {
  type?: ReasonType
  isActive?: boolean
  sellingMode?: ReasonSellingMode
  search?: string
}

export interface ReasonCreatePayload {
  /** Blank or absent generates the code from the type's number series. */
  code?: string
  type: ReasonType
  name: string
  forTakingOrder: boolean
  forCanvass: boolean
  requiresPhoto: boolean
  requiresNote: boolean
  defaultStockType?: ReasonStockType
}

export type ReasonUpdatePayload = Omit<ReasonCreatePayload, 'code' | 'type'> & {
  isActive: boolean
}
