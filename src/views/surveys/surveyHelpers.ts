import dayjs from 'dayjs'
import type {
  CreateSurveyRequest,
  Survey,
  SurveyDisplayStatus,
  SurveyFrequency,
  SurveyGridConfig,
  SurveyGridInput,
  SurveyPreviewRequest,
  SurveyProductRef,
  SurveyQuestion,
  SurveyQuestionInput,
  SurveyQuestionOption,
  SurveyQuestionResponse,
  SurveyQuestionType,
  SurveyListItem,
  SurveyRef,
  SurveyScopeLevel,
  SurveyStockCheck,
  SurveyStockCheckInput,
  SurveyStockSource,
  SurveyType,
  UpdateSurveyRequest,
} from '@/types/survey.type'

export const QUESTION_TYPES: SurveyQuestionType[] = [
  'text',
  'number',
  'yes_no',
  'single_choice',
  'multi_choice',
  'photo',
  'competitor_grid',
]

export const MAX_QUESTIONS = 30
export const MAX_GRID_QUESTIONS = 3
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 20
export const MAX_PHOTOS = 5
export const MAX_STOCK_PRODUCTS = 200

/** The customer-category master a scope level reads its values from. */
export const SCOPE_LEVELS: SurveyScopeLevel[] = ['outlet_type', 'channel', 'category']

/** i18n key of a level: the customer fields already carry the house wording. */
export function scopeLevelLabelKey(level: SurveyScopeLevel): string {
  return `surveys.levels.${level}`
}

export function isChoiceType(type: SurveyQuestionType): boolean {
  return type === 'single_choice' || type === 'multi_choice'
}

// ---------------------------------------------------------------------------
// Which parts of a survey can still change
// ---------------------------------------------------------------------------

export interface SurveyLocks {
  /** Everything is read-only. */
  all: boolean
  principal: boolean
  startDate: boolean
  frequency: boolean
  isRequired: boolean
  /** An active survey's end date can't move into the past. */
  endDateFromToday: boolean
  /** Questions, grid config and stock-check content; only help text moves after publish. */
  content: boolean
}

