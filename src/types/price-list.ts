export type PriceListTier = {
  id?: number
  minQuantity: string
  price: string
}

export type PriceListItem = {
  id?: number
  productId: number
  product?: {
    id: number
    code: string
    name: string
    smallestUom?: { id: number; name: string; symbol: string }
  }
  currencyId: number
  currency?: { id: number; code: string }
  taxIncluded: boolean
  tiers: PriceListTier[]
}

export type PriceList = {
  id: number
  code: string
  description: string
  startDate: string
  endDate: string | null
  active: boolean
  items: PriceListItem[]
  createdBy?: number | null
  updatedBy?: number | null
  createdAt?: string
  updatedAt?: string | null
}

export type PriceListSummary = {
  id: number
  code: string
  description: string
  startDate: string
  endDate: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string | null
}

export type CreatePriceListDto = {
  code: string
  description?: string
  startDate: string
  endDate?: string | null
  active?: boolean
  createdBy?: number | null
  items: {
    productId: number
    currencyId: number
    taxIncluded: boolean
    tiers: { minQuantity: string; price: string }[]
  }[]
}

export type UpdatePriceListDto = {
  code: string
  description?: string
  startDate: string
  endDate?: string | null
  active?: boolean
  updatedBy?: number | null
  items: {
    productId: number
    currencyId: number
    taxIncluded: boolean
    tiers: { minQuantity: string; price: string }[]
  }[]
}
