import type { CurrencyLite } from './currency.type'

export type Company = {
  id: number
  code: string
  name: string
  address?: string
  taxId?: string
  currencyId: number
  currency: CurrencyLite
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
  currencyId: number
  createdBy: number
}

export type UpdateCompanyDto = {
  code?: string
  name?: string
  address?: string
  taxId?: string
  currencyId?: number
  updatedBy: number
}
