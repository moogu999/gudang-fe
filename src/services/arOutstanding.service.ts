import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { ArOpenItem, ArUnappliedCashItem } from '@/types/arClearing.type'
import { API_ENDPOINTS } from '@/constants/api'

interface CustomerParams {
  customerId: number
  /** Required when the user holds more than one branch. */
  branchId?: number
  page?: number
  limit?: number
}

/** Page size used when draining an customer's full pool — well above any realistic customer balance. */
const ALL_PAGE_SIZE = 200

function toQuery(params: CustomerParams, extra?: Record<string, string>): string {
  const qs = new URLSearchParams({ customerId: String(params.customerId), ...extra })
  if (params.branchId) qs.set('branchId', String(params.branchId))
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  return qs.toString()
}

/**
 * Read-only service over the AR ledger views: `ar_open_items` (outstanding invoices, oldest
 * first) and `ar_unapplied_cash` (poolable cash lines, oldest first). Both take bespoke query
 * parameters rather than GenericQueryBuilder triples, like `ApOutstandingService`.
 */
export class ArOutstandingService {
  /** One page of an customer's outstanding (unsettled) invoices. */
  static async openItems(params: CustomerParams): Promise<Base<ArOpenItem>> {
    return ApiService.get<Base<ArOpenItem>>(
      `${API_ENDPOINTS.AR_OUTSTANDING}?${toQuery(params, { excludeSettled: 'true' })}`,
    )
  }

  /** One page of an customer's poolable unapplied cash. */
  static async unappliedCash(params: CustomerParams): Promise<Base<ArUnappliedCashItem>> {
    return ApiService.get<Base<ArUnappliedCashItem>>(
      `${API_ENDPOINTS.AR_UNAPPLIED_CASH}?${toQuery(params)}`,
    )
  }

  /**
   * Every outstanding invoice of the customer. Auto-allocate is FIFO across the whole balance, so
   * the form needs all of it, not one page.
   */
  static async allOpenItems(params: Omit<CustomerParams, 'page' | 'limit'>): Promise<ArOpenItem[]> {
    return drain((page) => this.openItems({ ...params, page, limit: ALL_PAGE_SIZE }))
  }

  /** Every poolable cash line of the customer, oldest first (the order the server draws on them). */
  static async allUnappliedCash(
    params: Omit<CustomerParams, 'page' | 'limit'>,
  ): Promise<ArUnappliedCashItem[]> {
    return drain((page) => this.unappliedCash({ ...params, page, limit: ALL_PAGE_SIZE }))
  }
}

async function drain<T>(fetchPage: (page: number) => Promise<Base<T>>): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; ; page++) {
    const res = await fetchPage(page)
    // Go omits an empty slice as an absent key, so `data` can be undefined on an empty page.
    const rows = res.data ?? []
    all.push(...rows)
    if (rows.length === 0 || all.length >= res.meta.total) return all
  }
}
