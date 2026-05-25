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

// Resolve contract types
export interface LineDiscount {
  promotionId: number
  promotionCode: string
  promotionDescription: string
  discountType: string
  value: string
  amount: string
}

export interface LineBonus {
  promotionId: number
  promotionCode: string
  promotionDescription: string
  bonusProductId: number
  bonusProductCode: string
  bonusProductName: string
  qty: string
}

export interface ChoicePoolItem {
  productId: number
  productCode: string
  productName: string
  bonusAmount: string
}

export interface ChoiceOffer {
  promotionId: number
  promotionCode: string
  promotionDescription: string
  pickableCount: number
  pool: ChoicePoolItem[]
}

export interface ResolvedLine {
  productId: number
  price: string
  priceListId: number | null
  priceListCode: string | null
  discount: string
  discounts: LineDiscount[]
  bonuses: LineBonus[]
  choiceOffers: ChoiceOffer[]
}

export interface ResolveSalesOrderRequest {
  customerId: number
  employeeId: number
  orderDate: string
  priceDate?: string | null
  details: { productId: number; quantity: string }[]
}

export interface ResolveSalesOrderResponse {
  details: ResolvedLine[]
  headerDiscountAmount: string
  headerDiscounts: LineDiscount[]
  headerBonuses: LineBonus[]
  headerChoiceOffers: ChoiceOffer[]
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
  employeeId: number | null
  branchId: number | null
  salesOrganizationId: number | null
  companyId: number | null
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
  priceListId?: number | null
  discounts?: LineDiscount[]
  bonuses?: LineBonus[]
  createdAt: string
  updatedAt: string | null
}

// DTOs
export interface CreateSalesOrderRequest {
  no?: string
  orderDate: string // ISO date
  priceDate?: string | null
  deliveryDate?: string | null
  expiredDate?: string | null
  customerId: number
  employeeId: number
  remark?: string | null
  downPaymentAmount?: string // Backend expects string for decimal
  isCash?: boolean
  details: CreateSalesOrderDetailDto[]
  headerCustomerChoices?: { promotionId: number; productIds: number[] }[]
  createdBy: number
}

export interface CreateSalesOrderDetailDto {
  productId: number
  quantity: string // Backend expects string for decimal
  customerChoices?: { promotionId: number; productIds: number[] }[]
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
  // Resolution fields (read-only, set by backend resolve)
  _priceListId?: number | null
  _priceListCode?: string | null
  _discounts?: LineDiscount[]
  _bonuses?: LineBonus[]
  _choiceOffers?: ChoiceOffer[]
  _choicePicks?: Record<string, number[]> // promotionId (as string) → chosen productIds
  // Allow dynamic internal-only fields (e.g. _quantityTiersRaw for tier input tracking)
  [key: string]: unknown
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
