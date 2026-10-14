/**
 * Competitor products, their comparison products and the recommendations
 * salesmen submit. Mirrors `gudang-be/internal/competitor_product`.
 *
 * The Go API omits empty slices and nil pointers, so read optional fields with
 * `?? []` or `=== undefined`, never `!== null`.
 */
export interface CompetitorLabelRef {
  id: number
  name: string
}

export interface PhotoRef {
  id: number
  url: string
}

export interface CompetitorProductComparison {
  productId: number
  code: string
  name: string
  categoryName?: string
  principalName?: string
  isPrimary: boolean
  /** Our price per base unit of the product, decimal string, omitted when unset. */
  price?: string
  baseUomName?: string
}

export interface CompetitorProductListItem {
  id: number
  code: string
  name: string
  isActive: boolean
  brand: { id: number; name: string; manufacturer?: string }
  category: CompetitorLabelRef
  principal?: CompetitorLabelRef
  uomGroup: { id: number; name: string; baseUomName: string }
  /** Decimal string, omitted when unset. */
  referencePrice?: string
  primaryComparison?: { productId: number; code: string; name: string; price?: string }
  otherComparisonCount: number
  thumbnailUrl?: string
}

export interface CompetitorProduct
  extends Omit<
    CompetitorProductListItem,
    'primaryComparison' | 'otherComparisonCount' | 'thumbnailUrl'
  > {
  comparisons?: CompetitorProductComparison[]
  photos?: PhotoRef[]
  createdAt: string
  updatedAt?: string
  updatedByName?: string
}

export interface CompetitorProductPayload {
  /** Create only; omitted means generated from the number series. */
  code?: string
  name: string
  brandId: number
  categoryOptionId: number
  principalOptionId?: number
  uomGroupId: number
  referencePrice?: string
  isActive?: boolean
  comparisons: { productId: number; isPrimary: boolean; price?: string }[]
}

export interface CompetitorProductListQuery {
  search?: string
  brandId?: number
  categoryOptionId?: number
  principalOptionId?: number
  isActive?: boolean
  limit?: number
  offset?: number
}

export type RecommendationStatus = 'pending' | 'created' | 'merged' | 'rejected'

export interface CompetitorProductRecommendation {
  id: number
  name: string
  observedPrice?: string
  observedUom?: CompetitorLabelRef
  customer?: { id: number; code: string; name: string }
  submitter: { employeeId: number; name: string }
  notes?: string
  status: RecommendationStatus
  competitorProduct?: { id: number; code: string; name: string }
  rejectReason?: string
  resolvedByName?: string
  resolvedAt?: string
  createdAt: string
  photos?: PhotoRef[]
  suggestions?: {
    competitorProductId: number
    code: string
    name: string
    brandName: string
    score: number
  }[]
  siblingIds?: number[]
  similarPending?: { id: number; name: string; score: number }[]
}

export interface RecommendationListQuery {
  status?: RecommendationStatus
  search?: string
  limit?: number
  offset?: number
}
