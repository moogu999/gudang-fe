/**
 * PaymentTerm entity
 *
 * Represents a reusable "Term of Payment" master-data entry (e.g. NET 30, NET 45, COD)
 * referenced by Supplier and future PO/AP Invoice modules.
 */
export interface PaymentTerm {
  id: number
  code: string | null
  name: string
  days: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

/**
 * DTO for creating a new PaymentTerm
 */
export interface CreatePaymentTermDto {
  code?: string | null
  name: string
  days?: number | null
  isActive: boolean
}

/**
 * DTO for updating an existing PaymentTerm
 */
export interface UpdatePaymentTermDto {
  code?: string | null
  name?: string
  days?: number | null
  isActive?: boolean
}
