import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VisitsView from './VisitsView.vue'

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
  VisitService: {
    toListQuery: (q: string) => q,
    listUrl: (f: Record<string, unknown>) =>
      `/v1/visits?status=${f.status ?? ''}&outside=${f.outsideRadius ? 1 : 0}`,
    summary: (f: unknown) => summary(f),
  },
  EmployeesService: { listForSelect: vi.fn() },
  CustomersService: { list: vi.fn() },
  SalesTeamsService: { toListQuery: (q: string) => q, list: vi.fn() },
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
  VisitDrawer: true,
  StatFilterCard: {
    props: ['count', 'label', 'active'],
    emits: ['toggle'],
    template:
      '<button data-testid="card" :data-active="active" @click="$emit(\'toggle\')">{{ label }}:{{ count }}</button>',
  },
}

function mountView() {
  return mount(VisitsView, { global: { stubs, directives: { tooltip: {} } } })
}

beforeEach(() => {
  summary.mockReset()
  summary.mockResolvedValue({
    countsByStatus: { completed: 4, pending: 2, not_checked_out: 1 },
    outsideRadius: 3,
  })
})

describe('VisitsView', () => {
  it('shows the always-on cards, the statuses that have rows and the outside-radius card', async () => {
    const w = mountView()
    await flushPromises()
    const labels = w.findAll('[data-testid="card"]').map((c) => c.text())
    expect(labels).toEqual([
      'visits.status.pending:2',
      'visits.status.active:0',
      'visits.status.completed:4',
      'visits.status.skipped:0',
      'visits.status.not_visited:0',
      'visits.status.not_checked_out:1',
      'visits.outsideRadius:3',
    ])
  })

  it('filters the table by a clicked status card and clears it on a second click', async () => {
    const w = mountView()
    await flushPromises()
    const completed = w.findAll('[data-testid="card"]')[2]!
    await completed.trigger('click')
    expect(w.get('[data-testid="table"]').attributes('data-url')).toContain('status=completed')
    await completed.trigger('click')
    expect(w.get('[data-testid="table"]').attributes('data-url')).toContain('status=&')
  })

  it('toggles the outside-radius filter from its card', async () => {
    const w = mountView()
    await flushPromises()
    const cards = w.findAll('[data-testid="card"]')
    await cards[cards.length - 1]!.trigger('click')
    expect(w.get('[data-testid="table"]').attributes('data-url')).toContain('outside=1')
  })
})
