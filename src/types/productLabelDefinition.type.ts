export type ProductLabelSystemKey = 'principal' | 'category'

/**
 * Product Label Definition entity
 *
 * Company-scoped label name with a predefined set of allowed values.
 * Example: "Size" with options S/M/L.
 */
export interface ProductLabelDefinition {
  id: number
  name: string
  /**
   * Set on the definitions the application relies on. Their name is locked;
   * their options stay editable.
   */
  systemKey?: ProductLabelSystemKey | null
  createdAt: string
  updatedAt?: string
  createdBy?: number
}

/**
 * Product Label Option entity
 *
 * An allowed value for a product label definition.
 */
export interface ProductLabelOption {
  id: number
  productLabelDefinitionId: number
  value: string
  createdAt: string
  updatedAt?: string
  createdBy?: number
}

export interface CreateProductLabelDefinitionDto {
  name: string
  createdBy: number
}

export interface UpdateProductLabelDefinitionDto {
  name?: string
  updatedBy: number
}

export interface CreateProductLabelOptionDto {
  productLabelDefinitionId: number
  value: string
  createdBy: number
}

export interface UpdateProductLabelOptionDto {
  value?: string
  updatedBy: number
}
