/**
 * Correction Category master data — the axis a Credit/Debit Note's correction is
 * reported on (e.g. price, quantity, VAT billing error). Modelled on PaymentTerm.
 */
export interface CorrectionCategory {
  id: number
  code: string | null
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateCorrectionCategoryDto {
  code?: string | null
  name: string
  isActive: boolean
}

export interface UpdateCorrectionCategoryDto {
  code?: string | null
  name?: string
  isActive?: boolean
}
