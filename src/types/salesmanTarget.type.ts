import type { LabelRef } from './salesTeam.type'

export type TargetSource = 'principal' | 'internal'
export type TargetStatus = 'draft' | 'active' | 'closed'
export type TargetLevel = 'product' | 'category'

export interface SalesmanTargetConfig {
  id: number
  branchId: number
  branchName: string
  targetLevel: TargetLevel
  createdAt: string
  createdBy: number
  updatedAt?: string
  updatedBy?: number
}

export interface UpsertSalesmanTargetConfigDto {
  targetLevel: TargetLevel
}

export interface TargetUnit {
  uomId: number
  name: string
  symbol: string
  factorToBase: string
  isBase: boolean
}

export interface SalesmanTargetListRow {
  id: number
  code: string
  branchId: number
  branchName: string
  period: string
  source: TargetSource
  principal?: LabelRef
  targetLevel: TargetLevel
  hasValue: boolean
  status: TargetStatus
  lineCount: number
  itemCount: number
  totalTargetValue?: string
  updatedAt: string
}

export interface SalesmanTargetItem {
  id: number
  productId?: number
  productCode?: string
  productName?: string
  categoryOptionId?: number
  categoryName?: string
  principalOptionId?: number
  principalName?: string
  /** Absent or null means the base unit. */
  uomId?: number | null
  uomSymbol?: string
  sortOrder: number
  /** Units the item can be entered in, largest first. Empty when only the base unit is allowed. */
  units: TargetUnit[]
  skuCount?: number
  alsoIn: number[]
}

export interface SalesmanTargetLine {
  id: number
  employeeId: number
  employeeCode?: string
  employeeName: string
  employeeTypeName: string
  employeeActive: boolean
  teamCodes: string[]
  targetValue?: string
  effectiveCall?: number
  activeOutlet?: number
  sortOrder: number
  /** Base-unit qty per item id. A missing key means not targeted, which differs from "0". */
  cells: Record<string, string>
}

export interface SalesmanTarget {
  id: number
  code: string
  branchId: number
  branchName: string
  period: string
  source: TargetSource
  principalOptionId?: number
  principalName?: string
  targetLevel: TargetLevel
  hasValue: boolean
  hasQty: boolean
  hasEffectiveCall: boolean
  hasActiveOutlet: boolean
  principalTargetValue?: string
  notes?: string
  status: TargetStatus
  version: number
  activatedAt?: string
  activatedBy?: number
  activatedByName?: string
  closedAt?: string
  closedBy?: number
  closedByName?: string
  createdAt: string
  createdBy: number
  createdByName?: string
  updatedAt?: string
  updatedBy?: number
  items: SalesmanTargetItem[]
  lines: SalesmanTargetLine[]
}

export interface TargetItemInput {
  id?: number
  key?: string
  productId?: number
  categoryOptionId?: number
  principalOptionId?: number
  uomId?: number | null
}

export interface TargetLineInput {
  employeeId: number
  targetValue?: string | null
  effectiveCall?: number | null
  activeOutlet?: number | null
  cells?: Record<string, string>
}

export interface CreateSalesmanTargetRequest {
  code?: string
  branchId: number
  period: string
  source: TargetSource
  principalOptionId?: number
  hasValue: boolean
  hasQty: boolean
  hasEffectiveCall: boolean
  hasActiveOutlet: boolean
  principalTargetValue?: string | null
  notes?: string | null
  items?: TargetItemInput[]
  lines?: TargetLineInput[]
}

export interface UpdateSalesmanTargetRequest {
  version: number
  hasValue: boolean
  hasQty: boolean
  hasEffectiveCall: boolean
  hasActiveOutlet: boolean
  principalTargetValue?: string | null
  notes?: string | null
  items?: TargetItemInput[]
  lines?: TargetLineInput[]
}

export interface SalesmanTargetCandidate {
  employeeId: number
  code?: string
  name: string
  typeName: string
  teamCodes: string[]
  principals: string[]
}

export interface SalesmanTargetCandidateList {
  data: SalesmanTargetCandidate[]
  existingTargetId?: number
}

export interface SalesmanTargetCandidateQuery {
  branchId: number
  period: string
  source: TargetSource
  principalOptionId?: number
  excludeTargetId?: number
}

export interface SalesmanTargetItemOption {
  productId?: number
  productCode?: string
  productName?: string
  categoryOptionId?: number
  categoryName?: string
  principalOptionId?: number
  principalName?: string
  skuCount: number
  uniformUnits: boolean
  units: TargetUnit[]
  defaultUomId?: number
  skuSample: string[]
}

export interface SalesmanTargetItemOptionQuery {
  branchId: number
  level: TargetLevel
  principalOptionId?: number
  q?: string
  limit?: number
  offset?: number
}
