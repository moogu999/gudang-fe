import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import BankSettlementMutationTable from './BankSettlementMutationTable.vue'
import { newMutationRow, type MutationRow, type Period } from '../bankSettlementLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

vi.mock('@/services', () => ({
  CustomersService: { list: vi.fn() },
}))

const period: Period = [new Date(2026, 8, 1), new Date(2026, 8, 15)]

// Minimal native stand-ins that still emit the events the real controls do. The outlet
// stand-in emits update:model-value then select-option back to back, like InfiniteSelect.
const stubs = {
  DatePicker: { template: '<input class="date" />' },
  InputNumber: { template: '<input class="amount" />' },
  InfiniteSelect: {
    name: 'InfiniteSelect',
    props: ['modelValue'],
    emits: ['update:modelValue', 'select-option'],
    template: `<div class="outlet">
      <button class="pick" @click="$emit('update:modelValue', 7); $emit('select-option', { id: 7, name: 'Toko Sumber' })" />
      <button class="clear" @click="$emit('update:modelValue', null)" />
    </div>`,
  },
}

function validRow(changes: Partial<MutationRow> = {}): MutationRow {
  return {
    ...newMutationRow(),
    mutationDate: new Date(2026, 8, 10),
    description: 'TRSF',
    amount: 1000,
    ...changes,
  }
}

function mountTable(rows: MutationRow[], props: Record<string, unknown> = {}) {
  return mount(BankSettlementMutationTable, {
    props: { modelValue: rows, period, ...props },
    global: { plugins: [PrimeVue], stubs },
  })
}

type Vm = { validate: () => boolean }
const lastEmit = (wrapper: ReturnType<typeof mountTable>) => {
  const all = wrapper.emitted('update:modelValue')!
  return all[all.length - 1][0] as MutationRow[]
}

describe('BankSettlementMutationTable', () => {
  it('validate() fails for a row dated outside the period (D9)', () => {
    const wrapper = mountTable([validRow({ mutationDate: new Date(2026, 8, 20) })])
    expect((wrapper.vm as unknown as Vm).validate()).toBe(false)
  })

  it('validate() fails for a zero amount (D3)', () => {
    const wrapper = mountTable([validRow({ amount: 0 })])
    expect((wrapper.vm as unknown as Vm).validate()).toBe(false)
  })

  it('validate() passes for valid rows, tagged or not, and for no rows', () => {
    expect(
      (mountTable([validRow(), validRow({ customerId: 3 })]).vm as unknown as Vm).validate(),
    ).toBe(true)
    expect((mountTable([]).vm as unknown as Vm).validate()).toBe(true)
  })

  it('shows an out-of-period date error immediately, without waiting for submit', () => {
    const wrapper = mountTable([validRow({ mutationDate: new Date(2026, 8, 20) })])
    expect(wrapper.text()).toContain('bankSettlements.validation.lineDateOutOfPeriod')
  })

  it('adding a row appends a blank row', async () => {
    const existing = validRow()
    const wrapper = mountTable([existing])
    await wrapper.find('[data-testid="add-row"]').trigger('click')
    const rows = lastEmit(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(existing)
    expect(rows[1].amount).toBeNull()
  })

  it('deleting removes the right index', async () => {
    const wrapper = mountTable([
      validRow({ description: 'a' }),
      validRow({ description: 'b' }),
      validRow({ description: 'c' }),
    ])
    await wrapper.findAll('[data-testid="remove-row"]')[1].trigger('click')
    expect(lastEmit(wrapper).map((r) => r.description)).toEqual(['a', 'c'])
  })

  it('picking an outlet tags the row, keeping both back-to-back emits', async () => {
    const wrapper = mountTable([validRow()])
    expect(wrapper.find('[data-testid="status-untagged"]').exists()).toBe(true)
    await wrapper.find('.pick').trigger('click')
    const row = lastEmit(wrapper)[0]
    expect(row.customerId).toBe(7)
    expect(row.customer).toEqual({ id: 7, name: 'Toko Sumber' })
    await wrapper.setProps({ modelValue: lastEmit(wrapper) })
    expect(wrapper.find('[data-testid="status-tagged"]').exists()).toBe(true)
  })

  it('clearing the outlet flips the row back to untagged', async () => {
    const wrapper = mountTable([validRow({ customerId: 7, customer: { id: 7, name: 'Toko' } })])
    expect(wrapper.find('[data-testid="status-tagged"]').exists()).toBe(true)
    await wrapper.find('.clear').trigger('click')
    const row = lastEmit(wrapper)[0]
    expect(row.customerId).toBeUndefined()
    expect(row.customer).toBeUndefined()
    await wrapper.setProps({ modelValue: lastEmit(wrapper) })
    expect(wrapper.find('[data-testid="status-untagged"]').exists()).toBe(true)
  })

  it('renders text instead of inputs in readonly mode', () => {
    const wrapper = mountTable(
      [
        validRow({
          description: 'GIRO MASUK',
          customerId: 3,
          customer: { id: 3, name: 'Toko Baru' },
        }),
      ],
      {
        readonly: true,
      },
    )
    expect(wrapper.find('[data-testid="add-row"]').exists()).toBe(false)
    expect(wrapper.find('.outlet').exists()).toBe(false)
    expect(wrapper.find('.amount').exists()).toBe(false)
    expect(wrapper.text()).toContain('GIRO MASUK')
    expect(wrapper.text()).toContain('Toko Baru')
  })
})
