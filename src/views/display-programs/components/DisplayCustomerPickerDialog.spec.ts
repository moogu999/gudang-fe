import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { flushPromises, mount } from '@vue/test-utils'
import { DataTableStub } from '@/views/ar-clearings/components/dataTableStub'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
const toastAdd = vi.fn()
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }))

const customerOptions = vi.fn()
vi.mock('@/services', () => ({
  DisplayProgramsService: { customerOptions: (...a: unknown[]) => customerOptions(...a) },
  CustomerOutletTypesService: { list: async () => ({ data: [], meta: { total: 0 } }) },
}))

import DisplayCustomerPickerDialog from './DisplayCustomerPickerDialog.vue'

const customers = (ids: number[]) =>
  ids.map((id) => ({ id, code: `C${id}`, name: `Customer ${id}` }))

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(DisplayCustomerPickerDialog, {
    props: {
      programId: 7,
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      saving: false,
      ...props,
    },
    global: {
      plugins: [PrimeVue],
      stubs: {
        DataTable: DataTableStub,
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        DatePicker: true,
        Select: true,
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-11T08:00:00'))
  customerOptions.mockResolvedValue({
    data: customers([1, 2]),
    meta: { total: 2, limit: 10, offset: 0 },
  })
})
afterEach(() => vi.useRealTimers())

describe('DisplayCustomerPickerDialog', () => {
  it('asks for the customers still open outside this program', async () => {
    mountPicker()
    await flushPromises()
    expect(customerOptions.mock.calls[0][0]).toMatchObject({ programId: 7, offset: 0 })
  })

  it('keeps the selection when the shown customers change', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0].trigger('change')

    customerOptions.mockResolvedValue({
      data: customers([3]),
      meta: { total: 1, limit: 10, offset: 0 },
    })
    await wrapper.find('[data-testid="picker-search"]').trigger('keydown.enter')
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0].trigger('change')

    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    const [body] = wrapper.emitted('confirm')![0] as [{ customerIds: number[] }]
    expect(body.customerIds).toEqual([1, 3])
  })

  it('joins today by default when the period has begun', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0].trigger('change')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    const [body] = wrapper.emitted('confirm')![0] as [{ joinDate: string }]
    expect(body.joinDate).toBe('2026-10-11')
  })

  it('joins at the start of a period that has not begun', async () => {
    const wrapper = mountPicker({ startDate: '2026-11-01', endDate: '2026-12-31' })
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0].trigger('change')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    const [body] = wrapper.emitted('confirm')![0] as [{ joinDate: string }]
    expect(body.joinDate).toBe('2026-11-01')
  })

  it('stops selecting at 500 and says so', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => i + 1)
    customerOptions.mockResolvedValue({
      data: customers(ids),
      meta: { total: 501, limit: 10, offset: 0 },
    })
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.find('.select-all').trigger('change')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    const [body] = wrapper.emitted('confirm')![0] as [{ customerIds: number[] }]
    expect(body.customerIds).toHaveLength(500)
    expect(wrapper.find('[data-testid="picker-cap"]').exists()).toBe(true)
  })
})
