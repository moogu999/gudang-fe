/**
 * Display programs: an agreement to display products at a list of customers for a period.
 * Mirrors `gudang-be/internal/display_program`.
 *
 * The Go API omits nil pointers and empty slices, so read optional fields with `=== undefined`
 * or `?? []`, never `!== null`. Decimals travel as strings.
 */
export type DisplayProgramStatus = 'draft' | 'published'
export type DisplayProgramDisplayStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type DisplayProgramStatusFilter = 'current' | DisplayProgramDisplayStatus | 'all'
export type DisplayFrequencyMode = 'every_visit' | 'min_per_month'

export interface DisplayProgramRef {
  id: number
  name: string
}

export interface DisplayProgramTypeRef {
  id: number
  code: string
  name: string
}

export interface DisplayProgramStatusCounts {
  draft: number
  scheduled: number
  active: number
  ended: number
}

export interface DisplayProgramListItem {
  id: number
  code: string
  name: string
  branch: DisplayProgramRef
  /** Absent for an internal program. */
  principal?: DisplayProgramRef
  displayType: DisplayProgramTypeRef
  startDate: string
  endDate: string
  frequencyMode: DisplayFrequencyMode
  minPerMonth?: number
  rentPerMonth?: string
  participantCount: number
  status: DisplayProgramStatus
  displayStatus: DisplayProgramDisplayStatus
  version: number
}

export interface DisplayProgramListResponse {
  data: DisplayProgramListItem[]
  meta: {
    total: number
    limit: number
    offset: number
    counts?: DisplayProgramStatusCounts
  }
}

export interface DisplayCriterion {
  id: number
  text: string
  sortOrder: number
}

export interface DisplayPhoto {
  id: number
  url: string
  fileName: string
  size: number
}

export interface DisplayProgram extends Omit<DisplayProgramListItem, 'branch'> {
  branch: DisplayProgramRef
  notes?: string
  minPhotos: number
  minComplyPct?: string
  criteria?: DisplayCriterion[]
  photos?: DisplayPhoto[]
  createdByName?: string
  createdAt: string
  updatedByName?: string
  updatedAt?: string
  publishedByName?: string
  publishedAt?: string
}

export interface DisplayCriterionInput {
  id?: number
  text: string
}

/** Fields shared by create and update. */
export interface DisplayProgramFields {
  name: string
  principalOptionId?: number
  displayTypeId: number
  startDate: string
  endDate: string
  notes?: string
  frequencyMode: DisplayFrequencyMode
  minPerMonth?: number
  minPhotos?: number
  rentPerMonth?: string
  minComplyPct?: string
  /** In checklist order. */
  criteria: DisplayCriterionInput[]
}

export interface CreateDisplayProgramRequest extends DisplayProgramFields {
  /** Omitted = the next number of the series. */
  code?: string
  branchId: number
}

export interface UpdateDisplayProgramRequest extends DisplayProgramFields {
  version: number
  minPhotos: number
}

export interface DisplayProgramDuplicateResponse {
  id: number
  code: string
}

export interface DisplayCustomerRef {
  id: number
  code: string
  name: string
  city?: string
  outletType?: string
}

export interface DisplayParticipant {
  id: number
  customer: DisplayCustomerRef
  joinDate: string
  exitDate?: string
  rentOverride?: string
  /** The override, else the program's rent; absent when neither is set. */
  effectiveRent?: string
}

export type DisplayParticipantState = 'open' | 'exited' | 'all'

export interface DisplayParticipantQuery {
  q?: string
  state?: DisplayParticipantState
  limit?: number
  offset?: number
}

export interface DisplayCustomerOptionQuery {
  programId?: number
  q?: string
  outletTypeId?: number
  limit?: number
  offset?: number
}

export interface AddDisplayParticipantsRequest {
  version: number
  customerIds: number[]
  joinDate?: string
  rentOverride?: string
}

export interface AddDisplayParticipantsResponse {
  added: number
  skippedCustomerIds?: number[]
  version: number
}

export interface UpdateDisplayParticipantRequest {
  version: number
  joinDate: string
  /** Omitted clears the override. */
  rentOverride?: string
}

export interface ExitDisplayParticipantRequest {
  version: number
  /** Omitted = today. */
  exitDate?: string
}

export interface DisplayVersionResponse {
  version: number
}
