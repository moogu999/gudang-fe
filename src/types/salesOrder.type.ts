import type { UomConversionLevel } from './uomConversionLevel.type'

// Lightweight product type that includes UOM conversion levels (returned by sales order detail API)
export interface ProductLiteWithUom {
  code: string
  name: string
  uomGroupId?: number | null
  uomGroup?: {
    name: string
    levels: UomConversionLevel[]
  }
}

// Sales Order Header Entity
export interface SalesOrderHeader {
  id: number
  no: string
  orderDate: string // ISO date
  priceDate: string | null
  deliveryDate: string | null
  expiredDate: string | null
  customerId: number
  customer?: CustomerLite
  remark: string | null
  downPaymentAmount: string
  remainingAmount: string
  isPaid: boolean
  isCash: boolean
  creditLimitApproval: boolean
  subtotalAmount: string
  discountAmount: string
  dppAmount: string
  taxAmount: string
  totalAmount: string
  createdBy: number | null
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
}

// Sales Order Detail Entity
export interface SalesOrderDetail {
  id: number
  salesOrderHeaderId: number
  productId: number
  product?: ProductLiteWithUom
  quantity: string // Decimal as string from backend
  price: string
  subAmount: string
  discount: string
  createdAt: string
  updatedAt: string | null
}

// DTOs
export interface CreateSalesOrderRequest {
  no: string
  orderDate: string // ISO date
  priceDate?: string | null
  deliveryDate?: string | null
  expiredDate?: string | null
  customerId: number
  remark?: string | null
  downPaymentAmount?: string // Backend expects string for decimal
  isCash?: boolean
  discountAmount?: string // Backend expects string for decimal
  taxAmount?: string // Backend expects string for decimal
  details: CreateSalesOrderDetailDto[]
  createdBy: number
}

export interface CreateSalesOrderDetailDto {
  productId: number
  quantity: string // Backend expects string for decimal
  price: string // Backend expects string for decimal
  discount?: string // Backend expects string for decimal
}

// Local state for inline editing
export interface SalesOrderDetailRow {
  _localId: string // Temp ID for tracking new rows
  productId?: number
  product?: ProductLiteWithUom
  quantity?: number
  _quantityTiers?: number[] // Tier breakdown (frontend-only, not sent to API)
  price?: number
  discount?: number
  subAmount?: number // Computed field
}

// Lite types for foreign keys
export interface CustomerLite {
  id: number
  name: string
  code?: string
}

export interface ProductLite {
  id: number
  code: string
  name: string
}
