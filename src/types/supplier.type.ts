/**
 * PaymentTermRef is a minimal payment term reference for display purposes.
 */
export interface PaymentTermRef {
  id: number
  name: string
}

/**
 * Supplier entity
 *
 * Represents a supplier/principal master-data record, scoped to the fields
 * consumed by future PO, PO Receipt, AP Invoice, CN/DN, and AP Payment flows.
 */
export interface Supplier {
  id: number
  code: string
  name: string
  npwp: string
  address: string
  picName: string
  picPhone: string
  paymentTermId: number
  paymentTerm?: PaymentTermRef
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountHolderName: string | null
  isActive: boolean
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

/**
 * DTO for creating a new Supplier
 */
export interface CreateSupplierDto {
  code?: string
  name: string
  npwp: string
  address: string
  picName: string
  picPhone: string
  paymentTermId: number
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolderName?: string
  isActive?: boolean
}

/**
 * DTO for updating an existing Supplier
 */
export interface UpdateSupplierDto {
  code?: string
  name: string
  npwp: string
  address: string
  picName: string
  picPhone: string
  paymentTermId: number
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolderName?: string
  isActive?: boolean
}
