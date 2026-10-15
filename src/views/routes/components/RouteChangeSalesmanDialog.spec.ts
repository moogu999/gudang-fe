import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RouteChangeSalesmanDialog from './RouteChangeSalesmanDialog.vue'
import type { Route } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}${JSON.stringify(params)}` : key,
  }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const handover = vi.fn(() => Promise.resolve({}))
const salesmanLoad = vi.fn()
vi.mock('@/services', () => ({
  RoutesService: {
    handover: (...args: unknown[]) => handover(...(args as [])),
    salesmanLoad: (...args: unknown[]) => salesmanLoad(...args),
    salesmanLoadBulk: () => Promise.resolve([]),
  },
  SalesTeamsService: {
    listMembers: () =>
      Promise.resolve([
        { membershipId: 1, employee: { id: 21, name: 'Budi', nip: 'KS-021' }, isCurrent: true },
        { membershipId: 2, employee: { id: 22, name: 'Yoga', nip: 'KS-022' }, isCurrent: true },
        { membershipId: 3, employee: { id: 23, name: 'Old', nip: 'KS-023' }, isCurrent: false },
      ]),
  },
}))

const route = {
  id: 7,
  code: 'RT-007',
  name: 'Serpong Barat',
  branch: { id: 1, code: 'B1', name: 'Branch' },
  salesTeam: { id: 5, code: 'TM-005', name: 'Team', isActive: true },
  customerCount: 27,
  holder: { employeeId: 21, name: 'Budi', startDate: '2026-01-05' },
  pendingHolder: null,
} as unknown as Route

const DatePickerStub = {
  name: 'DatePicker',
  props: ['modelValue', 'minDate'],
  template: '<input data-testid="date" />',
}
const SelectStub = {
  name: 'Select',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template:
    '<select data-testid="holder-select" @change="$emit(\'update:modelValue\', Number($event.target.value))"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
}

function mountDialog() {
  return mount(RouteChangeSalesmanDialog, {
    props: { route, toastGroup: 'test' },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        DatePicker: DatePickerStub,
        Select: SelectStub,
        Message: { template: '<div v-bind="$attrs"><slot /></div>' },
        Button: {
          props: ['label', 'disabled'],
          emits: ['click'],
          template:
            '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })
}

const grid = (value: number) => [[value, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]]

describe('RouteChangeSalesmanDialog', () => {
  beforeEach(() => {
    handover.mockClear()
    salesmanLoad.mockReset()
  })

  it('cannot take effect before tomorrow', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const min = wrapper.findComponent({ name: 'DatePicker' }).props('minDate') as Date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(min.getFullYear()).toBe(tomorrow.getFullYear())
    expect(min.getMonth()).toBe(tomorrow.getMonth())
    expect(min.getDate()).toBe(tomorrow.getDate())
  })

  it('offers current team members other than the holder, plus removing the salesman', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const options = wrapper.findAll('option').map((o) => o.text())
    expect(options.some((o) => o.includes('Yoga'))).toBe(true)
    expect(options.some((o) => o.includes('Budi'))).toBe(false)
    expect(options.some((o) => o.includes('Old'))).toBe(false)
    expect(options.at(-1)).toBe('routes.handover.removeSalesman')
  })

  it('warns about the worst day without blocking the save', async () => {
    // After the handover Monday W1 holds 31 visits against a limit of 18; today it holds 16.
    salesmanLoad.mockImplementation((_b: number, _e: number, opts?: { includeRouteId?: number }) =>
      Promise.resolve({
        grid: grid(opts?.includeRouteId ? 31 : 16),
        customByMonth: {},
        maxVisitsPerDay: 18,
        allowSunday: false,
      }),
    )
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('[data-testid="holder-select"]').setValue('22')
    await flushPromises()

    const warning = wrapper.find('[data-testid="load-warning"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('"after":31')
    expect(warning.text()).toContain('"current":16')
    expect(warning.text()).toContain('"route":15')
    expect(warning.text()).toContain('"max":18')

    await wrapper.find('[data-testid="confirm-handover"]').trigger('click')
    await flushPromises()
    expect(handover).toHaveBeenCalledTimes(1)
    const [id, body] = handover.mock.calls[0] as unknown as [number, { employeeId: number | null }]
    expect(id).toBe(7)
    expect(body.employeeId).toBe(22)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('sends a null employee to remove the salesman', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('[data-testid="holder-select"]').setValue('-1')
    await flushPromises()
    await wrapper.find('[data-testid="confirm-handover"]').trigger('click')
    await flushPromises()
    const [, body] = handover.mock.calls[0] as unknown as [number, { employeeId: number | null }]
    expect(body.employeeId).toBeNull()
  })
})
