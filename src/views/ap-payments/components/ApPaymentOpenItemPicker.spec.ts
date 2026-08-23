import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, defineComponent, type VNode } from 'vue'
import ApPaymentOpenItemPicker from './ApPaymentOpenItemPicker.vue'
import type { ApOutstandingItem } from '@/types/apOutstanding.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en-US' },
  }),
}))

const rows: ApOutstandingItem[] = [
  {
    documentType: 'ap_invoice',
    documentId: 1,
    documentNo: 'INV-001',
    supplierId: 1,
    supplierName: 'PT Nutrifood Indonesia',
    documentDate: '2026-07-01',
    dueDate: '2026-08-01',
    signedTotalAmount: '5000000',
    settledAmount: '0',
    outstandingAmount: '5000000',
  },
  {
    documentType: 'credit_note',
    documentId: 2,
    documentNo: 'CN-001',
    supplierId: 1,
    supplierName: 'PT Nutrifood Indonesia',
    documentDate: '2026-07-05',
    dueDate: '2026-07-05',
    signedTotalAmount: '-1200000',
    settledAmount: '0',
    outstandingAmount: '-1200000',
  },
]

vi.mock('@/services', () => ({
  ApOutstandingService: {
    list: vi.fn(async () => ({
      data: rows,
      meta: { total: rows.length, limit: 10, offset: 0 },
    })),
  },
}))

interface RowLike {
  documentId: number
  documentType: string
}

function isSameRow(a: RowLike, b: RowLike): boolean {
  return a.documentId === b.documentId && a.documentType === b.documentType
}

/**
 * Real PrimeVue DataTable invokes each <Column>'s #body scoped slot once per row
 * itself — the parent template never gets a `v-slot` handle on that per-row data,
 * so a template-only stub can't forward it. This stub instead reads each Column
 * vnode's `body` slot function straight off `slots.default()` and calls it per
 * row directly, which is the same mechanism DataTable itself uses.
 */
const DataTableStub = defineComponent({
  name: 'DataTable',
  props: ['value', 'selection'],
  emits: ['row-select', 'row-unselect', 'select-all-change', 'page'],
  setup(props, { slots, emit }) {
    return () => {
      const columnVNodes = (slots.default?.() ?? []) as VNode[]
      const rows = (props.value as RowLike[]).map((item) => {
        const selected = (props.selection as RowLike[]).some((s) => isSameRow(s, item))
        const bodies = columnVNodes.map((col) => {
          const bodySlot = (col.children as Record<string, unknown> | null)?.body as
            | ((scope: { data: RowLike }) => VNode[])
            | undefined
          return bodySlot ? bodySlot({ data: item }) : null
        })
        return h('div', { class: 'row', key: `${item.documentType}-${item.documentId}` }, [
          h('input', {
            type: 'checkbox',
            class: 'row-checkbox',
            checked: selected,
            onChange: () => emit(selected ? 'row-unselect' : 'row-select', { data: item }),
          }),
          ...bodies,
        ])
      })
      const empty = (props.value as RowLike[]).length === 0 && slots.empty ? slots.empty() : null
      return h('div', {}, [...rows, empty])
    }
  },
})

const globalStubs = {
  global: {
    stubs: {
      Message: { name: 'Message', template: '<div class="message"><slot /></div>' },
      Tag: { name: 'Tag', props: ['value'], template: '<span class="tag">{{ value }}</span>' },
      InputNumber: {
        name: 'InputNumber',
        props: ['modelValue', 'disabled', 'min', 'max'],
        emits: ['update:modelValue'],
        template:
          '<input class="applied-amount" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
      DataTable: DataTableStub,
    },
  },
}

function mountPicker(props: { supplierId?: number; branchId?: number } = {}) {
  return mount(ApPaymentOpenItemPicker, {
    props: { supplierId: 1, ...props },
    ...globalStubs,
  })
}

describe('ApPaymentOpenItemPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an editable amount input for an invoice row, seeded with the full outstanding on tick', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.find('.row-checkbox').trigger('change')
    await flushPromises()

    const emitted = wrapper.emitted('update:applications')
    expect(emitted).toBeTruthy()
    const last = emitted![emitted!.length - 1][0] as Array<{
      documentType: string
      documentId: number
      appliedAmount: number
    }>
    const invoiceRow = last.find((a) => a.documentType === 'ap_invoice')
    expect(invoiceRow?.appliedAmount).toBe(5000000)
  })

  it('clamps an edited amount at the row outstanding', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    // Tick the invoice row first.
    await wrapper.find('.row-checkbox').trigger('change')
    await flushPromises()

    const input = wrapper.find('.applied-amount')
    expect(input.exists()).toBe(true)
    await input.setValue(9999999)
    await flushPromises()

    const emitted = wrapper.emitted('update:applications')
    const last = emitted![emitted!.length - 1][0] as Array<{
      documentType: string
      appliedAmount: number
    }>
    const invoiceRow = last.find((a) => a.documentType === 'ap_invoice')
    expect(invoiceRow?.appliedAmount).toBe(5000000)
  })

  it('renders no editable input for a credit-note row, ticked or not', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    // Only the invoice row (index 0) ever gets an InputNumber.
    expect(wrapper.findAllComponents({ name: 'InputNumber' })).toHaveLength(1)

    const checkboxes = wrapper.findAll('.row-checkbox')
    await checkboxes[1].trigger('change') // tick the credit-note row
    await flushPromises()

    // Still exactly one InputNumber — ticking the credit-note row does not add one.
    expect(wrapper.findAllComponents({ name: 'InputNumber' })).toHaveLength(1)
  })

  it('clears the amount when a row is unticked', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    const checkboxes = wrapper.findAll('.row-checkbox')
    await checkboxes[0].trigger('change')
    await flushPromises()
    await checkboxes[0].trigger('change')
    await flushPromises()

    const emitted = wrapper.emitted('update:applications')
    const last = emitted![emitted!.length - 1][0] as unknown[]
    expect(last).toHaveLength(0)
  })

  it('seeds the credit-note magnitude as a positive appliedAmount on tick', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    const checkboxes = wrapper.findAll('.row-checkbox')
    await checkboxes[1].trigger('change')
    await flushPromises()

    const emitted = wrapper.emitted('update:applications')
    const last = emitted![emitted!.length - 1][0] as Array<{
      documentType: string
      appliedAmount: number
    }>
    const creditRow = last.find((a) => a.documentType === 'credit_note')
    expect(creditRow?.appliedAmount).toBe(1200000)
  })
})
