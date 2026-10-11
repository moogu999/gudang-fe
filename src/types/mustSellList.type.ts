export type MslScopeLevel = 'outlet_type' | 'channel' | 'category'
export type MslStatus = 'draft' | 'published'
export type MslDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type MslStatusFilter = 'current' | MslDisplayStatus | 'all'

export interface MustSellListConfig {
  id: number
  branchId: number
  branchName: string
  scopeLevel: MslScopeLevel
  reasonRequired: boolean
  createdAt: string
  createdBy: number
  updatedAt?: string
  updatedBy?: number
}

export interface UpsertMustSellListConfigDto {
  scopeLevel: MslScopeLevel
  reasonRequired: boolean
}

export interface MslRef {
  id: number
  name: string
}

export interface MslScopeValue extends MslRef {
  isActive: boolean
  /** The value's master row no longer exists. */
  deleted: boolean
}

export interface MslUnit {
  uomId: number
  name: string
  symbol: string
  factorToBase: string
  isBase: boolean
}

export interface MslStatusCounts {
  draft: number
  scheduled: number
  active: number
  ended: number
}

export interface MustSellListListItem {
  id: number
  code: string
  name: string
  branch: MslRef
  principal: MslRef
  startDate: string
  endDate: string
  scopeLevel: MslScopeLevel
  scopeAll: boolean
  scopeValues?: MslScopeValue[]
  itemCount: number
  customerCount: number
  status: MslStatus
  displayStatus: MslDisplayStatus
  showInCanvass: boolean
  version: number
}

export interface MustSellListListResponse {
  data: MustSellListListItem[]
  meta: { total: number; limit: number; offset: number; counts: MslStatusCounts }
}

export interface MustSellListItem {
  id: number
  productId: number
  code: string
  name: string
  categoryName?: string
  uomGroupId?: number
  units?: MslUnit[]
  /** Suggested unit; absent means the base unit. */
  uomId?: number
  /** In the base unit; absent means any quantity. */
  minQty?: string
  sortOrder: number
}

export interface MustSellList {
  id: number
  code: string
  branchId: number
  branchName: string
  name: string
  principalOptionId: number
  principalName: string
  startDate: string
  endDate: string
  notes?: string
  scopeLevel: MslScopeLevel
  scopeAll: boolean
  scopeValues?: MslScopeValue[]
  showInCanvass: boolean
  status: MslStatus
  displayStatus: MslDisplayStatus
  version: number
  items?: MustSellListItem[]
  customerCount: number
  publishedAt?: string
  publishedBy?: number
  publishedByName?: string
  createdAt: string
  createdBy: number
  createdByName?: string
  updatedAt?: string
  updatedBy?: number
  updatedByName?: string
}

export interface MslItemInput {
  id?: number
  productId: number
  uomId?: number
  /** In the base unit. */
  minQty?: string
}

interface MslPayloadBase {
  name: string
  principalOptionId: number
  startDate: string
  endDate: string
  notes?: string
  scopeAll: boolean
  scopeValueIds: number[]
  showInCanvass: boolean
  /** Array order is the phone order. */
  items: MslItemInput[]
}

export interface CreateMustSellListRequest extends MslPayloadBase {
  /** Omitted for an automatic code. */
  code?: string
  branchId: number
}

export interface UpdateMustSellListRequest extends MslPayloadBase {
  version: number
}

export interface MslDuplicateResponse {
  id: number
  code: string
  scopeCleared: boolean
}

export interface MslPreviewRequest {
  branchId: number
  excludeId?: number
  principalOptionId?: number
  startDate?: string
  endDate?: string
  scopeLevel?: MslScopeLevel
  scopeAll: boolean
  scopeValueIds: number[]
  items: { productId: number; minQty?: string }[]
}

export interface MslSharedProduct {
  productId: number
  name: string
  thisMinQty?: string
  otherMinQty?: string
  effectiveMinQty?: string
  baseUomName?: string
}

export interface MslOverlap {
  id: number
  code: string
  name: string
  startDate: string
  endDate: string
  displayStatus: MslDisplayStatus
  sharedCustomerCount: number
  sharedProducts?: MslSharedProduct[]
}

export interface MslPreview {
  customerCount: number
  overlaps?: MslOverlap[]
}

export interface MslCustomer {
  id: number
  code: string
  name: string
  outletType?: string
  channel?: string
  category?: string
}

export interface MslCustomerQuery {
  branchId: number
  scopeLevel: MslScopeLevel
  scopeAll: boolean
  scopeValueIds: number[]
  q?: string
  limit?: number
  offset?: number
}

export interface MslProductOption {
  productId: number
  code: string
  name: string
  categoryName?: string
  uomGroupId?: number
  units?: MslUnit[]
}

export interface MslProductOptionQuery {
  principalOptionId: number
  categoryOptionId?: number
  excludeIds?: number[]
  all?: boolean
  q?: string
  limit?: number
  offset?: number
}
