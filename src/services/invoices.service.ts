import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { InvoiceListItem, InvoiceDetail } from '@/types/invoice.type'
import { API_ENDPOINTS } from '@/constants/api'

export class InvoicesService {
  static async list(queryString?: string): Promise<Base<InvoiceListItem>> {
    const url = queryString ? `${API_ENDPOINTS.INVOICES}?${queryString}` : API_ENDPOINTS.INVOICES
    return ApiService.get<Base<InvoiceListItem>>(url)
  }

  static async get(id: number): Promise<InvoiceDetail> {
    return ApiService.get<InvoiceDetail>(API_ENDPOINTS.INVOICE_BY_ID(id))
  }
}
