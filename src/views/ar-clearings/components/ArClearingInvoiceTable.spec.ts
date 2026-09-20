import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArClearingInvoiceTable from './ArClearingInvoiceTable.vue'
import { commonStubs } from './dataTableStub'
import { toAllocationRow, type AllocationRow } from '../arClearingLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

function invoice(id: number, outstanding: string, ageDays: number, allocated = 0): AllocationRow {
  return toAllocationRow(
    {
      documentType: 'invoice',
      documentId: id,
      documentNo: `INV-${id}`,
      customerId: 1,
      customerName: 'Toko',
      documentDate: '2026-08-01',
      ageDays,
      totalAmount: outstanding,
      settledAmount: '0',
      outstandingAmount: outstanding,
    },
    allocated,
  )
}

function mountTable(rows: AllocationRow[], readonly = false) {
  return mount(ArClearingInvoiceTable, {
    props: { customerId: 1, rows, readonly },
    global: { stubs: commonStubs },
  })
}

describe('ArClearingInvoiceTable', () => {
  it('clamps an over-typed allocation to the invoice outstanding', async () => {
    const wrapper = mountTable([invoice(1, '500', 5), invoice(2, '300', 5)])
    await wrapper.findAll('.allocation')[0].setValue(9999)
    const emitted = wrapper.emitted('update:rows')![0][0] as AllocationRow[]
    expect(emitted.map((r) => r.allocated)).toEqual([500, 0])
  })

  it('clamps a negative allocation to zero', async () => {
    const wrapper = mountTable([invoice(1, '500', 5, 200)])
    await wrapper.find('.allocation').setValue(-50)
    const emitted = wrapper.emitted('update:rows')![0][0] as AllocationRow[]
    expect(emitted[0].allocated).toBe(0)
  })

  it('emits nothing when the value does not change (a zero row stays zero)', async () => {
    const wrapper = mountTable([invoice(1, '500', 5)])
    await wrapper.find('.allocation').setValue(0)
    expect(wrapper.emitted('update:rows')).toBeUndefined()
  })

  it('does not mutate the rows it was given', async () => {
    const rows = [invoice(1, '500', 5)]
    const wrapper = mountTable(rows)
    await wrapper.find('.allocation').setValue(100)
    expect(rows[0].allocated).toBe(0)
  })

  it('colours the age tag by severity at the band edges', () => {
    const wrapper = mountTable([
      invoice(1, '100', 14),
      invoice(2, '100', 15),
      invoice(3, '100', 60),
    ])
    const severities = wrapper
      .findAll('.tag')
      .filter((t) => t.text().includes('ageDays'))
      .map((t) => t.attributes('data-severity'))
    expect(severities).toEqual(['success', 'warn', 'danger'])
  })

  it('shows Partial and Full pills, and none for an untouched row', () => {
    const wrapper = mountTable([
      invoice(1, '100', 5, 0),
      invoice(2, '100', 5, 40),
      invoice(3, '100', 5, 100),
    ])
    expect(wrapper.find('[data-testid="state-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="state-2"]').text()).toBe('arClearings.allocation.partial')
    expect(wrapper.find('[data-testid="state-3"]').text()).toBe('arClearings.allocation.full')
  })

  it('renders the allocation as text, not an input, when readonly', () => {
    const wrapper = mountTable([invoice(1, '100', 5, 40)], true)
    expect(wrapper.find('.allocation').exists()).toBe(false)
    expect(wrapper.text()).toContain('40.00')
  })

  it('renders a dash instead of an age for a saved row that carries none', () => {
    const saved = { ...invoice(1, '100', 5, 40), ageDays: null }
    const wrapper = mountTable([saved], true)
    expect(wrapper.text()).not.toContain('ageDays')
  })
})
