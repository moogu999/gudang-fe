export interface BookableSalesOrder {
  id: number
  no: string
  totalAmount: string
  deliveryDate: string | null
  createdAt: string
  booked: boolean
  deliveryOrderId: number | null
  deliveryOrderNo: string | null
  customerName: string
  salesmanCode: string | null
  salesmanName: string | null
}

export type FulfillmentStatus = 'full' | 'partial' | 'none'

export interface FulfillmentItem {
  productId: number
  productCode: string
  productName: string
  required: string
  available: string
}

export interface BonusFulfillmentItem {
  productId: number
  productCode: string
  productName: string
  promotionId: number
  promotionCode: string
  required: string
  available: string
}

export interface SalesOrderFulfillment {
  salesOrderId: number
  status: FulfillmentStatus
  items: FulfillmentItem[]
  bonusItems: BonusFulfillmentItem[]
}

export interface CreateBookingOrderResult {
  salesOrderId: number
  deliveryOrderId: number
  no: string
}
