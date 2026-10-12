export type SurveyType = 'regular' | 'stock_check'
export type SurveyFrequency = 'once_per_period' | 'every_visit'
export type SurveyStatus = 'draft' | 'published'
export type SurveyDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type SurveyStatusFilter = 'current' | SurveyDisplayStatus | 'all'
export type SurveyScopeLevel = 'outlet_type' | 'channel' | 'category'
export type SurveyRequiredMode = 'block_checkout' | 'reminder'
export type SurveyQuestionType =
  | 'text'
  | 'number'
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice'
  | 'photo'
  | 'competitor_grid'
export type SurveyStockSource = 'msl' | 'products'

export interface SurveyConfig {
  id: number
  branchId: number
  branchName: string
  scopeLevel: SurveyScopeLevel
  requiredMode: SurveyRequiredMode
  stockCheckQtyDefault: boolean
  createdAt: string
  createdBy: number
  updatedAt?: string
  updatedBy?: number
}

export interface UpsertSurveyConfigDto {
  scopeLevel: SurveyScopeLevel
  requiredMode: SurveyRequiredMode
  stockCheckQtyDefault: boolean
}

export interface SurveyRef {
  id: number
  name: string
}

export interface SurveyScopeValue extends SurveyRef {
  isActive: boolean
  /** The value's master row no longer exists. */
  deleted: boolean
}

export interface SurveySalesTeamRef {
  id: number
  code: string
  name: string
  isActive: boolean
}

export interface SurveyStatusCounts {
  draft: number
  scheduled: number
  active: number
  ended: number
}

export interface SurveyListItem {
  id: number
  code: string
  name: string
  type: SurveyType
  branch: SurveyRef
  principal?: SurveyRef
  startDate: string
  endDate: string
  frequency: SurveyFrequency
  isRequired: boolean
  status: SurveyStatus
  displayStatus: SurveyDisplayStatus
  version: number
  questionCount: number
  hasGrid: boolean
  hasPhoto: boolean
  stockSource?: SurveyStockSource
  stockAskStore?: boolean
  stockAskDisplay?: boolean
  productCount: number
  sourceSurvey?: SurveyRef
}

export interface SurveyListResponse {
  data: SurveyListItem[]
  meta: { total: number; limit: number; offset: number; counts: SurveyStatusCounts }
}

export interface SurveyQuestionOption {
  id?: number
  /** Stable key for v-for and drag before the option has an id; never sent. */
  clientKey?: string
  label: string
}

export interface SurveyGridProduct {
  competitorProductId: number
  name: string
  brandName: string
  comparisonProduct?: SurveyRef
  /** Set by the live preview only. */
  excluded?: boolean
}

export interface SurveyGridConfig {
  categories: SurveyRef[]
  excluded: SurveyRef[]
  askAvailability: boolean
  askPrice: boolean
  askPhoto: boolean
  askOurStorePrice: boolean
  allowUnlisted: boolean
  /** Present once published; a draft's list is live. */
  frozen?: SurveyGridProduct[]
}

export interface SurveyQuestion {
  id?: number
  /** Stable key for v-for before the question has an id; never sent. */
  clientKey: string
  type: SurveyQuestionType
  text: string
  helpText?: string
  isRequired: boolean
  numberMin?: string
  numberMax?: string
  numberAllowDecimal?: boolean
  choiceAllowOther?: boolean
  options?: SurveyQuestionOption[]
  photoMax?: number
  grid?: SurveyGridConfig
}

/** A question as the API returns it. */
export type SurveyQuestionResponse = Omit<SurveyQuestion, 'clientKey'> & {
  id: number
  sortOrder: number
}

export interface SurveyProductRef {
  id: number
  code: string
  name: string
  categoryName?: string
}

export interface SurveyStockCheck {
  source: SurveyStockSource
  askStore: boolean
  storeRequired: boolean
  askDisplay: boolean
  products: SurveyProductRef[]
}

export interface Survey {
  id: number
  code: string
  branchId: number
  branchName: string
  type: SurveyType
  name: string
  principalOptionId?: number
  principalName?: string
  startDate: string
  endDate: string
  notes?: string
  frequency: SurveyFrequency
  isRequired: boolean
  scopeLevel: SurveyScopeLevel
  scopeAll: boolean
  scopeValues?: SurveyScopeValue[]
  salesTeams?: SurveySalesTeamRef[]
  sourceSurvey?: SurveyRef
  questions?: SurveyQuestionResponse[]
  stockCheck?: SurveyStockCheck
  status: SurveyStatus
  displayStatus: SurveyDisplayStatus
  version: number
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

export interface SurveyOptionInput {
  id?: number
  label: string
}

export interface SurveyGridInput {
  categoryOptionIds: number[]
  excludedIds: number[]
  askAvailability: boolean
  askPrice: boolean
  askPhoto: boolean
  askOurStorePrice: boolean
  allowUnlisted: boolean
}

export interface SurveyQuestionInput {
  id?: number
  type: SurveyQuestionType
  text: string
  helpText?: string
  isRequired: boolean
  numberMin?: string
  numberMax?: string
  numberAllowDecimal?: boolean
  choiceAllowOther?: boolean
  options?: SurveyOptionInput[]
  photoMax?: number
  grid?: SurveyGridInput
}

export interface SurveyStockCheckInput {
  source: SurveyStockSource
  /** Array order is the phone order; empty for source msl. */
  productIds: number[]
  /** Omit on create to take the branch default. */
  askStore?: boolean
  storeRequired: boolean
  askDisplay: boolean
}

interface SurveyPayloadBase {
  name: string
  principalOptionId?: number
  startDate: string
  endDate: string
  notes?: string
  frequency: SurveyFrequency
  isRequired: boolean
  scopeAll: boolean
  scopeValueIds: number[]
  /** Empty means every team of the branch. */
  salesTeamIds: number[]
  questions?: SurveyQuestionInput[]
  stockCheck?: SurveyStockCheckInput
}

export interface CreateSurveyRequest extends SurveyPayloadBase {
  /** Omitted for an automatic code. */
  code?: string
  branchId: number
  type: SurveyType
}

export interface UpdateSurveyRequest extends SurveyPayloadBase {
  version: number
}

export interface SurveyDuplicateResponse {
  id: number
  code: string
  scopeCleared: boolean
}

export interface SurveyPreviewRequest {
  branchId: number
  excludeId?: number
  principalOptionId?: number
  scopeLevel?: SurveyScopeLevel
  scopeAll: boolean
  scopeValueIds: number[]
  salesTeamIds: number[]
}

export interface SurveyPreview {
  customerCount: number
  salesmanCount: number
  activeMslCount: number
}

export interface SurveyCustomerQuery {
  branchId: number
  scopeLevel: SurveyScopeLevel
  scopeAll: boolean
  scopeValueIds: number[]
  q?: string
  limit?: number
  offset?: number
}

export interface SurveyProductOptionQuery {
  principalOptionId?: number
  categoryOptionId?: number
  excludeIds?: number[]
  all?: boolean
  q?: string
  limit?: number
  offset?: number
}

export interface SurveySalesTeamOption {
  id: number
  code: string
  name: string
  memberCount: number
}
