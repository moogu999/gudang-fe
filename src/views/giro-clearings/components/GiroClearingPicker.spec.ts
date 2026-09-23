import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GiroClearingPicker from './GiroClearingPicker.vue'
import { commonStubs } from '@/views/ar-clearings/components/dataTableStub'
import type { GiroPick } from '../giroClearingLines'
import type { GiroRegisterRow } from '@/types/giroReceipt.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

const register = vi.fn()
vi.mock('@/services', () => ({
  GirosService: { register: (...args: unknown[]) => register(...args) },
}))

function registerRow(id: number, dueDate = '2026-09-23'): GiroRegisterRow {
  return {
    id,
    giroNo: `BG-${id}`,
    issuingBank: 'BCA',
    customerId: 1,
    customerName: 'Toko',
    receiptId: 1,
    receiptNo: 'PG-1',
    receiptDate: '2026-09-01',
    branchId: 1,
    giroDate: '2026-09-01',
    dueDate,
    daysToDue: 0,
    amount: '1000.00',
    appliedAmount: '0',
    status: 'held',
  }
}

const stubs = {
  ...commonStubs,
  ToggleSwitch: {
    name: 'ToggleSwitch',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="checkbox" class="toggle" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(GiroClearingPicker, {
    props: { branchId: 1, depositDate: new Date(2026, 8, 23), selected: [], ...props },
    global: { stubs },
  })
}

beforeEach(() => {
  register.mockReset()
  register.mockResolvedValue({ data: [registerRow(1)], meta: { total: 1 } })
})

describe('GiroClearingPicker', () => {
  it('loads held giros due by the day after the deposit date by default (D8)', async () => {
    mountPicker()
    await flushPromises()
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'held', branchId: 1, dueOnOrBefore: '2026-09-24' }),
    )
  })

  it('"show all held" drops the due-date window', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.find('.toggle').setValue(true)
    await flushPromises()
    expect(register).toHaveBeenLastCalledWith(
      expect.objectContaining({ bucket: 'held', dueOnOrBefore: undefined }),
    )
  })

  it("pre-selects a draft's giros, even one the current window hides", async () => {
    const saved: GiroPick = {
      giroId: 9,
      giroNo: 'BG-9',
      issuingBank: 'BCA',
      customerName: 'Toko',
      dueDate: '2026-12-01',
      amount: 500,
    }
    const wrapper = mountPicker({ selected: [saved] })
    await flushPromises()
    const boxes = wrapper.findAll('.row-checkbox')
    expect(boxes).toHaveLength(2)
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('[data-testid="not-yet-due"]').exists()).toBe(true)
  })

  it('ticking a row emits the selection keyed by giro id', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.find('.row-checkbox').trigger('change')
    const picked = wrapper.emitted('update:selected')![0][0] as GiroPick[]
    expect(picked.map((p) => p.giroId)).toEqual([1])
    expect(picked[0].amount).toBe(1000)
  })

  it('reloadAndPrune() drops picks that are no longer held', async () => {
    const stale: GiroPick = { ...registerRow(5), giroId: 5, amount: 1000 } as unknown as GiroPick
    const kept: GiroPick = { ...registerRow(1), giroId: 1, amount: 1000 } as unknown as GiroPick
    const wrapper = mountPicker({ selected: [kept, stale] })
    await flushPromises()
    const dropped = await (
      wrapper.vm as unknown as { reloadAndPrune: () => Promise<number> }
    ).reloadAndPrune()
    expect(dropped).toBe(1)
    const last = wrapper.emitted('update:selected')!.at(-1)![0] as GiroPick[]
    expect(last.map((p) => p.giroId)).toEqual([1])
  })
})
