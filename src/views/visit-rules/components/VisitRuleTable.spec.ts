import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import VisitRuleTable from './VisitRuleTable.vue'
import RuleLevelSelector from './RuleLevelSelector.vue'
import type { CompanyRuleRow, TeamRuleRow } from '@/types/visitRule.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const SelectButtonStub = defineComponent({
  name: 'SelectButton',
  props: ['modelValue', 'options', 'disabled'],
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () =>
      h(
        'div',
        { 'data-testid': attrs['data-testid'] ?? 'sb', 'data-disabled': String(!!props.disabled) },
        (props.options as { value: string; disabled?: boolean }[]).map((o) =>
          h(
            'button',
            {
              'data-value': o.value,
              disabled: o.disabled,
              onClick: () => emit('update:modelValue', o.value),
            },
            o.value,
          ),
        ),
      )
  },
})

const base = {
  categoryKey: 'check_in',
  style: 'mandatory' as const,
  appliesTakingOrder: true,
  appliesCanvass: true,
  exemptible: false,
  employeeExemptible: false,
}

const selfie: CompanyRuleRow = {
  ...base,
  key: 'check_in_selfie',
  allowedLevels: ['required', 'off'],
  locked: false,
  defaultLevel: 'required',
  level: 'required',
  source: 'default',
}
const radius: CompanyRuleRow = {
  ...base,
  key: 'outlet_radius',
  style: 'block',
  allowedLevels: ['required', 'recommended', 'off'],
  locked: false,
  paramKind: 'radius_m',
  defaultLevel: 'recommended',
  defaultRadiusM: 100,
  level: 'recommended',
  radiusM: 100,
  source: 'default',
}
const locked: CompanyRuleRow = {
  ...base,
  key: 'fake_gps',
  style: 'block',
  allowedLevels: ['required'],
  locked: true,
  defaultLevel: 'required',
  level: 'required',
  source: 'default',
}

const stubs = {
  SelectButton: SelectButtonStub,
  InputNumber: { props: ['modelValue'], template: '<input :value="modelValue" />' },
  InputGroup: { template: '<div><slot /></div>' },
  InputGroupAddon: { template: '<span><slot /></span>' },
  Tag: { template: '<span />' },
}
const global = { stubs, directives: { tooltip: {} } }

describe('RuleLevelSelector', () => {
  it('disables the levels a rule does not allow', () => {
    const w = mount(RuleLevelSelector, {
      props: {
        modelValue: 'required',
        levelStyle: 'mandatory',
        allowedLevels: ['required', 'off'],
      },
      global: { stubs: { SelectButton: SelectButtonStub } },
    })
    const disabled = w.findAll('button').filter((b) => b.attributes('disabled') !== undefined)
    expect(disabled.map((b) => b.attributes('data-value'))).toEqual(['recommended'])
  })
})

describe('VisitRuleTable (company)', () => {
  it('renders a radius input only for a radius rule and a locked row disabled', () => {
    const w = mount(VisitRuleTable, {
      props: {
        mode: 'company',
        rows: [selfie, radius, locked],
        modelValue: {
          check_in_selfie: { level: 'required' },
          outlet_radius: { level: 'recommended', radiusM: 100 },
        },
      },
      global,
    })
    expect(w.find('[data-testid="radius-outlet_radius"]').exists()).toBe(true)
    expect(w.find('[data-testid="radius-check_in_selfie"]').exists()).toBe(false)
    const lockedSelector = w.findComponent({ name: 'RuleLevelSelector' }).exists()
    expect(lockedSelector).toBe(true)
    expect(w.find('[data-testid="rule-fake_gps"] [data-disabled="true"]').exists()).toBe(true)
  })

  it('emits an updated map with the default radius when a level is picked', async () => {
    const w = mount(VisitRuleTable, {
      props: {
        mode: 'company',
        rows: [radius],
        modelValue: { outlet_radius: { level: 'off' } },
      },
      global,
    })
    await w
      .find('[data-testid="rule-outlet_radius"] button[data-value="required"]')
      .trigger('click')
    expect(w.emitted('update:modelValue')![0]![0]).toEqual({
      outlet_radius: { level: 'required', radiusM: 100 },
    })
  })
})

describe('VisitRuleTable (team)', () => {
  const teamRow: TeamRuleRow = {
    ...selfie,
    inherited: { level: 'required', source: 'company' },
  }

  it('tints an overridden row and seeds the override from the inherited value', async () => {
    const w = mount(VisitRuleTable, {
      props: { mode: 'team', rows: [teamRow], modelValue: {} },
      global,
    })
    expect(w.find('[data-testid="rule-check_in_selfie"]').classes()).not.toContain('bg-yellow-50')
    await w
      .find('[data-testid="follow-check_in_selfie"] button[data-value="override"]')
      .trigger('click')
    expect(w.emitted('update:modelValue')![0]![0]).toEqual({
      check_in_selfie: { level: 'required' },
    })

    await w.setProps({ modelValue: { check_in_selfie: { level: 'off' } } })
    expect(w.find('[data-testid="rule-check_in_selfie"]').classes()).toContain('bg-yellow-50')
  })
})
