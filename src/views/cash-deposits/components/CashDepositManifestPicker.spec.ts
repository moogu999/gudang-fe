import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, defineComponent, type VNode } from 'vue'
import CashDepositManifestPicker from './CashDepositManifestPicker.vue'
import type { ManifestCandidate, ManifestCandidateResponse } from '@/types/cashDeposit.type'
import type { PickedInvoiceLine } from '../cashDepositLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

function candidate(id: number, remaining: string, deposited = '0'): ManifestCandidate {
  return {
    invoiceId: id,
    invoiceNo: `INV-${id}`,
    deliveryOrderNo: `DO-${id}`,
    customerId: 1,
    customerName: 'Toko Makmur',
    invoiceDate: '2026-09-18',
    ageDays: 2,
    totalAmount: String(Number(remaining) + Number(deposited)),
    alreadyDepositedAmount: deposited,
    remainingAmount: remaining,
  }
}

const manifestCandidates = vi.fn()

vi.mock('@/services', () => ({
  CashDepositsService: { manifestCandidates: (...args: unknown[]) => manifestCandidates(...args) },
}))

function respond(
  mode: ManifestCandidateResponse['mode'],
  data: ManifestCandidate[],
  total = data.length,
): ManifestCandidateResponse {
  return { mode, data, meta: { total, limit: 10, offset: 0 } }
}

interface RowLike {
  invoiceId: number
}

// See ApPaymentOpenItemPicker.spec.ts: PrimeVue's DataTable calls each Column's #body slot
// itself, so a template-only stub can't forward per-row data — this one reads the slots off
// the Column vnodes directly.
const DataTableStub = defineComponent({
  name: 'DataTable',
  props: ['value', 'selection'],
  emits: ['row-select', 'row-unselect', 'select-all-change', 'page'],
  setup(props, { slots, emit }) {
    return () => {
      const columnVNodes = (slots.default?.() ?? []) as VNode[]
      const rows = (props.value as RowLike[]).map((item) => {
        const selected = (props.selection as RowLike[]).some((s) => s.invoiceId === item.invoiceId)
        const bodies = columnVNodes.map((col) => {
          const bodySlot = (col.children as Record<string, unknown> | null)?.body as
            | ((scope: { data: RowLike }) => VNode[])
            | undefined
          return bodySlot ? bodySlot({ data: item }) : null
        })
        return h('div', { class: 'row', key: item.invoiceId }, [
          h('input', {
            type: 'checkbox',
            class: 'row-checkbox',
            checked: selected,
            onChange: () => emit(selected ? 'row-unselect' : 'row-select', { data: item }),
          }),
          ...bodies,
        ])
      })
      return h('div', {}, rows)
    }
  },
})

const stubs = {
  global: {
    stubs: {
      Message: { name: 'Message', template: '<div class="message"><slot /></div>' },
      Tag: { name: 'Tag', props: ['value'], template: '<span class="tag">{{ value }}</span>' },
      InputText: { name: 'InputText', template: '<input />' },
      InputNumber: {
        name: 'InputNumber',
        props: ['modelValue', 'disabled', 'max'],
        emits: ['update:modelValue'],
        template:
          '<input class="amount" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
      DataTable: DataTableStub,
    },
  },
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(CashDepositManifestPicker, {
    props: { employeeId: 7, depositDate: '2026-09-20', ...props },
    ...stubs,
  })
}

function lastLines(wrapper: ReturnType<typeof mountPicker>): PickedInvoiceLine[] {
  const emitted = wrapper.emitted('update:lines')!
  return emitted[emitted.length - 1][0] as PickedInvoiceLine[]
}

describe('CashDepositManifestPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('driver mode pre-ticks every row, defaulting each amount to its remaining amount', async () => {
    manifestCandidates.mockResolvedValue(
      respond('driver', [candidate(1, '1000000'), candidate(2, '250000')]),
    )
    const wrapper = mountPicker()
    await flushPromises()

    const lines = lastLines(wrapper)
    expect(lines.map((l) => [l.invoiceId, l.amount])).toEqual([
      [1, 1000000],
      [2, 250000],
    ])
  })

  it('driver mode does not pre-tick when editing a saved draft', async () => {
    manifestCandidates.mockResolvedValue(respond('driver', [candidate(1, '1000')]))
    const wrapper = mountPicker({ preselect: false })
    await flushPromises()

    expect(lastLines(wrapper)).toHaveLength(0)
  })

  it('collector mode starts with every row unticked', async () => {
    manifestCandidates.mockResolvedValue(
      respond('collector', [candidate(1, '1000'), candidate(2, '2000')]),
    )
    const wrapper = mountPicker()
    await flushPromises()

    expect(lastLines(wrapper)).toHaveLength(0)
    expect(wrapper.emitted('update:mode')!.at(-1)).toEqual(['collector'])
  })

  it('renders nothing for an ad-hoc-only employee', async () => {
    manifestCandidates.mockResolvedValue(respond('adhoc', []))
    const wrapper = mountPicker()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(false)
    expect(wrapper.emitted('update:mode')!.at(-1)).toEqual(['adhoc'])
  })

  it('clamps an edited amount to the remaining amount', async () => {
    manifestCandidates.mockResolvedValue(respond('collector', [candidate(1, '1000')]))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.find('.row-checkbox').trigger('change')
    await flushPromises()
    await wrapper.find('.amount').setValue(9999)
    await flushPromises()

    expect(lastLines(wrapper)[0].amount).toBe(1000)
  })

  it('flips the row pill from partial to paid at the remaining amount', async () => {
    manifestCandidates.mockResolvedValue(respond('collector', [candidate(1, '1000')]))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.find('.row-checkbox').trigger('change')
    await flushPromises()
    expect(wrapper.text()).toContain('cashDeposits.picker.lineStatus.paid')

    await wrapper.find('.amount').setValue(400)
    await flushPromises()
    expect(wrapper.text()).toContain('cashDeposits.picker.lineStatus.partial')
    expect(wrapper.text()).not.toContain('cashDeposits.picker.lineStatus.paid')
  })

  it('keeps ticked rows across a page change', async () => {
    manifestCandidates.mockResolvedValueOnce(respond('collector', [candidate(1, '1000')], 2))
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.find('.row-checkbox').trigger('change')
    await flushPromises()

    manifestCandidates.mockResolvedValueOnce(respond('collector', [candidate(2, '2000')], 2))
    wrapper.findComponent({ name: 'DataTable' }).vm.$emit('page', { page: 1, rows: 10 })
    await flushPromises()

    expect(lastLines(wrapper).map((l) => l.invoiceId)).toEqual([1])
  })

  it('seeds ticked rows from the saved lines of a draft', async () => {
    manifestCandidates.mockResolvedValue(respond('collector', [candidate(1, '1000')]))
    const wrapper = mountPicker({
      preselect: false,
      initialLines: [
        {
          id: 9,
          lineType: 'invoice',
          invoiceId: 1,
          invoiceNo: 'INV-1',
          customerId: null,
          customerName: 'Toko Makmur',
          outletName: null,
          categoryId: null,
          categoryName: null,
          note: null,
          referenceAmount: '1000',
          amount: '600',
        },
      ],
    })
    await flushPromises()

    expect(lastLines(wrapper).map((l) => [l.invoiceId, l.amount])).toEqual([[1, 600]])
  })
})
