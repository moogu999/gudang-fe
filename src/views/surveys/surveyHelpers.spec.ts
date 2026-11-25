import { describe, expect, it } from 'vitest'
import type { SurveyListItem, SurveyQuestion } from '@/types/survey.type'
import {
  buildCreatePayload,
  buildUpdatePayload,
  fromApiQuestion,
  listSubtitle,
  lockedFields,
  moveItem,
  newQuestion,
  newStockForm,
  previewScreens,
  publishBlockers,
  toQuestionInput,
  validateQuestion,
  validateQuestions,
  type SurveyFormState,
} from './surveyHelpers'

function state(over: Partial<SurveyFormState> = {}): SurveyFormState {
  return {
    branchId: 1,
    type: 'regular',
    name: '  Price check  ',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    notes: '',
    frequency: 'once_per_period',
    isRequired: true,
    scopeAll: false,
    scopeValueIds: [3],
    salesTeamIds: [],
    questions: [],
    ...over,
  }
}

function row(over: Partial<SurveyListItem> = {}): SurveyListItem {
  return {
    id: 1,
    code: 'SRV-0001',
    name: 'S',
    type: 'regular',
    branch: { id: 1, name: 'B' },
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    frequency: 'every_visit',
    isRequired: false,
    status: 'draft',
    displayStatus: 'draft',
    version: 1,
    questionCount: 0,
    hasGrid: false,
    hasPhoto: false,
    productCount: 0,
    ...over,
  }
}

describe('lockedFields', () => {
  it('locks nothing on a survey that does not exist yet', () => {
    expect(lockedFields(undefined)).toEqual({
      all: false,
      principal: false,
      startDate: false,
      frequency: false,
      isRequired: false,
      endDateFromToday: false,
      content: false,
    })
  })

  it('freezes content and principal once published, and more once active', () => {
    expect(lockedFields('scheduled')).toMatchObject({
      content: true,
      principal: true,
      startDate: false,
      frequency: false,
    })
    expect(lockedFields('active')).toMatchObject({
      content: true,
      startDate: true,
      frequency: true,
      isRequired: true,
      endDateFromToday: true,
    })
    expect(lockedFields('ended').all).toBe(true)
  })
})

describe('newQuestion', () => {
  it('gives each type its own defaults', () => {
    expect(newQuestion('photo').photoMax).toBe(3)
    expect(newQuestion('single_choice').options).toHaveLength(2)
    expect(newQuestion('competitor_grid').grid).toMatchObject({
      askAvailability: true,
      askPrice: true,
      askPhoto: false,
      askOurStorePrice: false,
      allowUnlisted: true,
    })
    expect(newQuestion('text').options).toBeUndefined()
  })

  it('makes a unique client key each time', () => {
    expect(newQuestion('text').clientKey).not.toBe(newQuestion('text').clientKey)
  })
})

describe('toQuestionInput', () => {
  it('sends only the fields of the type and strips the client keys', () => {
    const q: SurveyQuestion = {
      ...newQuestion('single_choice'),
      id: 9,
      text: '  Which?  ',
      helpText: '  ',
      options: [
        { id: 1, clientKey: 'o-1', label: ' A ' },
        { clientKey: 'n', label: 'B' },
      ],
    }
    const input = toQuestionInput(q)
    expect(input).toEqual({
      id: 9,
      type: 'single_choice',
      text: 'Which?',
      isRequired: true,
      choiceAllowOther: false,
      options: [{ id: 1, label: 'A' }, { label: 'B' }],
    })
    expect(JSON.stringify(input)).not.toContain('clientKey')
  })

  it('keeps decimals as strings and drops emptied limits', () => {
    const q: SurveyQuestion = {
      ...newQuestion('number'),
      text: 'Qty',
      numberMin: '0.5',
      numberMax: '',
    }
    expect(toQuestionInput(q)).toMatchObject({ numberMin: '0.5', numberAllowDecimal: false })
    expect(toQuestionInput(q)).not.toHaveProperty('numberMax')
  })

  it('turns grid refs into ids', () => {
    const q = newQuestion('competitor_grid')
    q.text = 'Grid'
    q.grid = {
      ...q.grid!,
      categories: [{ id: 4, name: 'Mi' }],
      excluded: [{ id: 8, name: 'X' }],
    }
    expect(toQuestionInput(q).grid).toMatchObject({ categoryOptionIds: [4], excludedIds: [8] })
  })
})

