import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CashDepositSummary from './CashDepositSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

const stubs = {
  global: {
    stubs: {
      InputNumber: {
        name: 'InputNumber',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
          '<input class="actual" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
    },
  },
}

function mountSummary(props: Record<string, unknown>) {
  return mount(CashDepositSummary, { props: { recorded: 0, actual: null, ...props }, ...stubs })
}

describe('CashDepositSummary', () => {
  it('shows a positive variance when the count exceeds the recorded total', () => {
    const wrapper = mountSummary({ recorded: 1000, actual: 1250 })
    expect(wrapper.find('[data-testid="variance"]').text()).toBe('250.00')
    expect(wrapper.find('[data-testid="variance"]').classes()).toContain('text-amber-600')
  })

  it('renders a shortfall with a leading minus', () => {
    const wrapper = mountSummary({ recorded: 4060000, actual: 4045000 })
    expect(wrapper.find('[data-testid="variance"]').text()).toBe('-15,000.00')
  })

  it('uses success styling at zero variance', () => {
    const wrapper = mountSummary({ recorded: 500, actual: 500 })
    expect(wrapper.find('[data-testid="variance"]').text()).toBe('0.00')
    expect(wrapper.find('[data-testid="variance"]').classes()).toContain('text-green-700')
  })

  it('shows no variance until an actual count is entered', () => {
    const wrapper = mountSummary({ recorded: 1000, actual: null })
    expect(wrapper.find('[data-testid="variance"]').text()).toBe('0.00')
  })

  it('emits the counted amount from the actual-cash input', async () => {
    const wrapper = mountSummary({ recorded: 100, actual: null })
    await wrapper.find('.actual').setValue('80')
    expect(wrapper.emitted('update:actual')![0]).toEqual([80])
  })

  it('in readonly mode renders the saved figures instead of recomputing', () => {
    const wrapper = mountSummary({
      readonly: true,
      recorded: 1,
      actual: 1,
      savedRecorded: 900,
      savedActual: 850,
      savedVariance: -50,
    })
    expect(wrapper.find('[data-testid="recorded"]').text()).toBe('900.00')
    expect(wrapper.find('[data-testid="actual"]').text()).toBe('850.00')
    expect(wrapper.find('[data-testid="variance"]').text()).toBe('-50.00')
    expect(wrapper.find('.actual').exists()).toBe(false)
  })
})
