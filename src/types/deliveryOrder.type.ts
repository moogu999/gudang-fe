export type DeliveryOrderStatus = 'open' | 'cancelled'

export interface DeliveryOrderUomLevel {
  id: number
  levelOrder: number
  uomSymbol: string
  qtyPerParent: number | null
}

export interface DeliveryOrderUomGroup {
  id: number
  name: string
  levels: DeliveryOrderUomLevel[]
}

export interface DeliveryOrderListItem {
  id: number
  no: string
  createdAt: string
  status: DeliveryOrderStatus
  isPartial: boolean
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
  soQuantity: string
  quantity: string
  price: string
  discount: string
  subAmount: string
  taxIncluded: boolean
  uomGroup?: DeliveryOrderUomGroup | null
}

export interface DeliveryOrderBonusLine {
  productId: number
  productCode: string
  productName: string
  promotionId: number
  promotionCode: string
  promotionDescription: string
  quantity: string
  uomGroup?: DeliveryOrderUomGroup | null
}

export interface DeliveryOrderDetail {
  id: number
  no: string
  createdAt: string
  cancelledAt: string | null
  status: DeliveryOrderStatus
  isPartial: boolean
  warehouseId: number
  warehouseName: string
  salesOrderHeaderId: number
  soNo: string
  customerName: string
  deliveryDate: string | null
  remark: string | null
  subtotalAmount: string
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  companyName: string | null
  companyAddress: string | null
  companyTaxId: string | null
  salesmanName: string | null
  lines: DeliveryOrderViewLine[]
  bonusLines: DeliveryOrderBonusLine[]
}
