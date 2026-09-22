import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BankSettlementSummary from './BankSettlementSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

const stubs = {
  global: { stubs: { Message: { template: '<div data-testid="hint"><slot /></div>' } } },
}

function mountSummary(props: Record<string, unknown>) {
  return mount(BankSettlementSummary, {
    props: { total: 0, tagged: 0, untagged: 0, ...props },
    ...stubs,
  })
}

describe('BankSettlementSummary', () => {
  it('renders the three cells', () => {
    const wrapper = mountSummary({ total: 1500, tagged: 1000, untagged: 500 })
    expect(wrapper.find('[data-testid="total"]').text()).toBe('1,500.00')
    expect(wrapper.find('[data-testid="tagged"]').text()).toBe('1,000.00')
    expect(wrapper.find('[data-testid="untagged"]').text()).toBe('500.00')
  })

  it('shows untagged in amber when some rows are untagged', () => {
    const wrapper = mountSummary({ total: 1500, tagged: 1000, untagged: 500 })
    expect(wrapper.find('[data-testid="untagged"]').classes()).toContain('text-amber-600')
  })

  it('renders untagged as 0 with neutral styling when everything is tagged', () => {
    const wrapper = mountSummary({ total: 1000, tagged: 1000, untagged: 0 })
    const untagged = wrapper.find('[data-testid="untagged"]')
    expect(untagged.text()).toBe('0.00')
    expect(untagged.classes()).not.toContain('text-amber-600')
  })

  it('in readonly mode renders the saved figures instead of recomputing', () => {
    const wrapper = mountSummary({
      readonly: true,
      total: 1,
      tagged: 1,
      untagged: 0,
      savedTotal: 900,
      savedTagged: 900,
      savedUntagged: 0,
    })
    expect(wrapper.find('[data-testid="total"]').text()).toBe('900.00')
    expect(wrapper.find('[data-testid="tagged"]').text()).toBe('900.00')
    expect(wrapper.find('[data-testid="hint"]').exists()).toBe(false)
  })
})
