import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CheckSalesmanDrawer from './CheckSalesmanDrawer.vue'
import { ApiError } from '@/types/api.type'
import type { EffectiveRules } from '@/types/visitRule.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    te: (key: string) => key.startsWith('visitRules.errors.'),
  }),
}))

const getEffective = vi.fn()
vi.mock('@/services', () => ({
  VisitRulesService: { getEffective: (...a: unknown[]) => getEffective(...a) },
  EmployeesService: { toListQuery: (q?: string) => q ?? '', list: vi.fn() },
  EmployeeTypesService: { list: vi.fn().mockResolvedValue({ data: [] }) },
}))

const meta = {
  categoryKey: 'check_in',
  style: 'mandatory' as const,
  allowedLevels: ['required' as const, 'off' as const],
  locked: false,
  appliesTakingOrder: true,
  appliesCanvass: true,
  defaultLevel: 'required' as const,
  exemptible: false,
  employeeExemptible: false,
}

const effective: EffectiveRules = {
  employee: { id: 9, code: 'KS-061', name: 'Agus', mode: 'taking_order', exemptDepotCheckIn: true },
  team: { id: 1, code: 'TM-001', name: 'Wings' },
  company: { id: 1, name: 'C' },
  exemptReasons: [],
  rules: [
    { ...meta, key: 'depot_check_in', level: 'off', source: 'employee' },
    { ...meta, key: 'load_confirmation', source: 'n/a' },
    { ...meta, key: 'survey', level: 'required', source: 'team' },
  ],
}

const InfiniteSelectStub = {
  name: 'InfiniteSelect',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div data-testid="drawer-employee" />',
}

function mountDrawer() {
  return mount(CheckSalesmanDrawer, {
    props: { visible: true },
    global: {
      stubs: {
        Drawer: { template: '<div><slot /></div>' },
        InfiniteSelect: InfiniteSelectStub,
        SelectButton: true,
        Tag: { props: ['value'], template: '<span class="tag">{{ value }}</span>' },
        Message: { template: '<div><slot /></div>' },
      },
    },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('CheckSalesmanDrawer', () => {
  it('shows each rule with its source and n/a rows muted', async () => {
    getEffective.mockResolvedValue(effective)
    const w = mountDrawer()
    await w.findComponent({ name: 'InfiniteSelect' }).vm.$emit('update:modelValue', 9)
    await flushPromises()
    expect(getEffective).toHaveBeenCalledWith(9)
    expect(w.find('[data-testid="effective-depot_check_in"]').text()).toContain(
      'visitRules.sources.employee',
    )
    const na = w.find('[data-testid="effective-load_confirmation"]')
    expect(na.text()).toContain('visitRules.drawer.notApplicable')
    expect(na.find('.tag').exists()).toBe(false)
    expect(w.find('[data-testid="effective-survey"]').text()).toContain('visitRules.sources.team')
  })

  it('shows an inline message when the employee is not field staff', async () => {
    getEffective.mockRejectedValue(new ApiError('x', 422, 'VISIT_RULE_NOT_FIELD_EMPLOYEE'))
    const w = mountDrawer()
    await w.findComponent({ name: 'InfiniteSelect' }).vm.$emit('update:modelValue', 5)
    await flushPromises()
    expect(w.find('[data-testid="drawer-error"]').text()).toBe(
      'visitRules.errors.VISIT_RULE_NOT_FIELD_EMPLOYEE',
    )
    expect(w.find('[data-testid="drawer-table"]').exists()).toBe(false)
  })
})
