import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RouteAddCustomerDialog from './RouteAddCustomerDialog.vue'
import { DataTableStub } from '@/views/ar-clearings/components/dataTableStub'
import type { Route, RouteCustomerOption } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}${JSON.stringify(params)}` : key,
  }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const addCustomers = vi.fn(() => Promise.resolve())
const options: RouteCustomerOption[] = [
  {
    id: 1,
    code: 'C-1',
    name: 'Free Customer',
    isActive: true,
    inThisRoute: false,
    teamRoute: null,
    otherTeamRoutes: [],
  },
  {
    id: 2,
    code: 'C-2',
    name: 'Same Team Customer',
    isActive: true,
    inThisRoute: false,
    teamRoute: { routeId: 9, routeCode: 'RT-002', routeName: 'Pondok Cabe', holderName: 'Agus' },
    otherTeamRoutes: [],
  },
  {
    id: 3,
    code: 'C-3',
    name: 'Other Team Customer',
    isActive: true,
    inThisRoute: false,
    teamRoute: null,
    otherTeamRoutes: [{ routeCode: 'RT-011', teamCode: 'TM-008', holderName: 'Melisa', daysMask: 1 }],
  },
]
vi.mock('@/services', () => ({
  RoutesService: {
    customerOptions: () => Promise.resolve({ data: options, meta: { total: 3, limit: 10, offset: 0 } }),
    addCustomers: (...args: unknown[]) => addCustomers(...(args as [])),
  },
  CustomerOutletTypesService: { list: () => Promise.resolve({ data: [] }) },
}))

const route = { id: 4, code: 'RT-001', visitDays: 0 } as Route

function mountDialog() {
  return mount(RouteAddCustomerDialog, {
    props: { route, allowSunday: false, canMove: true, toastGroup: 'test' },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        DataTable: DataTableStub,
        Select: true,
        IconField: { template: '<div><slot /></div>' },
        InputIcon: true,
        InputText: { template: '<input />' },
        WeekdayChips: true,
        Message: { template: '<div><slot /></div>' },
        Checkbox: {
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          template:
            '<input type="checkbox" v-bind="$attrs" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', true)" />',
        },
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

describe('RouteAddCustomerDialog', () => {
  beforeEach(() => addCustomers.mockClear())

  it('cannot pick a customer already in a route of the same team, and offers to move it', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.find('[data-testid="pick-1"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="pick-2"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="pick-3"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="team-route-block"]').text()).toContain('RT-002')

    await wrapper.find('[data-testid="move-2"]').trigger('click')
    expect(wrapper.emitted('move')?.[0][0]).toMatchObject({ id: 2 })
  })

  it('shows other teams routes as information only', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    expect(wrapper.text()).toContain('routes.add.alsoIn')
    expect(wrapper.text()).toContain('RT-011')
  })

  it('adds the picked customers with the chosen schedule', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.find('[data-testid="pick-1"]').trigger('change')
    await wrapper.find('[data-testid="add-customers"]').trigger('click')
    await flushPromises()

    expect(addCustomers).toHaveBeenCalledTimes(1)
    const [id, customers] = addCustomers.mock.calls[0] as unknown as [
      number,
      { customerId: number; pattern: { patternType: string; daysMask: number; frequency: string } }[],
    ]
    expect(id).toBe(4)
    expect(customers).toHaveLength(1)
    expect(customers[0].customerId).toBe(1)
    expect(customers[0].pattern).toMatchObject({ patternType: 'cycle', daysMask: 1, frequency: 'F4' })
    expect(wrapper.emitted('added')).toHaveLength(1)
  })
})
