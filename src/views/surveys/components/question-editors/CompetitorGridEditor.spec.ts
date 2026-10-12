import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type VNode } from 'vue'
import CompetitorGridEditor from './CompetitorGridEditor.vue'
import { newQuestion } from '../../surveyHelpers'
import type { SurveyGridProduct, SurveyQuestion } from '@/types/survey.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, number>) =>
      `${key}${params ? JSON.stringify(params) : ''}`,
  }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const competitorGridPreview = vi.fn()
vi.mock('@/services', () => ({
  SurveysService: { competitorGridPreview: (...args: unknown[]) => competitorGridPreview(...args) },
}))
vi.mock('../../../sales-teams/salesTeamHelpers', () => ({
  NO_LABEL: 'none',
  loadLabelFilterOptions: vi.fn().mockResolvedValue([{ label: 'Mi Goreng', value: 1 }]),
}))

function product(id: number): SurveyGridProduct {
  return { competitorProductId: id, name: `P${id}`, brandName: 'B' }
}

// Renders each column's body slot once per row, and the empty slot when there are no rows.
type SlotFn = (scope: { data: SurveyGridProduct }) => VNode[]
const DataTableStub = defineComponent({
  props: ['value'],
  setup(props, { slots }) {
    return () => {
      const rows = props.value as SurveyGridProduct[]
      if (rows.length === 0) return h('div', {}, slots.empty?.())
      const columns = (slots.default?.() ?? []) as VNode[]
      return h(
        'div',
        {},
        rows.map((row) =>
          h(
            'div',
            { class: 'row', 'data-row': row.competitorProductId },
            columns.map((c) => (c.children as { body?: SlotFn } | null)?.body?.({ data: row })),
          ),
        ),
      )
    }
  },
})
const ToggleStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        class: 'toggle',
        'data-on': String(props.modelValue),
        onClick: () => emit('update:modelValue', !props.modelValue),
      })
  },
})

const stubs = {
  DataTable: DataTableStub,
  Column: { template: '<span />' },
  MultiSelect: { template: '<div />' },
  Checkbox: { template: '<input type="checkbox" />' },
  ToggleSwitch: ToggleStub,
  Message: { template: '<div class="msg"><slot /></div>' },
}

function gridQuestion(over: Partial<SurveyQuestion['grid']> = {}): SurveyQuestion {
  const q = newQuestion('competitor_grid')
  q.grid = { ...q.grid!, categories: [{ id: 1, name: 'Mi Goreng' }], ...over }
  return q
}

function mountEditor(question: SurveyQuestion) {
  return mount(CompetitorGridEditor, {
    props: { question, toastGroup: 'g', 'onUpdate:question': vi.fn() },
    global: { stubs },
  })
}

beforeEach(() => {
  competitorGridPreview.mockReset().mockResolvedValue([product(1), product(2)])
})

describe('CompetitorGridEditor', () => {
  it('loads the live list of the chosen categories and reports the included products', async () => {
    const wrapper = mountEditor(gridQuestion())
    await flushPromises()

    expect(competitorGridPreview).toHaveBeenCalledWith([1])
    const loaded = wrapper.emitted('loaded')!.at(-1)![0] as SurveyGridProduct[]
    expect(loaded.map((p) => p.competitorProductId)).toEqual([1, 2])
  })

  it('does not ask the server when no category is chosen', async () => {
    const wrapper = mountEditor(gridQuestion({ categories: [] }))
    await flushPromises()

    expect(competitorGridPreview).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('surveys.grid.pickCategories')
  })

  it('leaves a product out of the included list once excluded', async () => {
    const wrapper = mountEditor(gridQuestion({ excluded: [{ id: 2, name: 'P2' }] }))
    await flushPromises()

    const loaded = wrapper.emitted('loaded')!.at(-1)![0] as SurveyGridProduct[]
    expect(loaded.map((p) => p.competitorProductId)).toEqual([1])
    expect(wrapper.find('[data-testid="grid-counter"]').text()).toContain('"included":1')
  })

  it('toggling Include writes the exclusion back to the question', async () => {
    const wrapper = mountEditor(gridQuestion())
    await flushPromises()

    await wrapper.find('[data-row="1"] .toggle').trigger('click')
    const update = wrapper.emitted('update:question')!.at(-1)![0] as SurveyQuestion
    expect(update.grid?.excluded.map((e) => e.id)).toEqual([1])
  })

  it('shows the frozen list of a published survey without asking the server', async () => {
    const wrapper = mountEditor(gridQuestion({ frozen: [product(9)] }))
    await flushPromises()

    expect(competitorGridPreview).not.toHaveBeenCalled()
    expect(wrapper.find('[data-row="9"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="grid-counter"]').text()).toContain(
      'surveys.grid.frozenCount',
    )
    const loaded = wrapper.emitted('loaded')!.at(-1)![0] as SurveyGridProduct[]
    expect(loaded).toHaveLength(1)
  })

  it('warns when the categories hold no active products', async () => {
    competitorGridPreview.mockResolvedValue([])
    const wrapper = mountEditor(gridQuestion())
    await flushPromises()

    expect(wrapper.find('[data-testid="grid-empty-warning"]').exists()).toBe(true)
  })
})
