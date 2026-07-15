export interface SalesOrderType {
  id: number
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  createdBy: number
  createdByUser: { email: string }
  updatedAt: string | null
  updatedBy: number | null
  updatedByUser: { email: string } | null
}

export interface CreateSalesOrderTypeDto {
  code: string
  name: string
  description?: string | null
  isActive: boolean
  createdBy: number
}

export interface UpdateSalesOrderTypeDto {
  code: string
  name: string
  description?: string | null
  isActive: boolean
  updatedBy: number
}

export const SALES_ORDER_TYPE_CODE_SALES = 'sales'
export const SALES_ORDER_TYPE_CODE_RETURN = 'return'
