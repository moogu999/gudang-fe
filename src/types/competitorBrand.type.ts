/** Competitor brands. Mirrors `gudang-be/internal/competitor_brand`. */
export interface CompetitorBrand {
  id: number
  name: string
  manufacturer?: string
  isActive: boolean
  productCount: number
  createdAt: string
  updatedAt?: string
  updatedByName?: string
}

export interface CompetitorBrandPayload {
  name: string
  manufacturer?: string
  isActive?: boolean
}

export interface CompetitorBrandListQuery {
  isActive?: boolean
  search?: string
}
