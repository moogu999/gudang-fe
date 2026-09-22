import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArClearingSourceTable from './ArClearingSourceTable.vue'
import { commonStubs } from './dataTableStub'
import { toSourceRow, type SourceRow } from '../arClearingLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

function row(over: Partial<SourceRow> & { sourceLineId: number }): SourceRow {
  return toSourceRow({
    sourceType: 'cash_deposit',
    sourceDocumentId: 1,
    sourceDocumentNo: `CD-${over.sourceLineId}`,
    customerId: 1,
    sourceDate: '2026-09-01',
    amount: '1000',
    appliedAmount: '0',
    unappliedAmount: '1000',
    sourceDetail: 'adhoc',
    description: 'Setoran',
    ...over,
  })
}

const items = [row({ sourceLineId: 1 }), row({ sourceLineId: 2 })]

function mountTable(props: Partial<InstanceType<typeof ArClearingSourceTable>['$props']> = {}) {
  return mount(ArClearingSourceTable, {
    props: { customerId: 1, items, picked: [], ...props },
    global: { stubs: commonStubs },
  })
}

describe('ArClearingSourceTable', () => {
  it('emits the picked list with the row appended when a row is ticked', async () => {
    const wrapper = mountTable()
    await wrapper.findAll('.row-checkbox')[0].trigger('change')
    expect(wrapper.emitted('update:picked')![0][0]).toEqual([items[0]])
  })

  it('removes a row when it is unticked', async () => {
    const wrapper = mountTable({ picked: [items[0], items[1]] })
    await wrapper.findAll('.row-checkbox')[0].trigger('change')
    expect(wrapper.emitted('update:picked')![0][0]).toEqual([items[1]])
  })

  it('keeps ticked rows that are not in the current items (selection is owned by the parent)', async () => {
    const offPage = row({ sourceLineId: 99 })
    const wrapper = mountTable({ picked: [offPage] })
    await wrapper.findAll('.row-checkbox')[0].trigger('change')
    expect(wrapper.emitted('update:picked')![0][0]).toEqual([offPage, items[0]])
  })

  it('does not treat the same line id from another source type as the same row', async () => {
    const bank = row({ sourceLineId: 1, sourceType: 'bank_settlement', sourceDocumentNo: 'BS-1' })
    const wrapper = mountTable({ items: [items[0], bank], picked: [items[0]] })
    const boxes = wrapper.findAll('.row-checkbox')
    expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((boxes[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('select-all ticks every unticked row and un-select-all clears them', async () => {
    const wrapper = mountTable({ picked: [items[0]] })
    await wrapper.find('.select-all').trigger('change')
    expect(wrapper.emitted('update:picked')![0][0]).toEqual([items[0], items[1]])

    const all = mountTable({ picked: items })
    await all.find('.select-all').trigger('change')
    expect(all.emitted('update:picked')![0][0]).toEqual([])
  })

  it('shows the partially-allocated hint only when some row has a reduced remainder', () => {
    expect(mountTable().find('[data-testid="partial-hint"]').exists()).toBe(false)

    const partial = row({ sourceLineId: 3, amount: '1000', unappliedAmount: '400' })
    const wrapper = mountTable({ items: [items[0], partial] })
    expect(wrapper.find('[data-testid="partial-hint"]').exists()).toBe(true)
  })

  it('renders no checkboxes and no hint when readonly', () => {
    const partial = row({ sourceLineId: 3, amount: '1000', unappliedAmount: '400' })
    const wrapper = mountTable({ items: [partial], readonly: true })
    expect(wrapper.find('.row-checkbox').exists()).toBe(false)
    expect(wrapper.find('[data-testid="partial-hint"]').exists()).toBe(false)
  })

  it('asks for a customer first when none is chosen', () => {
    const wrapper = mountTable({ customerId: undefined })
    expect(wrapper.text()).toContain('arClearings.sources.selectCustomerFirst')
    expect(wrapper.find('.row').exists()).toBe(false)
  })
})