describe('fromApiQuestion', () => {
  it('round-trips through the payload', () => {
    const q = fromApiQuestion({
      id: 5,
      sortOrder: 1,
      type: 'multi_choice',
      text: 'Pick',
      isRequired: false,
      options: [
        { id: 1, label: 'A' },
        { id: 2, label: 'B' },
      ],
      choiceAllowOther: true,
    })
    expect(q.clientKey).toBe('q-5')
    expect(q.options?.map((o) => o.clientKey)).toEqual(['o-1', 'o-2'])
    expect(toQuestionInput(q).options).toEqual([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ])
  })
})

describe('validateQuestion', () => {
  it('flags blank text, too few options and duplicate labels', () => {
    const q = newQuestion('single_choice')
    expect(validateQuestion(q)).toEqual(
      expect.arrayContaining([
        'surveys.validation.questionTextRequired',
        'surveys.validation.optionLabel',
      ]),
    )
    q.text = 'Q'
    q.options = [{ label: 'a' }, { label: 'A' }]
    expect(validateQuestion(q)).toEqual(['surveys.validation.optionsDuplicate'])
    q.options = [{ label: 'a' }]
    expect(validateQuestion(q)).toContain('surveys.validation.optionsCount')
  })

  it('flags a number range, a photo max and a grid with nothing asked', () => {
    const n = { ...newQuestion('number'), text: 'N', numberMin: '5', numberMax: '2' }
    expect(validateQuestion(n)).toEqual(['surveys.validation.numberRange'])
    const p = { ...newQuestion('photo'), text: 'P', photoMax: 6 }
    expect(validateQuestion(p)).toEqual(['surveys.validation.photoMax'])
    const g = newQuestion('competitor_grid')
    g.text = 'G'
    g.grid = {
      ...g.grid!,
      categories: [{ id: 1, name: 'c' }],
      askAvailability: false,
      askPrice: false,
    }
    expect(validateQuestion(g)).toEqual(['surveys.validation.gridAsk'])
    g.grid = { ...g.grid, categories: [], askPrice: true }
    expect(validateQuestion(g)).toEqual(['surveys.validation.gridCategories'])
  })

  it('accepts a well-formed question', () => {
    expect(validateQuestion({ ...newQuestion('text'), text: 'Hello' })).toEqual([])
  })
})

describe('validateQuestions', () => {
  it('caps questions at 30 and grids at 3', () => {
    const many = Array.from({ length: 31 }, () => ({ ...newQuestion('text'), text: 'q' }))
    expect(validateQuestions(many)._).toContain('surveys.validation.tooManyQuestions')

    const grids = Array.from({ length: 4 }, () => ({
      ...newQuestion('text'),
      type: 'competitor_grid' as const,
    }))
    expect(validateQuestions(grids)._).toContain('surveys.validation.tooManyGrids')
  })

  it('keys problems by client key', () => {
    const bad = newQuestion('text')
    const errors = validateQuestions([bad])
    expect(Object.keys(errors)).toEqual([bad.clientKey])
  })
})

