import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DepotAttendanceView from './DepotAttendanceView.vue'

vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('@/stores', () => ({ useAuthStore: () => ({ branchIds: [1] }) }))
vi.mock('@/views/sales-teams/salesTeamHelpers', () => ({ userBranchesFetcher: () => vi.fn() }))

const summary = vi.fn()
vi.mock('@/services', () => ({
  DepotAttendanceService: {
    toListQuery: (q: string) => q,
    listUrl: (f: Record<string, unknown>) => `/v1/depot-attendances?status=${f.status ?? ''}`,
    summary: (f: unknown) => summary(f),
  },
  EmployeesService: { listForSelect: vi.fn() },
  SalesTeamsService: { toListQuery: (q: string) => q, list: vi.fn() },
  BranchesService: { list: vi.fn() },
}))

const stubs = {
  Toast: true,
  DatePicker: true,
  InfiniteSelect: true,
  Message: true,
  ResponsiveCard: { template: '<div><slot name="content" /></div>' },
  TableComponent: {
    props: ['url'],
    methods: { clearSearch() {} },
    template: '<div data-testid="table" :data-url="url" />',
  },
  DepotAttendanceDrawer: true,
  StatFilterCard: {
    props: ['count', 'label', 'active'],
    emits: ['toggle'],
    template:
      '<button data-testid="card" :data-active="active" @click="$emit(\'toggle\')">{{ label }}:{{ count }}</button>',
  },
}

beforeEach(() => {
  summary.mockReset()
  summary.mockResolvedValue({ countsByStatus: { in_radius: 4, missing: 2, holiday: 1 } })
})

describe('DepotAttendanceView', () => {
  it('shows the always-on cards plus the statuses that have rows', async () => {
    const w = mount(DepotAttendanceView, { global: { stubs, directives: { tooltip: {} } } })
    await flushPromises()
    const labels = w.findAll('[data-testid="card"]').map((c) => c.text())
    expect(labels).toEqual([
      'depotAttendance.status.in_radius:4',
      'depotAttendance.status.outside_radius:0',
      'depotAttendance.status.missing:2',
      'depotAttendance.status.holiday:1',
    ])
  })

  it('filters the table by a clicked card and clears it on a second click', async () => {
    const w = mount(DepotAttendanceView, { global: { stubs, directives: { tooltip: {} } } })
    await flushPromises()
    const missing = w.findAll('[data-testid="card"]')[2]!
    await missing.trigger('click')
    expect(w.get('[data-testid="table"]').attributes('data-url')).toContain('status=missing')
    await missing.trigger('click')
    expect(w.get('[data-testid="table"]').attributes('data-url')).toBe(
      '/v1/depot-attendances?status=',
    )
  })
})
