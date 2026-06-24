/**
 * Customer Label Definition entity
 *
 * Company-scoped label name with a predefined set of allowed values.
 * Example: "Size" with options S/M/L.
 */
export interface CustomerLabelDefinition {
  id: number
  name: string
  createdAt: string
  updatedAt?: string
  createdBy?: number
}

/**
 * Customer Label Option entity
 *
 * An allowed value for a customer label definition.
 */
export interface CustomerLabelOption {
  id: number
  customerLabelDefinitionId: number
  value: string
  createdAt: string
  updatedAt?: string
  createdBy?: number
}

export interface CreateCustomerLabelDefinitionDto {
  name: string
  createdBy: number
}

export interface UpdateCustomerLabelDefinitionDto {
  name?: string
  updatedBy: number
}

export interface CreateCustomerLabelOptionDto {
  customerLabelDefinitionId: number
  value: string
  createdBy: number
}

export interface UpdateCustomerLabelOptionDto {
  value?: string
  updatedBy: number
}
