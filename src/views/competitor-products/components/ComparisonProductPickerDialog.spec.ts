import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { flushPromises, mount } from '@vue/test-utils'
import { DataTableStub } from '@/views/ar-clearings/components/dataTableStub'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const search = vi.fn()
vi.mock('@/services', () => ({
  ProductsService: {
    searchWithLabels: (...a: unknown[]) => search(...a),
    labelFilterParam: (d: number, o: number) => `labelFilter=${d}%3A${o}`,
  },
  ProductLabelDefinitionsService: {
    findSystem: async (key: string) => ({ id: key === 'category' ? 5 : 4 }),
  },
}))

import ComparisonProductPickerDialog from './ComparisonProductPickerDialog.vue'

function mountPicker(props: Record<string, unknown>) {
  search.mockResolvedValue({
    data: [
      {
        id: 1,
        code: 'P1',
        name: 'One',
        labels: [{ id: 1, labelDefinitionId: 5, labelOptionId: 9, optionValue: 'Goreng' }],
      },
    ],
    meta: { total: 1, limit: 20, offset: 0 },
  })
  return mount(ComparisonProductPickerDialog, {
    props: { excludeIds: [], ...props },
    global: {
      plugins: [PrimeVue],
      stubs: {
        DataTable: DataTableStub,
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
      },
    },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('ComparisonProductPickerDialog', () => {
  it('filters by the category label while "same category only" is on', async () => {
    mountPicker({ categoryOptionId: 9 })
    await flushPromises()
    expect(search.mock.calls[0][0]).toContain('labelFilter=5%3A9')
  })

  it('does not filter without a category', async () => {
    mountPicker({})
    await flushPromises()
    expect(search.mock.calls[0][0]).not.toContain('labelFilter')
  })
})
