import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CreditDebitNoteAmounts from './CreditDebitNoteAmounts.vue'
import { signedAmount } from './signedAmount'
import type { CreditDebitNoteType } from '@/types/creditDebitNote.type'

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
  taxBaseAmount: number
  taxRate: number
  taxAmount: number
  noteType: CreditDebitNoteType
  readonly?: boolean
  savedTotalAmount?: number
}

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    taxBaseAmount: 175000,
    taxRate: 11,
    taxAmount: 0,
    noteType: 'credit',
    ...overrides,
  }
}

function mountAmounts(overrides: Partial<Props> = {}) {
  return mount(CreditDebitNoteAmounts, { props: baseProps(overrides), ...globalStubs })
}

function lastTaxEmit(wrapper: ReturnType<typeof mountAmounts>): number | undefined {
  const events = wrapper.emitted('update:taxAmount')
  if (!events) return undefined
  return events[events.length - 1][0] as number
}

function lastTaxBaseEmit(wrapper: ReturnType<typeof mountAmounts>): number | undefined {
  const events = wrapper.emitted('update:taxBaseAmount')
  if (!events) return undefined
  return events[events.length - 1][0] as number
}

describe('CreditDebitNoteAmounts', () => {
  it('seeds PPN from DPP × the configured rate on mount', () => {
    const wrapper = mountAmounts()
    expect(lastTaxEmit(wrapper)).toBe(19250)
  })

  it('re-computes PPN when the entered DPP changes, while untouched', async () => {
    const wrapper = mountAmounts()
    await wrapper.setProps({ taxBaseAmount: 200000, taxAmount: 19250 })
    expect(lastTaxEmit(wrapper)).toBe(22000)
  })

  it('stops re-seeding once the user overrides PPN', async () => {
    const wrapper = mountAmounts({ taxAmount: 19250 })
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue(19000)
    expect(lastTaxEmit(wrapper)).toBe(19000)

    await wrapper.setProps({ taxAmount: 19000, taxBaseAmount: 200000 })
    // DPP moved but the user owns PPN now, so nothing is re-seeded.
    expect(lastTaxEmit(wrapper)).toBe(19000)
  })

  it('emits the edited DPP verbatim as a positive magnitude', async () => {
    const wrapper = mountAmounts({ noteType: 'debit' })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue(500000)
    expect(lastTaxBaseEmit(wrapper)).toBe(500000)
  })

  it('preserves a saved override when an existing draft is opened for editing', () => {
    // 19000 against a computed 19250 can only be an override.
    const wrapper = mountAmounts({ taxAmount: 19000 })
    expect(wrapper.emitted('update:taxAmount')).toBeUndefined()
  })

  it('does not warn on a small rounding-scale override', async () => {
    const wrapper = mountAmounts({ taxAmount: 19250 })
    await wrapper.findAll('input')[1].setValue(19000)
    await wrapper.setProps({ taxAmount: 19000 })
    const warnings = wrapper
      .findAll('.message')
      .filter((m) => m.attributes('data-severity') === 'warn')
    expect(warnings).toHaveLength(0)
  })

  it('warns without blocking when the override deviates by more than 1000', async () => {
    const wrapper = mountAmounts({ taxAmount: 19250 })
    await wrapper.findAll('input')[1].setValue(18000)
    await wrapper.setProps({ taxAmount: 18000 })
    const warnings = wrapper
      .findAll('.message')
      .filter((m) => m.attributes('data-severity') === 'warn')
    expect(warnings).toHaveLength(1)
    expect(warnings[0].text()).toContain('creditDebitNotes.validation.taxDeviation')
  })

  it('renders the total signed and coloured for a credit note', () => {
    const wrapper = mountAmounts({ noteType: 'credit', taxAmount: 19250 })
    expect(wrapper.text()).toContain('− 194,250.00')
  })

  it('renders the total signed and coloured for a debit note', () => {
    const wrapper = mountAmounts({ noteType: 'debit', taxAmount: 19250 })
    expect(wrapper.text()).toContain('+ 194,250.00')
  })

  it('uses the saved server total in VIEW mode instead of recomputing', () => {
    const wrapper = mountAmounts({
      readonly: true,
      taxBaseAmount: 175000,
      taxAmount: 19000,
      savedTotalAmount: 194000,
      // A tax rate the saved figures do not agree with — VIEW must ignore it.
      taxRate: 12,
    })
    expect(wrapper.text()).toContain('194,000.00')
    expect(wrapper.emitted('update:taxAmount')).toBeUndefined()
  })

  it('renders DPP and PPN read-only in VIEW mode', () => {
    const wrapper = mountAmounts({ readonly: true, taxAmount: 19250, savedTotalAmount: 1 })
    expect(wrapper.findAll('input')).toHaveLength(0)
  })
})

describe('signedAmount', () => {
  it('negates for credit and leaves debit untouched', () => {
    expect(signedAmount(175000, 'credit')).toBe(-175000)
    expect(signedAmount(175000, 'debit')).toBe(175000)
  })
})
