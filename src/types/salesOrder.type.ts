import type { UomConversionLevel } from './uomConversionLevel.type'
import type { PinnedUom } from './pinnedUom.type'

export type SalesOrderStatus = 'draft' | 'need_approval' | 'approved' | 'applied'

export interface ManualDiscount {
  id?: number
  discountType: 'flat' | 'percentage'
  value: string
  amount: string
  reason: string
  taxBaseAmount: string
  taxAmount: string
}

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
  taxBaseAmount: string
  taxAmount: string
}

export interface LineBonus {
  promotionId: number
  promotionCode: string
  promotionDescription: string
  bonusProductId: number
  bonusProductCode: string
  bonusProductName: string
  qty: string
  uomGroup?: {
    name: string
    levels: UomConversionLevel[]
  } | null
  pinnedUom?: PinnedUom | null
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
  taxIncluded: boolean
  priceListId: number | null
  priceListCode: string | null
  discount: string
  taxBaseAmount: string
  taxAmount: string
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
  manualDiscounts?: ManualDiscount[]
  headerDiscounts?: LineDiscount[]
  headerBonuses?: LineBonus[]
  id: number
  no: string
  status: SalesOrderStatus
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
  taxBaseAmount: string
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
  taxBaseAmount: string
  taxAmount: string
  priceListId?: number | null
  taxIncluded?: boolean
  discounts?: LineDiscount[]
  bonuses?: LineBonus[]
  manualDiscounts?: ManualDiscount[]
  pinnedUom?: PinnedUom | null
  createdAt: string
  updatedAt: string | null
}

// DTOs
export interface ManualDiscountDto {
  discountType: 'flat' | 'percentage'
  value: string
  reason: string
}

export interface CreateSalesOrderRequest {
  no?: string
  status?: SalesOrderStatus
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
  manualDiscounts?: ManualDiscountDto[]
  createdBy: number
}

export type UpdateSalesOrderRequest = CreateSalesOrderRequest

export interface CreateSalesOrderDetailDto {
  productId: number
  quantity: string // Backend expects string for decimal
  customerChoices?: { promotionId: number; productIds: number[] }[]
  manualDiscounts?: ManualDiscountDto[]
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
  _taxIncluded?: boolean
  _taxBaseAmount?: string
  _taxAmount?: string
  _discounts?: LineDiscount[]
  _bonuses?: LineBonus[]
  _choiceOffers?: ChoiceOffer[]
  _choicePicks?: Record<string, number[]> // promotionId (as string) → chosen productIds
  _manualDiscounts?: ManualDiscount[]
  pinnedUom?: PinnedUom | null
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
