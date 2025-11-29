export type Currency = {
  id: number
  code: string
  numericCode?: string
  name: string
  symbol?: string
  decimalPlaces: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CurrencyLite = {
  id: number
  code: string
}

export type CreateCurrencyDto = {
  code: string
  numericCode?: string
  name: string
  symbol?: string
  decimalPlaces: number
  isActive: boolean
}

export type UpdateCurrencyDto = {
  code?: string
  numericCode?: string
  name?: string
  symbol?: string
  decimalPlaces?: number
  isActive?: boolean
}
