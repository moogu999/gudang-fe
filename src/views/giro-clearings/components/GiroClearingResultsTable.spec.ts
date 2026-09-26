import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GiroClearingResultsTable from './GiroClearingResultsTable.vue'
import { commonStubs } from '@/views/ar-clearings/components/dataTableStub'
import type { ResultRow } from '../giroClearingLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'en-US' },
  }),
}))

const stubs = {
  ...commonStubs,
  RouterLink: { template: '<a><slot /></a>' },
  Select: {
    name: 'Select',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<span class="result-select">
      <button class="clear-it" @click="$emit('update:modelValue', 'cleared')" />
      <button class="reject-it" @click="$emit('update:modelValue', 'rejected')" />
    </span>`,
  },
  InputText: {
    name: 'InputText',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="note" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}

function row(over: Partial<ResultRow> & { lineId: number }): ResultRow {
  return {
    giroNo: `BG-${over.lineId}`,
    issuingBank: 'BCA',
    customerName: 'Toko',
    amount: 1000,
    savedResult: 'pending',
    result: '',
    note: '',
    ...over,
  }
}

function mountTable(rows: ResultRow[]) {
  return mount(GiroClearingResultsTable, { props: { modelValue: rows }, global: { stubs } })
}

type Vm = { validate: () => boolean }

describe('GiroClearingResultsTable', () => {
  it('renders a resolved line read-only, with no result picker', () => {
    const wrapper = mountTable([
      row({ lineId: 1, savedResult: 'cleared', savedResultDate: '2026-09-24' }),
    ])
    expect(wrapper.find('[data-testid="resolved"]').exists()).toBe(true)
    expect(wrapper.find('.result-select').exists()).toBe(false)
    expect(wrapper.find('.note').exists()).toBe(false)
  })

  it('choosing a result emits it for that line', async () => {
    const wrapper = mountTable([row({ lineId: 1 }), row({ lineId: 2 })])
    await wrapper.findAll('.reject-it')[1].trigger('click')
    const rows = wrapper.emitted('update:modelValue')![0][0] as ResultRow[]
    expect(rows.map((r) => r.result)).toEqual(['', 'rejected'])
  })

  it('requires a note on a rejected line', () => {
    const wrapper = mountTable([row({ lineId: 1, result: 'rejected' })])
    expect((wrapper.vm as unknown as Vm).validate()).toBe(false)
    const ok = mountTable([row({ lineId: 1, result: 'rejected', note: 'Dana kurang' })])
    expect((ok.vm as unknown as Vm).validate()).toBe(true)
  })

  it('shows live cleared/rejected totals and the callouts', () => {
    const wrapper = mountTable([
      row({ lineId: 1, result: 'cleared', amount: 1500 }),
      row({ lineId: 2, result: 'rejected', amount: 700 }),
      row({ lineId: 3, savedResult: 'cleared', amount: 9999 }),
    ])
    const totals = wrapper.find('[data-testid="live-totals"]').text()
    expect(totals).toContain('"amount":"1,500.00"')
    expect(totals).toContain('"amount":"700.00"')
    expect(wrapper.findAll('[data-testid="rejected-callout"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="cleared-callout"]').text()).toContain('"n":1')
  })
})
