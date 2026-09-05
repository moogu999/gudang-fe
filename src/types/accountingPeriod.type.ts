export type PeriodStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'PERMANENTLY_CLOSED'
export type GenerationMode = 'MONTHLY' | 'CUSTOM'

export interface AccountingPeriod {
  id: number
  companyId: number
  fiscalYearId: number
  name: string
  sequence: number
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  status: PeriodStatus
  openedAt: string | null
  openedBy: number | null
  closedAt: string | null
  closedBy: number | null
  permanentlyClosedAt: string | null
  permanentlyClosedBy: number | null
  revertedAt: string | null
  revertedBy: number | null
  revertReason: string | null
  /** Present only on the single reopenable period; null otherwise. */
  reopenRequestStatus: string | null
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export interface FiscalYear {
  id: number
  companyId: number
  name: string
  startDate: string
  endDate: string
  generationMode: GenerationMode
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export interface FiscalYearDetail extends FiscalYear {
  periods: AccountingPeriod[]
}

/** An unsaved period row in the schedule editor. Dates are Date objects
 *  because they bind to DatePicker; they become YYYY-MM-DD on submit. */
export interface PeriodDraft {
  name: string
  startDate: Date | null
  endDate: Date | null
}

export interface CreateFiscalYearDto {
  companyId: number
  name: string
  startDate: string
  endDate: string
  generationMode: GenerationMode
  periods?: Array<{ name: string; startDate: string; endDate: string }>
}

/** No companyId — it is immutable server-side. */
export type UpdateFiscalYearDto = Omit<CreateFiscalYearDto, 'companyId'>

export interface AccountingPeriodConfig {
  id: number
  companyId: number
  reopenFlowId: number | null
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}
