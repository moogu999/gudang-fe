import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { InvoiceListItem, InvoiceDetail } from '@/types/invoice.type'
import { API_ENDPOINTS } from '@/constants/api'

export class InvoicesService {
  static async list(queryString?: string): Promise<Base<InvoiceListItem>> {
    const url = queryString ? `${API_ENDPOINTS.INVOICES}?${queryString}` : API_ENDPOINTS.INVOICES
    return ApiService.get<Base<InvoiceListItem>>(url)
  }

  /**
   * List applied invoices for a customer, for use as the source of a
   * return-from-invoice sales order.
   */
  static async listAppliedForCustomer(
    customerId: number,
    queryString?: string,
  ): Promise<Base<InvoiceListItem>> {
    const params = new URLSearchParams(queryString)
    params.set('customerId', String(customerId))
    params.set('status', 'applied')
    return ApiService.get<Base<InvoiceListItem>>(`${API_ENDPOINTS.INVOICES}?${params.toString()}`)
  }

  static async get(id: number): Promise<InvoiceDetail> {
    return ApiService.get<InvoiceDetail>(API_ENDPOINTS.INVOICE_BY_ID(id))
  }
}
