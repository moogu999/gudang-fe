import type { PinnedUom } from './pinnedUom.type'

export type InvoiceStatus = 'draft' | 'applied' | 'cancelled'

export interface InvoiceDiscountItem {
  source: 'promotion' | 'manual'
  promotionId?: number | null
  promotionCode?: string | null
  discountType: string
  value: string
  amount: string
  reason?: string | null
  taxBaseAmount: string
  taxAmount: string
}

export interface InvoiceListItem {
  id: number
  no: string
  status: InvoiceStatus
  deliveryOrderId: number
  deliveryOrderNo: string
  salesOrderHeaderId: number
  soNo: string
  customerName?: string
  totalAmount: string
  createdAt: string
}

export interface InvoiceDetailLine {
  id: number
  productId: number
  productCode: string
  productName: string
  quantity: string
  price: string
  discount: string
  subAmount: string
  taxBaseAmount: string
  taxAmount: string
  isBonus: boolean
  discounts: InvoiceDiscountItem[]
  pinnedUom?: PinnedUom | null
}

export interface InvoiceDetail extends InvoiceListItem {
  subtotalAmount: string
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  headerDiscounts: InvoiceDiscountItem[]
  lines: InvoiceDetailLine[]
}
