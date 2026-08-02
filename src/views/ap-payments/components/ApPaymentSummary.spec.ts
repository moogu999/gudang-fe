import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApPaymentSummary, { type SummaryApplication } from './ApPaymentSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const globalStubs = {
  global: {
    stubs: {
      Divider: { name: 'Divider', template: '<hr />' },
    },
  },
}

interface Props {
  applications: SummaryApplication[]
  readonly?: boolean
  savedGrossAmount?: number
  savedCreditAmount?: number
  savedNetAmount?: number
}

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    applications: [],
    ...overrides,
  }
}

function mountSummary(overrides: Partial<Props> = {}) {
  return mount(ApPaymentSummary, { props: baseProps(overrides), ...globalStubs })
}

const mixedRows: SummaryApplication[] = [
  { documentType: 'ap_invoice', appliedAmount: 5000000 },
  { documentType: 'ap_invoice', appliedAmount: 2500000 },
  { documentType: 'debit_note', appliedAmount: 300000 },
  { documentType: 'credit_note', appliedAmount: 1200000 },
]

describe('ApPaymentSummary', () => {
  it('sums invoices and debit notes into gross', () => {
    const wrapper = mountSummary({ applications: mixedRows })
    expect(wrapper.text()).toContain('7,800,000.00')
  })

  it('sums credit notes into credit', () => {
    const wrapper = mountSummary({ applications: mixedRows })
    expect(wrapper.text()).toContain('1,200,000.00')
  })

  it('computes net as gross minus credit', () => {
    const wrapper = mountSummary({ applications: mixedRows })
    // 7,800,000 - 1,200,000 = 6,600,000
    expect(wrapper.text()).toContain('6,600,000.00')
  })

  it('renders zero for an empty picker', () => {
    const wrapper = mountSummary({ applications: [] })
    expect(wrapper.text()).toContain('0.00')
  })

  it('renders the saved server figures verbatim in VIEW mode, ignoring live applications', () => {
    const wrapper = mountSummary({
      readonly: true,
      applications: mixedRows,
      savedGrossAmount: 1,
      savedCreditAmount: 2,
      savedNetAmount: 3,
    })
    expect(wrapper.text()).toContain('1.00')
    expect(wrapper.text()).toContain('2.00')
    expect(wrapper.text()).toContain('3.00')
    expect(wrapper.text()).not.toContain('7,800,000.00')
  })

  it('is purely derived — emits nothing', () => {
    const wrapper = mountSummary({ applications: mixedRows })
    expect(wrapper.emitted()).toEqual({})
  })
})
