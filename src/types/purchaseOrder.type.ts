import type { PinnedUom } from './pinnedUom.type'
import type { ProductLiteWithUom } from './salesOrder.type'
import type { PaymentTermRef } from './supplier.type'

export type PurchaseOrderStatus = 'draft' | 'need_approval' | 'approved' | 'applied'

export interface ManualDiscount {
  discountType: 'flat' | 'percentage'
  value: string
  amount: string
  reason: string
  taxBaseAmount: string
  taxAmount: string
}

export interface ManualDiscountDto {
  discountType: 'flat' | 'percentage'
  value: string
  reason: string
}

// Lite supplier reference nested on the purchase order header (gen/v1 endpoint only —
// code + name, not the full Supplier record).
export interface SupplierLite {
  id: number
  code: string
  name: string
}

// Purchase Order Header Entity
export interface PurchaseOrderHeader {
  id: number
  no: string
  supplierId: number
  supplier?: SupplierLite
  paymentTermId: number
  paymentTerm?: PaymentTermRef
  branchId: number
  orderDate: string // ISO date
  expectedDeliveryDate?: string | null
  reference?: string | null
  remark?: string | null
  status: PurchaseOrderStatus
  subtotalAmount: string
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  createdBy?: number | null
  createdAt: string
  updatedAt?: string | null
}

// Purchase Order Detail Entity
export interface PurchaseOrderDetail {
  id: number
  purchaseOrderHeaderId: number
  productId: number
  product?: ProductLiteWithUom
  quantity: string // Decimal as string from backend
  price: string
  discount: string
  subAmount: string
  taxBaseAmount: string
  taxAmount: string
  manualDiscounts?: ManualDiscount[]
  pinnedUom?: PinnedUom | null
  createdAt: string
  updatedAt?: string | null
}

// DTOs
export interface CreatePurchaseOrderDetailDto {
  productId: number
  quantity: string // Backend expects string for decimal
  price: string
  manualDiscounts?: ManualDiscountDto[]
}

export interface CreatePurchaseOrderRequest {
  no?: string
  supplierId: number
  paymentTermId: number
  branchId?: number | null
  orderDate: string // ISO date
  expectedDeliveryDate?: string | null
  reference?: string | null
  remark?: string | null
  status: 'draft' | 'approved'
  details: CreatePurchaseOrderDetailDto[]
}

export type UpdatePurchaseOrderRequest = CreatePurchaseOrderRequest

// Local state for inline editing
export interface PurchaseOrderDetailRow {
  _localId: string // Temp ID for tracking new/existing rows in the table
  _isPlaceholder?: boolean
  productId?: number
  product?: ProductLiteWithUom
  quantity?: number
  _quantityTiers?: number[] // Tier breakdown (frontend-only, not sent to API)
  price?: number // editable — unlike Sales Order, there is no backend resolve
  discount?: number // derived from _manualDiscounts
  subAmount?: number // Computed field
  _manualDiscounts?: ManualDiscount[]
  _taxBaseAmount?: string
  _taxAmount?: string
  pinnedUom?: PinnedUom | null
  // Allow dynamic internal-only fields (e.g. _quantityTiersRaw for tier input tracking)
  [key: string]: unknown
}
