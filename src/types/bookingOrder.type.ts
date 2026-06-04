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
  required: string
  available: string
}

export interface SalesOrderFulfillment {
  salesOrderId: number
  status: FulfillmentStatus
  items: FulfillmentItem[]
}

export interface CreateBookingOrderResult {
  salesOrderId: number
  deliveryOrderId: number
  no: string
}
