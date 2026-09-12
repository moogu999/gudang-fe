export interface JournalDocumentType {
  id: number
  code: string
  name: string
  isActive: boolean
  sortOrder: number
}

export type NormalSide = 'DEBIT' | 'CREDIT'
export type RoleGrain = 'HEADER' | 'LINE'

export interface JournalRole {
  id: number
  documentTypeId: number
  code: string
  name: string
  normalSide: NormalSide
  grain: RoleGrain
  amountSource: string
  sortOrder: number
}

export type DimensionSource =
  | 'company'
  | 'branch'
  | 'warehouse'
  | 'customer'
  | 'customer_category'
  | 'product'
  | 'product_label'
  | 'customer_label'
  | 'supplier'
  | 'order_type'

/** `refId`/`label` may simply be absent rather than `null` — Go omits nil
 *  pointers as absent JSON keys. Never compare these with `!== null`. */
export interface JournalDimension {
  key: string
  source: DimensionSource
  refId?: number | null
  label?: string
}

export interface JournalConfigBasis {
  position: number
  source: DimensionSource
  refId?: number | null
  label?: string
}

export type JournalConfigStatus = 'draft' | 'active' | 'inactive'

export interface JournalConfigRole {
  roleId: number
  roleCode: string
  roleName: string
  normalSide: NormalSide
  grain: RoleGrain
  /** Absent, not `[]`, when the role has no bases yet — Go omits nil slices
   *  as absent JSON keys. Never assume this key is present. */
  bases?: JournalConfigBasis[]
  totalRows: number
  unmappedRows: number
  staleRows: number
}

export interface JournalConfig {
  id: number
  companyId: number
  documentTypeId: number
  category?: string | null
  includePosting: boolean
  status: JournalConfigStatus
  activatedAt?: string | null
  activatedBy?: number | null
  roles: JournalConfigRole[]
  createdAt: string
  createdBy: number
  updatedAt?: string | null
  updatedBy?: number | null
}

export interface CreateJournalConfigDto {
  companyId: number
  documentTypeCode: string
}

export interface UpdateJournalConfigDto {
  category?: string | null
  includePosting: boolean
}

export interface JournalBasisDto {
  position: number
  source: DimensionSource
  refId?: number | null
}

export interface ReplaceBasesResult {
  /** Absent, not `[]`, when the role's new basis is empty. */
  bases?: JournalConfigBasis[]
  basisChanged: boolean
  mappingsCleared: number
}

export interface GenerateResult {
  added: number
  kept: number
  staleMarked: number
  total: number
}

export interface JournalMappingValue {
  position: number
  source: DimensionSource
  refId?: number | null
  /** `null`/absent means "(not set)" — this entity has no value for this
   *  dimension. It is never a wildcard. */
  valueId?: number | null
  label?: string | null
}

export interface JournalMapping {
  id: number
  combinationKey: string
  accountId?: number | null
  accountCode?: string | null
  accountName?: string | null
  subAccount?: string | null
  isStale: boolean
  values: JournalMappingValue[]
}

export interface SaveMappingDto {
  mappingId: number
  accountId?: number | null
  subAccount?: string | null
}

export interface RoleCompleteness {
  roleId: number
  roleCode: string
  roleName: string
  totalRows: number
  unmappedRows: number
}

/** Body of the 409 raised by `activate` — carries the per-role breakdown the
 *  activation banner needs, distinct from a generic ErrorResponse. */
export interface ConfigIncompleteError {
  message: string
  incompleteRoles?: RoleCompleteness[]
}
