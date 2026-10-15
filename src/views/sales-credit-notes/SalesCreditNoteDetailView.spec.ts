import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SalesCreditNoteDetailView from './SalesCreditNoteDetailView.vue'
import { ApiError } from '@/types/api.type'
import type { SalesCreditNoteDetail } from '@/types'

const hasPermission = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const updateTaxReference = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ params: { id: '7' } }),
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/composables', () => ({ usePermissions: () => ({ hasPermission }) }))
vi.mock('@/services', () => ({
  SalesCreditNotesService: { get, updateTaxReference },
  commonErrorToast: (e: unknown) => ({ detail: String(e) }),
  commonSuccessToast: (m: string) => ({ detail: m }),
}))

const note: SalesCreditNoteDetail = {
  id: 7,
  no: 'SCN-1',
  noteDate: '2026-10-01',
  postedAt: '2026-10-01T03:00:00Z',
  deliveryOrder: { id: 1, code: 'DO-1' },
  salesOrder: { id: 2, code: 'SO-1' },
  customer: { id: 3, code: 'C1', name: 'Toko' },
  branch: { id: 1, name: 'Main' },
  company: { id: 1, name: 'Co' },
  salesman: { id: 4, name: 'Fajar' },
  subtotalAmount: '1000.00',
  discountAmount: '0.00',
  taxBaseAmount: '1000.00',
  taxAmount: '110.00',
  totalAmount: '1110.00',
  appliedAmount: '110.00',
  outstandingAmount: '1000.00',
  taxReturnNoteNo: 'NR-1',
  lines: [],
}

const stubs = {
  Toast: true,
  ResponsiveCard: { template: '<div><slot name="content" /></div>' },
  DataTable: true,
  Column: true,
  Divider: true,
  Tag: true,
  Message: { template: '<div class="msg"><slot /></div>' },
  Button: {
    props: ['label'],
    template: '<button v-bind="$attrs">{{ label }}</button>',
  },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}

async function mountView() {
  const wrapper = mount(SalesCreditNoteDetailView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('SalesCreditNoteDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasPermission.mockReturnValue(true)
    get.mockResolvedValue(note)
  })

  it('shows the edit pencil only with the write permission', async () => {
    expect((await mountView()).find('[data-testid="tax-ref-edit"]').exists()).toBe(true)
    hasPermission.mockReturnValue(false)
    expect((await mountView()).find('[data-testid="tax-ref-edit"]').exists()).toBe(false)
  })

  it('names the linked sales order and return delivery order by their codes', async () => {
    const text = (await mountView()).text()
    expect(text).toContain('SO-1')
    expect(text).toContain('DO-1')
  })

  it('shows the outstanding amount from the response', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="outstanding"]').text()).toBe('1.000')
  })

  it('clears the reference by omitting the key when saved empty', async () => {
    updateTaxReference.mockResolvedValue({ ...note, taxReturnNoteNo: undefined })
    const wrapper = await mountView()
    await wrapper.find('[data-testid="tax-ref-edit"]').trigger('click')
    await wrapper.find('[data-testid="tax-ref-input"]').setValue('   ')
    await wrapper.find('[data-testid="tax-ref-save"]').trigger('click')
    await flushPromises()
    expect(updateTaxReference).toHaveBeenCalledWith(7, {})
    expect(wrapper.find('[data-testid="tax-ref"]').text()).toBe('-')
  })

  it('shows a field error on a duplicate reference', async () => {
    updateTaxReference.mockRejectedValue(new ApiError('dup', 409, 'DUPLICATE_TAX_RETURN_NOTE_NO'))
    const wrapper = await mountView()
    await wrapper.find('[data-testid="tax-ref-edit"]').trigger('click')
    await wrapper.find('[data-testid="tax-ref-input"]').setValue('NR-2')
    await wrapper.find('[data-testid="tax-ref-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('salesCreditNotes.validation.duplicateTaxReturnNoteNo')
  })
})
