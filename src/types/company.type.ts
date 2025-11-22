export type Company = {
  id: number
  code: string
  name: string
  address?: string
  taxId?: string
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
  updatedAt?: string
  updatedBy?: number
}

export type CreateCompanyDto = {
  code: string
  name: string
  address?: string
  taxId?: string
  createdBy: number
}

export type UpdateCompanyDto = {
  code?: string
  name?: string
  address?: string
  taxId?: string
  updatedBy: number
}
