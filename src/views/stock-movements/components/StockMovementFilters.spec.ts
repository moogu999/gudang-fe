import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StockMovementFilters from './StockMovementFilters.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/services', () => ({
  ProductsService: {
    list: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, limit: 10, offset: 0 } }),
  },
  WarehousesService: {
    list: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, limit: 10, offset: 0 } }),
  },
}))

vi.mock('@/components/select/InfiniteSelect.vue', () => ({
  default: {
    name: 'InfiniteSelect',
    props: ['modelValue', 'optionLabel', 'optionValue', 'fetchFn', 'sortBy', 'sortOperator'],
    emits: ['update:modelValue'],
    template: '<div class="infinite-select" />',
  },
}))

describe('StockMovementFilters', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(StockMovementFilters, {
      global: {
        stubs: {
          Select: {
            name: 'Select',
            props: [
              'modelValue',
              'options',
              'optionLabel',
              'optionValue',
              'placeholder',
              'showClear',
            ],
            emits: ['update:modelValue', 'change'],
            template:
              '<select><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
          },
          DatePicker: {
            name: 'DatePicker',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input type="text" />',
          },
          Button: {
            name: 'Button',
            props: ['label', 'severity'],
            emits: ['click'],
            template: '<button @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    })
  })

  it('renders without errors', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('renders two InfiniteSelect instances (product and warehouse)', () => {
    expect(wrapper.findAll('.infinite-select').length).toBe(2)
  })

  it('emits change with productId when product is selected', async () => {
    const vm = wrapper.vm as InstanceType<typeof StockMovementFilters> & {
      selectedProductId: number | undefined
      emitChange: () => void
    }
    vm.selectedProductId = 5
    vm.emitChange()
    await flushPromises()

    const emitted = wrapper.emitted('change')
    expect(emitted).toBeTruthy()
    const lastEmit = emitted![emitted!.length - 1][0] as { productId?: number }
    expect(lastEmit.productId).toBe(5)
  })

  it('emits change with ISO dateRange when both dates are selected', async () => {
    const vm = wrapper.vm as InstanceType<typeof StockMovementFilters> & {
      selectedDateRange: Date[] | null
      emitChange: () => void
    }
    vm.selectedDateRange = [new Date('2025-01-01'), new Date('2025-01-31')]
    vm.emitChange()
    await flushPromises()

    const emitted = wrapper.emitted('change')!
    const lastEmit = emitted[emitted.length - 1][0] as { dateRange?: [string, string] }
    expect(lastEmit.dateRange).toEqual(['2025-01-01', '2025-01-31'])
  })

  it('emits empty filters on clearAll', async () => {
    const vm = wrapper.vm as InstanceType<typeof StockMovementFilters> & {
      selectedProductId: number | undefined
      selectedWarehouseId: number | undefined
      selectedStockType: string | undefined
      clearAll: () => void
    }
    vm.selectedProductId = 3
    vm.selectedWarehouseId = 7
    vm.selectedStockType = 'good'
    vm.clearAll()
    await flushPromises()

    const emitted = wrapper.emitted('change')!
    const lastEmit = emitted[emitted.length - 1][0] as Record<string, unknown>
    expect(lastEmit.productId).toBeUndefined()
    expect(lastEmit.warehouseId).toBeUndefined()
    expect(lastEmit.stockType).toBeUndefined()
  })
})
