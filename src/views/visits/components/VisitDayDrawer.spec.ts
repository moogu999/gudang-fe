import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VisitDayDrawer from './VisitDayDrawer.vue'
import type { VisitDayDetail, VisitDayRow } from '@/types/visit.type'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const getDay = vi.fn()
const closeDay = vi.fn()
vi.mock('@/services', () => ({
  VisitService: {
    getDay: (e: number, d: string) => getDay(e, d),
    closeDay: (b: unknown) => closeDay(b),
  },
}))

let permissions: number[] = []
vi.mock('@/stores', () => ({
  useAuthStore: () => ({ hasPermission: (id: number) => permissions.includes(id) }),
}))

function detail(day: Partial<VisitDayRow> = {}): VisitDayDetail {
  return {
    day: {
      employee: { id: 2, name: 'Budi', nip: 'N1' },
      branch: { id: 1, name: 'Jakarta' },
      date: '2026-11-19',
      status: 'open',
      counts: {
        planned: 3,
        completed: 1,
        skipped: 1,
        skippedAtClose: 1,
        notVisited: 1,
        closedVisits: 0,
      },
      hasActiveVisit: false,
      ...day,
    },
    outlets: [
      {
        sequence: 1,
        customer: { id: 9, code: 'C-1', name: 'Toko Maju' },
        visitId: 7,
        status: 'skipped',
        skipReason: 'Closed',
        skipSource: 'close_day',
      },
    ],
  }
}

const stubs = {
  Drawer: { template: '<div><slot /></div>' },
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ProgressSpinner: true,
}

async function mountDrawer(d: VisitDayDetail) {
  getDay.mockResolvedValue(d)
  const w = mount(VisitDayDrawer, {
    props: { employeeId: 2, date: '2026-11-19', toastGroup: 'g' },
    global: { stubs },
  })
  await flushPromises()
  return w
}

beforeEach(() => {
  getDay.mockReset()
  closeDay.mockReset()
  permissions = []
})

describe('VisitDayDrawer', () => {
  it('hides Close day without VISIT_CLOSE', async () => {
    const w = await mountDrawer(detail())
    expect(w.find('[data-testid="close-day"]').exists()).toBe(false)
  })

  it('hides Close day on a closed day', async () => {
    permissions = [187]
    const w = await mountDrawer(
      detail({ status: 'closed', source: 'salesman', closedAt: '2026-11-19T10:00:00Z' }),
    )
    expect(w.find('[data-testid="close-day"]').exists()).toBe(false)
    expect(w.get('[data-testid="day-source"]').text()).toContain(
      'visits.days.drawer.sourceSalesman',
    )
  })

  it('tags outlets skipped at day close and links to their visit', async () => {
    const w = await mountDrawer(detail())
    expect(w.find('[data-testid="outlet-close-day-tag"]').exists()).toBe(true)
    await w.get('[data-testid="outlet-view-visit"]').trigger('click')
    expect(w.emitted('openVisit')![0]).toEqual([7])
  })

  it('requires a note, then closes the day and reloads', async () => {
    permissions = [187]
    closeDay.mockResolvedValue({})
    const w = await mountDrawer(detail())
    await w.get('[data-testid="close-day"]').trigger('click')
    await w.get('[data-testid="close-day-confirm"]').trigger('click')
    expect(closeDay).not.toHaveBeenCalled()
    await w.get('[data-testid="close-day-note"]').setValue('  phone lost ')
    await w.get('[data-testid="close-day-confirm"]').trigger('click')
    await flushPromises()
    expect(closeDay).toHaveBeenCalledWith({ employeeId: 2, date: '2026-11-19', note: 'phone lost' })
    expect(w.emitted('changed')).toHaveLength(1)
    expect(getDay).toHaveBeenCalledTimes(2)
  })
})