/** What a display status locks. A survey that doesn't exist yet (create) locks nothing. */
export function lockedFields(status: SurveyDisplayStatus | undefined): SurveyLocks {
  const published = status === 'scheduled' || status === 'active' || status === 'ended'
  return {
    all: status === 'ended',
    principal: published,
    startDate: status === 'active' || status === 'ended',
    frequency: status === 'active' || status === 'ended',
    isRequired: status === 'active' || status === 'ended',
    endDateFromToday: status === 'active',
    content: published,
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

let keySeq = 0
export function newClientKey(): string {
  keySeq += 1
  return `new-${keySeq}`
}

export function newOption(label = ''): SurveyQuestionOption {
  return { clientKey: newClientKey(), label }
}

export function newGridConfig(): SurveyGridConfig {
  return {
    categories: [],
    excluded: [],
    askAvailability: true,
    askPrice: true,
    askPhoto: false,
    askOurStorePrice: false,
    allowUnlisted: true,
  }
}

/** A blank question of a type, with that type's defaults. */
export function newQuestion(type: SurveyQuestionType): SurveyQuestion {
  const base: SurveyQuestion = { clientKey: newClientKey(), type, text: '', isRequired: true }
  if (type === 'number') return { ...base, numberAllowDecimal: false }
  if (isChoiceType(type)) {
    return {
      ...base,
      choiceAllowOther: false,
      options: [newOption(), newOption()],
    }
  }
  if (type === 'photo') return { ...base, photoMax: 3 }
  if (type === 'competitor_grid') return { ...base, grid: newGridConfig() }
  return base
}

export function fromApiQuestion(q: SurveyQuestionResponse): SurveyQuestion {
  const question: SurveyQuestion = {
    clientKey: `q-${q.id}`,
    id: q.id,
    type: q.type,
    text: q.text,
    isRequired: q.isRequired,
  }
  if (q.helpText !== undefined) question.helpText = q.helpText
  if (q.type === 'number') {
    if (q.numberMin !== undefined) question.numberMin = q.numberMin
    if (q.numberMax !== undefined) question.numberMax = q.numberMax
    question.numberAllowDecimal = q.numberAllowDecimal ?? false
  }
  if (isChoiceType(q.type)) {
    question.choiceAllowOther = q.choiceAllowOther ?? false
    question.options = (q.options ?? []).map((o) => ({
      id: o.id,
      clientKey: `o-${o.id}`,
      label: o.label,
    }))
  }
  if (q.type === 'photo') question.photoMax = q.photoMax ?? 1
  if (q.type === 'competitor_grid') {
    const g = q.grid
    question.grid = {
      categories: g?.categories ?? [],
      excluded: g?.excluded ?? [],
      askAvailability: g?.askAvailability ?? true,
      askPrice: g?.askPrice ?? false,
      askPhoto: g?.askPhoto ?? false,
      askOurStorePrice: g?.askOurStorePrice ?? false,
      allowUnlisted: g?.allowUnlisted ?? false,
      ...(g?.frozen ? { frozen: g.frozen } : {}),
    }
  }
  return question
}

function toGridInput(grid: SurveyGridConfig): SurveyGridInput {
  return {
    categoryOptionIds: grid.categories.map((c) => c.id),
    excludedIds: grid.excluded.map((c) => c.id),
    askAvailability: grid.askAvailability,
    askPrice: grid.askPrice,
    askPhoto: grid.askPhoto,
    askOurStorePrice: grid.askOurStorePrice,
    allowUnlisted: grid.allowUnlisted,
  }
}

/** One question as the API takes it: only the fields its type uses, no client key. */
export function toQuestionInput(q: SurveyQuestion): SurveyQuestionInput {
  const input: SurveyQuestionInput = {
    type: q.type,
    text: q.text.trim(),
    isRequired: q.isRequired,
  }
  if (q.id !== undefined) input.id = q.id
  const help = q.helpText?.trim()
  if (help) input.helpText = help
  if (q.type === 'number') {
    if (q.numberMin !== undefined && q.numberMin !== '') input.numberMin = q.numberMin
    if (q.numberMax !== undefined && q.numberMax !== '') input.numberMax = q.numberMax
    input.numberAllowDecimal = q.numberAllowDecimal ?? false
  }
  if (isChoiceType(q.type)) {
    input.choiceAllowOther = q.choiceAllowOther ?? false
    input.options = (q.options ?? []).map((o) => ({
      ...(o.id !== undefined ? { id: o.id } : {}),
      label: o.label.trim(),
    }))
  }
  if (q.type === 'photo') input.photoMax = q.photoMax ?? 1
  if (q.type === 'competitor_grid' && q.grid) input.grid = toGridInput(q.grid)
  return input
}

/** i18n keys of what is wrong with one question; empty when it is fine. */
export function validateQuestion(q: SurveyQuestion): string[] {
  const keys: string[] = []
  const text = q.text.trim()
  if (!text) keys.push('surveys.validation.questionTextRequired')
  else if (text.length > 300) keys.push('surveys.validation.questionTextTooLong')
  if ((q.helpText?.trim().length ?? 0) > 300) keys.push('surveys.validation.helpTextTooLong')

  if (q.type === 'number' && q.numberMin && q.numberMax) {
    const min = Number(q.numberMin)
    const max = Number(q.numberMax)
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      keys.push('surveys.validation.numberRange')
    }
  }
  if (isChoiceType(q.type)) {
    const labels = (q.options ?? []).map((o) => o.label.trim())
    if (labels.length < MIN_OPTIONS || labels.length > MAX_OPTIONS) {
      keys.push('surveys.validation.optionsCount')
    }
    if (labels.some((l) => !l || l.length > 100)) keys.push('surveys.validation.optionLabel')
    const lower = labels.filter(Boolean).map((l) => l.toLowerCase())
    if (new Set(lower).size !== lower.length) keys.push('surveys.validation.optionsDuplicate')
  }
  if (q.type === 'photo') {
    const max = q.photoMax ?? 0
    if (!Number.isInteger(max) || max < 1 || max > MAX_PHOTOS) {
      keys.push('surveys.validation.photoMax')
    }
  }
  if (q.type === 'competitor_grid') {
    const g = q.grid
    if (!g || g.categories.length === 0) keys.push('surveys.validation.gridCategories')
    if (!g || !(g.askAvailability || g.askPrice || g.askPhoto)) {
      keys.push('surveys.validation.gridAsk')
    }
  }
  return keys
}

/** Per-question problems keyed by client key, plus document-level ones under `_`. */
export function validateQuestions(questions: SurveyQuestion[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const q of questions) {
    const keys = validateQuestion(q)
    if (keys.length) result[q.clientKey] = keys
  }
  const doc: string[] = []
  if (questions.length > MAX_QUESTIONS) doc.push('surveys.validation.tooManyQuestions')
  if (questions.filter((q) => q.type === 'competitor_grid').length > MAX_GRID_QUESTIONS) {
    doc.push('surveys.validation.tooManyGrids')
  }
  if (doc.length) result._ = doc
  return result
}

/** Moves a question one place up (-1) or down (1); out-of-range moves leave the order alone. */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(to, 0, item)
  return next
}

