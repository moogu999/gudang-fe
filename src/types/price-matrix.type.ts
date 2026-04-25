export type CriteriaType = {
  id: number
  code: 'company' | 'branch' | 'sales_organization' | string
  label: string
  sourceTable: string
}

export type PriceMatrixCriterion = {
  criteriaTypeId: number
  code?: string
  label?: string
  position: number
}

export type PriceMatrixRuleValue = {
  criteriaTypeId: number
  valueId: number | null
  valueLabel?: string
}

export type PriceMatrixRule = {
  id?: number
  priceListId: number
  priceListCode?: string
  values: PriceMatrixRuleValue[]
}

export type PriceMatrix = {
  id: number
  code: string
  description: string | null
  criteria: PriceMatrixCriterion[]
  rules: PriceMatrixRule[]
  createdAt: string
  updatedAt: string | null
}

export type PriceMatrixSummary = Pick<PriceMatrix, 'id' | 'code' | 'description' | 'createdAt'>

export type CreatePriceMatrixDto = {
  code: string
  description?: string | null
  criteria: { criteriaTypeId: number; position: number }[]
  rules: {
    priceListId: number
    values: { criteriaTypeId: number; valueId: number | null }[]
  }[]
}

export type UpdatePriceMatrixDto = CreatePriceMatrixDto

export interface PriceMatrixPriorityItem {
  id: number
  priority: number
  code: string
  description: string | null
}
