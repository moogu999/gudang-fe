import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import GiroLinesTable from './GiroLinesTable.vue'
import { emptyGiroRow, type GiroRow } from '../giroReceiptLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

vi.mock('@/services', () => ({
  CustomersService: { list: vi.fn() },
}))

// The customer stand-in emits update:model-value then select-option back to back, like
// InfiniteSelect, and exposes the filters it was given.
const stubs = {
  DatePicker: { template: '<input class="date" />' },
  InputNumber: { template: '<input class="amount" />' },
  InfiniteSelect: {
    name: 'InfiniteSelect',
    props: ['modelValue', 'customFilters'],
    emits: ['update:modelValue', 'select-option'],
    template: `<div class="customer">
      <button class="pick" @click="$emit('update:modelValue', 7); $emit('select-option', { id: 7, name: 'Toko Sumber' })" />
    </div>`,
  },
}

function validRow(changes: Partial<GiroRow> = {}): GiroRow {
  return {
    ...emptyGiroRow(),
    giroNo: 'BG-1',
    issuingBank: 'BCA',
    customerId: 3,
    customer: { id: 3, name: 'Toko Tiga' },
    giroDate: new Date(2099, 0, 1),
    dueDate: new Date(2099, 0, 10),
    amount: 1000,
    ...changes,
  }
}

function mountTable(rows: GiroRow[], props: Record<string, unknown> = {}) {
  return mount(GiroLinesTable, {
    props: { modelValue: rows, ...props },
    global: { plugins: [PrimeVue], stubs },
  })
}

type Vm = { validate: () => boolean }
const lastEmit = (wrapper: ReturnType<typeof mountTable>) => {
  const all = wrapper.emitted('update:modelValue')!
  return all[all.length - 1][0] as GiroRow[]
}

describe('GiroLinesTable', () => {
  it('adding a giro appends a blank row', async () => {
    const existing = validRow()
    const wrapper = mountTable([existing])
    await wrapper.find('[data-testid="add-giro"]').trigger('click')
    const rows = lastEmit(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(existing)
    expect(rows[1].giroNo).toBe('')
  })

  it('removing a giro drops that row only', async () => {
    const a = validRow({ giroNo: 'A' })
    const b = validRow({ giroNo: 'B' })
    const wrapper = mountTable([a, b])
    await wrapper.findAll('[data-testid="remove-giro"]')[0].trigger('click')
    expect(lastEmit(wrapper)).toEqual([b])
  })

  it('a customer pick keeps both the id and the label (both emits land)', async () => {
    const wrapper = mountTable([emptyGiroRow()])
    await wrapper.find('.pick').trigger('click')
    const row = lastEmit(wrapper)[0]
    expect(row.customerId).toBe(7)
    expect(row.customer).toEqual({ id: 7, name: 'Toko Sumber' })
  })

  it('only lists giro-enabled customers (D12)', () => {
    const wrapper = mountTable([emptyGiroRow()])
    const select = wrapper.findComponent({ name: 'InfiniteSelect' })
    expect(select.props('customFilters')).toEqual([
      { filterBy: 'paysWithGiro', filterOperator: '0', filterValue: 'true' },
    ])
  })

  it('warns, without blocking, when a due date has already passed', () => {
    const wrapper = mountTable([
      validRow({ giroDate: new Date(2020, 0, 1), dueDate: new Date(2020, 0, 2) }),
    ])
    expect(wrapper.find('[data-testid="overdue-warning"]').exists()).toBe(true)
    expect((wrapper.vm as unknown as Vm).validate()).toBe(true)
  })

  it('flags both copies of a duplicate and fails validate()', () => {
    const wrapper = mountTable([validRow(), validRow({ issuingBank: 'bca' })])
    expect(wrapper.findAll('[data-testid="duplicate"]')).toHaveLength(2)
    expect((wrapper.vm as unknown as Vm).validate()).toBe(false)
  })

  it('validate() passes for valid rows and for no rows', () => {
    expect((mountTable([validRow()]).vm as unknown as Vm).validate()).toBe(true)
    expect((mountTable([]).vm as unknown as Vm).validate()).toBe(true)
  })

  it('shows the giro count in the subtotal', () => {
    const wrapper = mountTable([validRow(), validRow({ giroNo: 'BG-2', amount: 500 })])
    expect(wrapper.find('[data-testid="subtotal"]').text()).toBe('1,500.00')
  })
})
