import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GiroReceiptSummary from './GiroReceiptSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'en-US' },
  }),
}))

const stubs = {
  global: {
    stubs: {
      InputNumber: {
        name: 'InputNumber',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
          '<input :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
    },
  },
}

function mountSummary(props: Record<string, unknown>) {
  return mount(GiroReceiptSummary, {
    props: {
      recorded: { count: 2, amount: 3000 },
      actualCount: null,
      actualAmount: null,
      ...props,
    },
    ...stubs,
  })
}

describe('GiroReceiptSummary', () => {
  it('shows a zero variance until anything is verified', () => {
    const wrapper = mountSummary({})
    expect(wrapper.find('[data-testid="variance-count"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="variance-amount"]').text()).toBe('0.00')
  })

  it('shows a count variance on its own', () => {
    const wrapper = mountSummary({ actualCount: 3 })
    expect(wrapper.find('[data-testid="variance-count"]').text()).toBe('+1')
    expect(wrapper.find('[data-testid="variance-count"]').classes()).toContain('text-amber-600')
    expect(wrapper.find('[data-testid="variance-amount"]').text()).toBe('0.00')
  })

  it('shows an amount shortfall with a leading minus', () => {
    const wrapper = mountSummary({ actualCount: 2, actualAmount: 2500 })
    expect(wrapper.find('[data-testid="variance-amount"]').text()).toBe('-500.00')
    expect(wrapper.find('[data-testid="variance-count"]').classes()).toContain('text-green-700')
  })

  it('emits the verified values as they are typed', async () => {
    const wrapper = mountSummary({})
    await wrapper.find('[data-testid="actual-count-input"]').setValue('2')
    await wrapper.find('[data-testid="actual-amount-input"]').setValue('3000')
    expect(wrapper.emitted('update:actualCount')![0]).toEqual([2])
    expect(wrapper.emitted('update:actualAmount')![0]).toEqual([3000])
  })

  it('renders the saved figures verbatim when read-only', () => {
    const wrapper = mountSummary({
      readonly: true,
      savedRecorded: { count: 2, amount: 3000 },
      savedActual: { count: 1, amount: 1000 },
      savedVariance: { count: -1, amount: -2000 },
    })
    expect(wrapper.find('[data-testid="variance-count"]').text()).toBe('-1')
    expect(wrapper.find('[data-testid="variance-amount"]').text()).toBe('-2,000.00')
    expect(wrapper.find('[data-testid="actual-count-input"]').exists()).toBe(false)
  })
})
