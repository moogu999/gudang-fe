import type { PinnedUom } from './pinnedUom.type'
import type { LineDiscount } from './salesOrder.type'

export type { LineDiscount }

export type DeliveryOrderStatus = 'open' | 'applied' | 'cancelled'

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
  priceListId?: number | null
  discounts?: LineDiscount[]
  uomGroup?: DeliveryOrderUomGroup | null
  pinnedUom?: PinnedUom | null
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
  pinnedUom?: PinnedUom | null
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
  pricingMode?: 'existing' | 'new'
  companyName: string | null
  companyAddress: string | null
  companyTaxId: string | null
  salesmanName: string | null
  invoiceId?: number | null
  invoiceNo?: string | null
  headerDiscounts?: LineDiscount[]
  lines: DeliveryOrderViewLine[]
  bonusLines: DeliveryOrderBonusLine[]
}
