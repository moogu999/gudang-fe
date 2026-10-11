import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MslProductPickerDialog from './MslProductPickerDialog.vue'
import type { MslProductOption } from '@/types/mustSellList.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const productOptions = vi.fn()
vi.mock('@/services', () => ({
  MustSellListsService: { productOptions: (...args: unknown[]) => productOptions(...args) },
}))

function option(productId: number): MslProductOption {
  return {
    productId,
    code: `P-${productId}`,
    name: `Product ${productId}`,
    units: [{ uomId: 1, name: 'PCS', symbol: 'pcs', factorToBase: '1', isBase: true }],
  }
}

// One button per row that selects it, with rows the picker would not let through marked.
const DataTableStub = defineComponent({
  name: 'DataTable',
  props: ['value', 'rowClass'],
  emits: ['row-select', 'page'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {},
        (props.value as MslProductOption[]).map((row) =>
          h('button', {
            class: 'row',
            'data-row': row.productId,
            'data-blocked': String(props.rowClass(row).includes('pointer-events-none')),
            onClick: () => emit('row-select', { data: row }),
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
  Tag: { template: '<span />' },
  Button: {
    props: ['label', 'disabled'],
    emits: ['click'],
    template:
      '<button class="btn" :disabled="disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')">{{ label }}</button>',
  },
}

function mountPicker(excludeIds: number[] = []) {
  return mount(MslProductPickerDialog, {
    props: { principalOptionId: 7, excludeIds },
    global: { stubs },
  })
}

beforeEach(() => {
  productOptions.mockReset().mockResolvedValue({
    data: [option(1), option(2)],
    meta: { total: 2, limit: 20, offset: 0 },
  })
})

describe('MslProductPickerDialog', () => {
  it('asks only for products of the list principal', async () => {
    mountPicker()
    await flushPromises()

    expect(productOptions).toHaveBeenCalledWith(
      expect.objectContaining({ principalOptionId: 7, limit: 20, offset: 0 }),
    )
  })

  it('blocks products already in the list', async () => {
    const wrapper = mountPicker([2])
    await flushPromises()

    expect(wrapper.find('[data-row="1"]').attributes('data-blocked')).toBe('false')
    expect(wrapper.find('[data-row="2"]').attributes('data-blocked')).toBe('true')
  })

  it('emits the selected products with their units', async () => {
    const wrapper = mountPicker([2])
    await flushPromises()

    await wrapper.find('[data-row="1"]').trigger('click')
    // A blocked row stays out even if its click gets through.
    await wrapper.find('[data-row="2"]').trigger('click')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')

    const emitted = wrapper.emitted('select')?.[0]?.[0] as MslProductOption[]
    expect(emitted.map((p) => p.productId)).toEqual([1])
    expect(emitted[0].units?.[0].isBase).toBe(true)
  })
})
