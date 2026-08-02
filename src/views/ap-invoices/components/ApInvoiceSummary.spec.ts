import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApInvoiceSummary from './ApInvoiceSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en-US' },
  }),
}))

const globalStubs = {
  global: {
    stubs: {
      InputNumber: {
        name: 'InputNumber',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
          '<input :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
      },
      Message: {
        name: 'Message',
        props: ['severity'],
        template: '<div class="message" :data-severity="severity"><slot /></div>',
      },
      Divider: { name: 'Divider', template: '<hr />' },
    },
  },
}

interface Props {
  taxBase: number
  taxRate: number
  taxAmount: number
  readonly?: boolean
  savedTotalAmount?: number
}

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    taxBase: 43636500,
    taxRate: 11,
    taxAmount: 0,
    ...overrides,
  }
}

function mountSummary(overrides: Partial<Props> = {}) {
  return mount(ApInvoiceSummary, { props: baseProps(overrides), ...globalStubs })
}

function lastTaxEmit(wrapper: ReturnType<typeof mountSummary>): number | undefined {
  const events = wrapper.emitted('update:taxAmount')
  if (!events) return undefined
  return events[events.length - 1][0] as number
}

describe('ApInvoiceSummary', () => {
  it('seeds PPN from DPP × the configured rate on mount', () => {
    const wrapper = mountSummary()
    expect(lastTaxEmit(wrapper)).toBe(4800015)
  })

  it('re-seeds PPN when the covered receipts change, while untouched', async () => {
    const wrapper = mountSummary()
    await wrapper.setProps({ taxBase: 18836500, taxAmount: 4800015 })
    expect(lastTaxEmit(wrapper)).toBe(2072015)
  })

  it('stops re-seeding once the user overrides PPN', async () => {
    const wrapper = mountSummary({ taxAmount: 4800015 })
    await wrapper.find('input').setValue(4800000)
    expect(lastTaxEmit(wrapper)).toBe(4800000)

    await wrapper.setProps({ taxAmount: 4800000, taxBase: 18836500 })
    // The base moved but the user owns the field now, so nothing is re-seeded.
    expect(lastTaxEmit(wrapper)).toBe(4800000)
  })

  it('does not warn on a small rounding-scale override', async () => {
    const wrapper = mountSummary({ taxAmount: 4800015 })
    await wrapper.find('input').setValue(4800000)
    await wrapper.setProps({ taxAmount: 4800000 })
    const warnings = wrapper
      .findAll('.message')
      .filter((m) => m.attributes('data-severity') === 'warn')
    expect(warnings).toHaveLength(0)
  })

  it('warns without blocking when the override deviates by more than 1000', async () => {
    const wrapper = mountSummary({ taxAmount: 4800015 })
    await wrapper.find('input').setValue(4790000)
    await wrapper.setProps({ taxAmount: 4790000 })
    const warnings = wrapper
      .findAll('.message')
      .filter((m) => m.attributes('data-severity') === 'warn')
    expect(warnings).toHaveLength(1)
    expect(warnings[0].text()).toContain('apInvoices.validation.ppnDeviation')
  })

  it('preserves a saved override when an existing draft is opened for editing', () => {
    // 4 800 000 against a computed 4 800 015 can only be an override.
    const wrapper = mountSummary({ taxAmount: 4800000 })
    expect(wrapper.emitted('update:taxAmount')).toBeUndefined()
  })

  it('still re-seeds an existing draft whose saved PPN was never overridden', async () => {
    const wrapper = mountSummary({ taxAmount: 4800015 })
    expect(wrapper.emitted('update:taxAmount')).toBeUndefined()

    await wrapper.setProps({ taxBase: 18836500 })
    expect(lastTaxEmit(wrapper)).toBe(2072015)
  })

  it('computes the total as DPP + PPN while editable', () => {
    const wrapper = mountSummary({ taxAmount: 4800015 })
    expect(wrapper.text()).toContain('48,436,515.00')
  })

  it('uses the saved server total in VIEW mode instead of recomputing', () => {
    const wrapper = mountSummary({
      readonly: true,
      taxBase: 43636500,
      taxAmount: 4800000,
      savedTotalAmount: 48436500,
      // A tax rate the saved figures do not agree with — VIEW must ignore it.
      taxRate: 12,
    })
    expect(wrapper.text()).toContain('48,436,500.00')
    expect(wrapper.emitted('update:taxAmount')).toBeUndefined()
  })

  it('renders PPN read-only in VIEW mode', () => {
    const wrapper = mountSummary({ readonly: true, taxAmount: 4800015, savedTotalAmount: 1 })
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
