/**
 * Payment Method master data — the fixed-choice dropdown behind an AP Payment's
 * Transfer Bank / Cash toggle. Modelled on CorrectionCategory, mirroring
 * `gudang-be/internal/pkg/genericcrud/schema/payment_method.go`.
 *
 * The server branches validation on `code` (TRANSFER / CASH), never on the id
 * or the name — an operator-added row degrades to no extra requirement.
 */
export interface PaymentMethod {
  id: number
  code: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentMethodDto {
  code: string
  name: string
  isActive: boolean
}

export interface UpdatePaymentMethodDto {
  name?: string
  isActive?: boolean
}
