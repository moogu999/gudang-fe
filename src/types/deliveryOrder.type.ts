export type DeliveryOrderStatus = 'open' | 'cancelled'

export interface DeliveryOrderListItem {
  id: number
  no: string
  createdAt: string
  status: DeliveryOrderStatus
  warehouseId: number
  warehouseName: string
  salesOrderHeaderId: number
  soNo: string
  customerName: string
  deliveryDate: string | null
}

export interface DeliveryOrderViewLine {
  productId: number
  productCode: string
  productName: string
  quantity: string
  price: string
  discount: string
  subAmount: string
  taxIncluded: boolean
}

export interface DeliveryOrderDetail {
  id: number
  no: string
  createdAt: string
  cancelledAt: string | null
  status: DeliveryOrderStatus
  warehouseId: number
  warehouseName: string
  salesOrderHeaderId: number
  soNo: string
  customerName: string
  deliveryDate: string | null
  remark: string | null
  subtotalAmount: string
  discountAmount: string
  dppAmount: string
  taxAmount: string
  totalAmount: string
  companyName: string | null
  companyAddress: string | null
  companyTaxId: string | null
  salesmanName: string | null
  lines: DeliveryOrderViewLine[]
}
