export type SalesOrganization = {
  id: number
  name: string
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
  updatedAt?: string
  updatedBy?: number
  updatedByUser?: {
    email: string
  }
}

export type CreateSalesOrganizationDto = {
  name: string
  createdBy: number
}

export type UpdateSalesOrganizationDto = {
  name?: string
  updatedBy: number
}