describe('moveItem', () => {
  it('moves one place and ignores out-of-range moves', () => {
    expect(moveItem([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3])
  })
})

describe('payloads', () => {
  it('create: trims, omits an automatic code and sends the questions of a regular survey', () => {
    const body = buildCreatePayload(state({ questions: [{ ...newQuestion('text'), text: 'Q' }] }))
    expect(body.name).toBe('Price check')
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('principalOptionId')
    expect(body.questions).toHaveLength(1)
    expect(body).not.toHaveProperty('stockCheck')
    expect(buildCreatePayload(state({ code: ' X1 ' })).code).toBe('X1')
  })

  it('"all" and values are mutually exclusive', () => {
    expect(buildCreatePayload(state({ scopeAll: true })).scopeValueIds).toEqual([])
  })

  it('stock check: sends the source, never questions, and no products for msl', () => {
    const stock = { ...newStockForm(true), products: [{ id: 1, code: 'P', name: 'p' }] }
    const msl = buildUpdatePayload(state({ type: 'stock_check', stock }), 4)
    expect(msl.version).toBe(4)
    expect(msl).not.toHaveProperty('questions')
    expect(msl.stockCheck).toEqual({
      source: 'msl',
      productIds: [],
      askStore: true,
      storeRequired: false,
      askDisplay: false,
    })
    const products = buildUpdatePayload(
      state({ type: 'stock_check', stock: { ...stock, source: 'products' } }),
      4,
    )
    expect(products.stockCheck?.productIds).toEqual([1])
  })

  it('stock check: store-dependent columns are off while store stock is off', () => {
    const stock = { ...newStockForm(false), storeRequired: true, askDisplay: true }
    const body = buildCreatePayload(state({ type: 'stock_check', stock }))
    expect(body.stockCheck).toMatchObject({
      askStore: false,
      storeRequired: false,
      askDisplay: false,
    })
  })
})

describe('publishBlockers', () => {
  const ok = {
    type: 'regular' as const,
    hasScope: true,
    endDate: '2026-12-31',
    questionCount: 2,
    hasEmptyGrid: false,
    stockProductCount: 0,
    today: '2026-10-12',
  }

  it('allows a complete survey', () => {
    expect(publishBlockers(ok)).toEqual([])
  })

  it('names every reason', () => {
    expect(
      publishBlockers({ ...ok, hasScope: false, endDate: '2026-10-01', questionCount: 0 }),
    ).toEqual([
      'surveys.actions.publishNeedsScope',
      'surveys.actions.publishEndInPast',
      'surveys.actions.publishNeedsQuestions',
    ])
    expect(publishBlockers({ ...ok, hasEmptyGrid: true })).toEqual([
      'surveys.actions.publishGridEmpty',
    ])
  })

  it('a stock check needs products only when it picks them', () => {
    const stock = { ...ok, type: 'stock_check' as const, questionCount: 0 }
    expect(publishBlockers({ ...stock, stockSource: 'msl' })).toEqual([])
    expect(publishBlockers({ ...stock, stockSource: 'products' })).toEqual([
      'surveys.actions.publishNeedsProducts',
    ])
  })
})

describe('listSubtitle', () => {
  it('describes a regular survey', () => {
    expect(listSubtitle(row())).toEqual([{ key: 'surveys.list.subtitle.noQuestions' }])
    expect(listSubtitle(row({ questionCount: 4, hasGrid: true, hasPhoto: true }))[0]).toEqual({
      key: 'surveys.list.subtitle.questionsGrid',
      params: { n: 4 },
    })
    expect(listSubtitle(row({ questionCount: 3, hasPhoto: true }))[0].key).toBe(
      'surveys.list.subtitle.questionsPhoto',
    )
    expect(listSubtitle(row({ questionCount: 3 }))[0].key).toBe('surveys.list.subtitle.questions')
  })

  it('describes a stock check by its source and columns', () => {
    expect(
      listSubtitle(row({ type: 'stock_check', stockSource: 'msl', stockAskStore: true })).map(
        (p) => p.key,
      ),
    ).toEqual(['surveys.list.subtitle.followsMsl', 'surveys.list.subtitle.columnsStore'])
    expect(
      listSubtitle(row({ type: 'stock_check', stockSource: 'products', productCount: 12 })),
    ).toEqual([
      { key: 'surveys.list.subtitle.products', params: { n: 12 } },
      { key: 'surveys.list.subtitle.columnsAvailable' },
    ])
  })

  it('names the survey it was duplicated from', () => {
    const parts = listSubtitle(row({ sourceSurvey: { id: 2, name: 'Oct' } }))
    expect(parts.at(-1)).toEqual({
      key: 'surveys.list.subtitle.duplicatedFrom',
      params: { name: 'Oct' },
    })
  })
})

describe('previewScreens', () => {
  it('shows one screen per question with its position', () => {
    const questions = [newQuestion('text'), newQuestion('yes_no'), newQuestion('photo')]
    const screens = previewScreens({ type: 'regular', questions })
    expect(screens).toHaveLength(3)
    expect(screens[2]).toMatchObject({ kind: 'question', index: 2, total: 3 })
  })

  it('shows one stock screen with the picked products', () => {
    const stock = {
      ...newStockForm(true),
      source: 'products' as const,
      askDisplay: true,
      products: [{ id: 1, code: 'P', name: 'p' }],
    }
    const [screen] = previewScreens({ type: 'stock_check', questions: [], stock })
    expect(screen).toMatchObject({
      kind: 'stock',
      sampleCount: 0,
      askStore: true,
      askDisplay: true,
    })
    expect(screen.kind === 'stock' && screen.products).toHaveLength(1)
  })

  it('uses sample rows when the products come from the customer MSL', () => {
    const [screen] = previewScreens({
      type: 'stock_check',
      questions: [],
      stock: newStockForm(false),
    })
    expect(screen).toMatchObject({ kind: 'stock', sampleCount: 3, askStore: false })
  })

  it('hides display stock while store stock is off', () => {
    const [screen] = previewScreens({
      type: 'stock_check',
      questions: [],
      stock: { ...newStockForm(false), askDisplay: true },
    })
    expect(screen).toMatchObject({ askStore: false, askDisplay: false })
  })
})
