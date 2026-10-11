import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TargetItemPickerDialog from './TargetItemPickerDialog.vue'
import type { FormItem } from '../salesmanTargetGrid'
import type { SalesmanTargetItemOption } from '@/types/salesmanTarget.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const itemOptions = vi.fn()
vi.mock('@/services', () => ({
  SalesmanTargetsService: { itemOptions: (...args: unknown[]) => itemOptions(...args) },
}))
vi.mock('@/views/sales-teams/salesTeamHelpers', () => ({
  NO_LABEL: 'none',
  loadLabelFilterOptions: vi.fn(() => Promise.resolve([{ label: 'Indofood', value: 1 }])),
}))

function option(overrides: Partial<SalesmanTargetItemOption>): SalesmanTargetItemOption {
  return { skuCount: 3, uniformUnits: true, units: [], skuSample: [], ...overrides }
}

// Renders one button per row that selects it, and flags rows the table would not let through.
const DataTableStub = defineComponent({
  name: 'DataTable',
  props: ['value', 'selection', 'isRowSelectable'],
  emits: ['update:selection'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {},
        (props.value as Array<{ rowId: string }>).map((row) =>
          h('button', {
            class: 'row',
            'data-row': row.rowId,
            'data-selectable': String(props.isRowSelectable({ data: row })),
            onClick: () => emit('update:selection', [row]),
          }),
        ),
      )
  },
})

const stubs = {
  Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
  DataTable: DataTableStub,
  Column: { template: '<div />' },
  IconField: { template: '<div><slot /></div>' },
  InputIcon: { template: '<span />' },
  InputText: { template: '<input />' },
  Select: { template: '<div class="principal-filter" />' },
  Button: {
    props: ['label', 'disabled'],
    emits: ['click'],
    template:
      '<button class="btn" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
  },
}

const existing: FormItem[] = [
  { key: '1', id: 1, productId: 100, uomId: null, units: [], alsoIn: [] },
]

function mountPicker(source: 'principal' | 'internal', level: 'product' | 'category') {
  return mount(TargetItemPickerDialog, {
    props: { visible: true, branchId: 2, level, source, principalOptionId: 1, existing },
    global: { stubs },
  })
}

beforeEach(() => {
  itemOptions.mockReset()
})

describe('TargetItemPickerDialog', () => {
  it('disables rows that are already in the document', async () => {
    itemOptions.mockResolvedValue({
      data: [
        option({ productId: 100, productName: 'Taken' }),
        option({ productId: 101, productName: 'Free' }),
      ],
      meta: { total: 2, limit: 10, offset: 0 },
    })
    const wrapper = mountPicker('principal', 'product')
    await flushPromises()
    expect(wrapper.find('[data-row="p:100"]').attributes('data-selectable')).toBe('false')
    expect(wrapper.find('[data-row="p:101"]').attributes('data-selectable')).toBe('true')
  })

  it('shows the principal filter on internal documents only', async () => {
    itemOptions.mockResolvedValue({ data: [], meta: { total: 0, limit: 10, offset: 0 } })
    const internal = mountPicker('internal', 'category')
    await flushPromises()
    expect(internal.find('.principal-filter').exists()).toBe(true)

    const principal = mountPicker('principal', 'category')
    await flushPromises()
    expect(principal.find('.principal-filter').exists()).toBe(false)
  })

  it("fixes a principal document's options to its header principal", async () => {
    itemOptions.mockResolvedValue({ data: [], meta: { total: 0, limit: 10, offset: 0 } })
    mountPicker('principal', 'category')
    await flushPromises()
    expect(itemOptions).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 2, level: 'category', principalOptionId: 1 }),
    )
  })

  it("adds the selection with each option's default unit", async () => {
    itemOptions.mockResolvedValue({
      data: [option({ categoryOptionId: 11, categoryName: 'Noodle', defaultUomId: 2 })],
      meta: { total: 1, limit: 10, offset: 0 },
    })
    const wrapper = mountPicker('principal', 'category')
    await flushPromises()
    await wrapper.find('.row').trigger('click')
    const add = wrapper
      .findAll('.btn')
      .find((b) => b.text().includes('salesmanTargets.picker.add'))!
    await add.trigger('click')
    const items = wrapper.emitted('add')![0]![0] as FormItem[]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ categoryOptionId: 11, uomId: 2 })
    expect(items[0]!.key).toMatch(/^k-/)
  })
})
