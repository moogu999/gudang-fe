import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ReasonDialog from './ReasonDialog.vue'
import DialogMode from '@/constants/dialogMode'
import { ApiError } from '@/types/api.type'
import type { Reason } from '@/types'

const { preview, create, update } = vi.hoisted(() => ({
  preview: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/services', () => ({
  NumberSeriesService: { preview },
  ReasonsService: { create, update },
}))

function reason(overrides: Partial<Reason> = {}): Reason {
  return {
    id: 5,
    code: 'RTR-01',
    type: 'return',
    name: 'Expired',
    forTakingOrder: true,
    forCanvass: true,
    requiresPhoto: false,
    requiresNote: false,
    defaultStockType: 'bad',
    sortOrder: 1,
    isActive: true,
    createdAt: '2026-10-10T00:00:00Z',
    ...overrides,
  }
}

function mountDialog(props: Record<string, unknown>) {
  return mount(ReasonDialog, {
    props,
    global: { plugins: [PrimeVue, ToastService] },
  })
}

async function fillName(wrapper: ReturnType<typeof mountDialog>, value: string) {
  await wrapper.get('#name').setValue(value)
}

beforeEach(() => {
  vi.clearAllMocks()
  preview.mockResolvedValue({ code: 'OTO-01', seriesId: 1 })
})

describe('ReasonDialog', () => {
  it('asks for the preview of the current type and again when the type changes', async () => {
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'customer_no_order' })
    await flushPromises()
    expect(preview).toHaveBeenLastCalledWith('reasons.customer_no_order')
    ;(wrapper.vm as unknown as { $: { setupState: { type: string } } }).$.setupState.type =
      'skipped_visit'
    await flushPromises()
    expect(preview).toHaveBeenLastCalledWith('reasons.skipped_visit')
  })

  it('shows the stock type only for return reasons', async () => {
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'customer_no_order' })
    await flushPromises()
    expect(wrapper.find('input[name="defaultStockType"]').exists()).toBe(false)

    const other = mountDialog({ mode: DialogMode.ADD, initialType: 'return' })
    await flushPromises()
    expect(other.find('input[name="defaultStockType"]').exists()).toBe(true)
  })

  it('locks the type when editing', async () => {
    const wrapper = mountDialog({ mode: DialogMode.EDIT, reason: reason() })
    await flushPromises()
    expect(wrapper.find('[aria-disabled="true"]').exists()).toBe(true)
    expect(preview).not.toHaveBeenCalled()
  })

  it('blocks submit with no employee type', async () => {
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'customer_no_order' })
    await flushPromises()
    await fillName(wrapper, 'Toko tutup')
    await wrapper.get('#forTakingOrder').setValue(false)
    await wrapper.get('#forCanvass').setValue(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('reasons.validation.noEmployeeType')
  })

  it('blocks a return reason without a stock type', async () => {
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'return' })
    await flushPromises()
    await fillName(wrapper, 'Expired')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('reasons.validation.stockTypeRequired')
  })

  it('omits the code in Auto mode', async () => {
    create.mockResolvedValue(reason())
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'customer_no_order' })
    await flushPromises()
    await fillName(wrapper, ' Toko tutup ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({
      type: 'customer_no_order',
      name: 'Toko tutup',
      forTakingOrder: true,
      forCanvass: true,
      requiresPhoto: false,
      requiresNote: false,
    })
    expect(wrapper.emitted('close')?.[0]).toEqual([true])
  })

  it('shows a name_duplicate conflict on the name field', async () => {
    create.mockRejectedValue(new ApiError('dup', 409, 'name_duplicate'))
    const wrapper = mountDialog({ mode: DialogMode.ADD, initialType: 'customer_no_order' })
    await flushPromises()
    await fillName(wrapper, 'Toko tutup')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('reasons.errors.nameDuplicate')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