// ---------------------------------------------------------------------------
// Stock check
// ---------------------------------------------------------------------------

export interface StockFormState {
  source: SurveyStockSource
  askStore: boolean
  storeRequired: boolean
  askDisplay: boolean
  products: SurveyProductRef[]
}

export function newStockForm(askStoreDefault: boolean): StockFormState {
  return {
    source: 'msl',
    askStore: askStoreDefault,
    storeRequired: false,
    askDisplay: false,
    products: [],
  }
}

export function fromApiStockCheck(s: SurveyStockCheck): StockFormState {
  return {
    source: s.source,
    askStore: s.askStore,
    storeRequired: s.storeRequired,
    askDisplay: s.askDisplay,
    products: s.products ?? [],
  }
}

/** Store-dependent columns are off while Store stock is off. */
export function toStockInput(s: StockFormState): SurveyStockCheckInput {
  return {
    source: s.source,
    productIds: s.source === 'products' ? s.products.map((p) => p.id) : [],
    askStore: s.askStore,
    storeRequired: s.askStore && s.storeRequired,
    askDisplay: s.askStore && s.askDisplay,
  }
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface SurveyFormState {
  code?: string
  branchId?: number
  type: SurveyType
  name: string
  principalOptionId?: number
  startDate: string
  endDate: string
  notes: string
  frequency: SurveyFrequency
  isRequired: boolean
  scopeAll: boolean
  scopeValueIds: number[]
  salesTeamIds: number[]
  questions: SurveyQuestion[]
  stock?: StockFormState
}

function base(state: SurveyFormState) {
  const notes = state.notes.trim()
  return {
    name: state.name.trim(),
    ...(state.principalOptionId ? { principalOptionId: state.principalOptionId } : {}),
    startDate: state.startDate,
    endDate: state.endDate,
    ...(notes ? { notes } : {}),
    frequency: state.frequency,
    isRequired: state.isRequired,
    scopeAll: state.scopeAll,
    // Mutually exclusive with "all"; the API rejects both.
    scopeValueIds: state.scopeAll ? [] : state.scopeValueIds,
    salesTeamIds: state.salesTeamIds,
    ...(state.type === 'regular'
      ? { questions: state.questions.map(toQuestionInput) }
      : state.stock
        ? { stockCheck: toStockInput(state.stock) }
        : {}),
  }
}

export function buildCreatePayload(state: SurveyFormState): CreateSurveyRequest {
  const code = state.code?.trim()
  return {
    ...(code ? { code } : {}),
    branchId: state.branchId as number,
    type: state.type,
    ...base(state),
  }
}

export function buildUpdatePayload(state: SurveyFormState, version: number): UpdateSurveyRequest {
  return { version, ...base(state) }
}

export function buildPreviewPayload(
  state: SurveyFormState,
  level: SurveyScopeLevel | undefined,
  excludeId?: number,
): SurveyPreviewRequest {
  return {
    branchId: state.branchId as number,
    ...(excludeId ? { excludeId } : {}),
    ...(state.principalOptionId ? { principalOptionId: state.principalOptionId } : {}),
    ...(level ? { scopeLevel: level } : {}),
    scopeAll: state.scopeAll,
    scopeValueIds: state.scopeAll ? [] : state.scopeValueIds,
    salesTeamIds: state.salesTeamIds,
  }
}

/** The form state a stored survey loads into. */
export function fromApiSurvey(survey: Survey): Pick<SurveyFormState, 'questions' | 'stock'> {
  return {
    questions: (survey.questions ?? []).map(fromApiQuestion),
    stock: survey.stockCheck ? fromApiStockCheck(survey.stockCheck) : undefined,
  }
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export interface PublishInput {
  type: SurveyType
  hasScope: boolean
  /** `YYYY-MM-DD` */
  endDate: string
  questionCount: number
  /** A grid question that currently resolves to no products. */
  hasEmptyGrid: boolean
  stockSource?: SurveyStockSource
  stockProductCount: number
  today?: string
}

/** i18n keys of what blocks Publish; empty when it is allowed. */
export function publishBlockers(input: PublishInput): string[] {
  const keys: string[] = []
  if (!input.hasScope) keys.push('surveys.actions.publishNeedsScope')
  const today = input.today ?? dayjs().format('YYYY-MM-DD')
  if (input.endDate && input.endDate < today) keys.push('surveys.actions.publishEndInPast')
  if (input.type === 'regular') {
    if (input.questionCount === 0) keys.push('surveys.actions.publishNeedsQuestions')
    if (input.hasEmptyGrid) keys.push('surveys.actions.publishGridEmpty')
  } else if (input.stockSource === 'products' && input.stockProductCount === 0) {
    keys.push('surveys.actions.publishNeedsProducts')
  }
  return keys
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export interface SubtitlePart {
  key: string
  params?: Record<string, string | number>
}

function columnsKey(askStore: boolean, askDisplay: boolean): string {
  if (askStore && askDisplay) return 'surveys.list.subtitle.columnsDisplay'
  if (askStore) return 'surveys.list.subtitle.columnsStore'
  return 'surveys.list.subtitle.columnsAvailable'
}

/** The muted line under a survey's name in the list. */
export function listSubtitle(row: SurveyListItem): SubtitlePart[] {
  const parts: SubtitlePart[] = []
  if (row.type === 'regular') {
    if (row.questionCount === 0) {
      parts.push({ key: 'surveys.list.subtitle.noQuestions' })
    } else {
      const key = row.hasGrid
        ? 'surveys.list.subtitle.questionsGrid'
        : row.hasPhoto
          ? 'surveys.list.subtitle.questionsPhoto'
          : 'surveys.list.subtitle.questions'
      parts.push({ key, params: { n: row.questionCount } })
    }
  } else {
    const columns = { key: columnsKey(!!row.stockAskStore, !!row.stockAskDisplay) }
    if (row.stockSource === 'msl') {
      parts.push({ key: 'surveys.list.subtitle.followsMsl' }, columns)
    } else {
      parts.push(
        { key: 'surveys.list.subtitle.products', params: { n: row.productCount } },
        columns,
      )
    }
  }
  if (row.sourceSurvey) {
    parts.push({
      key: 'surveys.list.subtitle.duplicatedFrom',
      params: { name: row.sourceSurvey.name },
    })
  }
  return parts
}

// ---------------------------------------------------------------------------
// Phone preview
// ---------------------------------------------------------------------------

/** Rows shown for a stock check whose products come from the customer's MSL. */
export const SAMPLE_STOCK_ROWS = 3

export type PreviewScreen =
  | { kind: 'question'; index: number; total: number; question: SurveyQuestion }
  | {
      kind: 'stock'
      products: SurveyProductRef[]
      /** Placeholder rows when the products come from the customer's MSL. */
      sampleCount: number
      askStore: boolean
      storeRequired: boolean
      askDisplay: boolean
    }

/** What the phone shows, screen by screen, for the form as it stands. */
export function previewScreens(
  state: Pick<SurveyFormState, 'type' | 'questions' | 'stock'>,
): PreviewScreen[] {
  if (state.type === 'regular') {
    return state.questions.map((question, index) => ({
      kind: 'question',
      index,
      total: state.questions.length,
      question,
    }))
  }
  const s = state.stock
  if (!s) return []
  return [
    {
      kind: 'stock',
      products: s.source === 'products' ? s.products : [],
      sampleCount: s.source === 'msl' ? SAMPLE_STOCK_ROWS : 0,
      askStore: s.askStore,
      storeRequired: s.askStore && s.storeRequired,
      askDisplay: s.askStore && s.askDisplay,
    },
  ]
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** A calendar date as the API reads it, never shifted by the browser's timezone. */
export function toApiDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

/** `01 Oct – 31 Dec 2026`, or with both years when they differ. */
export function formatPeriod(start: string, end: string, locale: string): string {
  const lang = locale.startsWith('id') ? 'id' : 'en'
  const s = dayjs(start).locale(lang)
  const e = dayjs(end).locale(lang)
  if (s.year() === e.year()) return `${s.format('DD MMM')} – ${e.format('DD MMM YYYY')}`
  return `${s.format('DD MMM YYYY')} – ${e.format('DD MMM YYYY')}`
}

export function refName(ref: SurveyRef | undefined): string {
  return ref?.name ?? ''
}
