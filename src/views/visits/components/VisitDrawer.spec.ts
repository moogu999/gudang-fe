import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VisitDrawer from './VisitDrawer.vue'
import type { Visit, VisitDetail } from '@/types/visit.type'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const get = vi.fn()
const close = vi.fn()
vi.mock('@/services', () => ({
  VisitService: {
    get: (id: number) => get(id),
    close: (id: number, note: string) => close(id, note),
  },
}))

let permissions: number[] = []
vi.mock('@/stores', () => ({
  useAuthStore: () => ({ hasPermission: (id: number) => permissions.includes(id) }),
}))

function detail(overrides: Partial<Visit> = {}, extra: Partial<VisitDetail> = {}): VisitDetail {
  return {
    visit: {
      id: 5,
      clientId: 'c',
      branchId: 1,
      employeeId: 2,
      customerId: 9,
      date: '2026-11-19',
      mode: 'taking_order',
      planSequence: 1,
      status: 'completed',
      selfieRequired: true,
      stockCheckLevel: 'required',
      checkedInAt: '2026-11-19T01:05:00Z',
      checkedOutAt: '2026-11-19T01:40:00Z',
      checkInLatitude: -6.2,
      checkInLongitude: 106.8,
      outletLatitude: -6.201,
      outletLongitude: 106.801,
      checkOutLatitude: -6.2,
      checkOutLongitude: 106.8,
      distanceM: 320,
      radiusM: 150,
      withinRadius: false,
      radiusRuleLevel: 'required',
      receivedAt: '2026-11-19T01:06:00Z',
      ...overrides,
    },
    displayStatus: 'completed',
    durationMin: 35,
    employee: { id: 2, name: 'Budi', nip: 'N1' },
    team: { id: 3, name: 'Team A' },
    branch: { id: 1, name: 'Jakarta' },
    customer: { id: 9, code: 'C-1', name: 'Toko Maju' },
    outsideReason: { code: 'VOR-01', name: 'Weak GPS' },
    selfieUrl: '/uploads/a.jpg',
    stockCheck: [
      {
        surveyId: 1,
        surveyCode: 'SV-1',
        surveyName: 'Stock',
        surveyVersion: 2,
        items: [
          {
            productId: 1,
            productCode: 'P1',
            productName: 'Milk',
            available: true,
            storeQty: '4.0000',
            displayQty: null,
          },
        ],
      },
    ],
    ...extra,
  }
}

const stubs = {
  Drawer: { template: '<div><slot /></div>' },
  Image: { template: '<img data-testid="drawer-selfie" />' },
  Message: { template: '<div><slot /></div>' },
  ProgressSpinner: true,
  Tag: { props: ['value'], template: '<span>{{ value }}</span>' },
  Button: {
    props: ['label'],
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
  },
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible" data-testid="close-dialog"><slot /><slot name="footer" /></div>',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea data-testid="close-note" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BaseMap: {
    props: ['markers', 'circles'],
    template:
      '<div data-testid="base-map" :data-circles="circles.length" :data-markers="markers.length" />',
  },
}

async function mountDrawer(d: VisitDetail) {
  get.mockResolvedValue(d)
  const wrapper = mount(VisitDrawer, {
    props: { visitId: 5, toastGroup: 'g' },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

describe('VisitDrawer', () => {
  it('draws the outlet, radius circle, check-in and check-out and groups the stock check', async () => {
    const w = await mountDrawer(detail())
    const map = w.get('[data-testid="base-map"]')
    expect(map.attributes('data-circles')).toBe('1')
    expect(map.attributes('data-markers')).toBe('3')
    expect(w.findAll('[data-testid="stock-group"]')).toHaveLength(1)
    expect(w.text()).toContain('Milk')
    expect(w.text()).toContain('VOR-01')
    expect(w.find('[data-testid="drawer-stock-missing"]').exists()).toBe(false)
  })

  it('flags a required stock check that was not done', async () => {
    const w = await mountDrawer(detail({}, { stockCheck: [] }))
    expect(w.find('[data-testid="drawer-stock-missing"]').exists()).toBe(true)
    expect(w.find('[data-testid="drawer-no-stock"]').exists()).toBe(true)
  })

  it('shows a skipped visit without map or selfie', async () => {
    const w = await mountDrawer(
      detail(
        { status: 'skipped', checkedInAt: null, skipNote: 'closed' },
        {
          displayStatus: 'skipped',
          skipReason: { code: 'SK-1', name: 'Shop closed' },
          outsideReason: null,
          stockCheck: [],
          selfieUrl: null,
        },
      ),
    )
    expect(w.find('[data-testid="base-map"]').exists()).toBe(false)
    expect(w.find('[data-testid="drawer-selfie"]').exists()).toBe(false)
    expect(w.text()).toContain('SK-1')
    expect(w.text()).toContain('closed')
    expect(w.find('[data-testid="drawer-stock-missing"]').exists()).toBe(false)
  })

  describe('closing a visit left open on an earlier day', () => {
    const open = () =>
      detail(
        { status: 'active', checkedOutAt: null, checkOutLatitude: null, checkOutLongitude: null },
        { displayStatus: 'not_checked_out', durationMin: null },
      )

    it('offers the close action only with VISIT_CLOSE', async () => {
      permissions = []
      let w = await mountDrawer(open())
      expect(w.find('[data-testid="drawer-close-hint"]').exists()).toBe(true)
      expect(w.find('[data-testid="close-visit"]').exists()).toBe(false)

      permissions = [187]
      w = await mountDrawer(open())
      expect(w.find('[data-testid="close-visit"]').exists()).toBe(true)
      w = await mountDrawer(detail())
      expect(w.find('[data-testid="drawer-close-hint"]').exists()).toBe(false)
    })

    it('requires a note, then closes and reports the change', async () => {
      permissions = [187]
      const w = await mountDrawer(open())
      await w.get('[data-testid="close-visit"]').trigger('click')
      await w.get('[data-testid="close-confirm"]').trigger('click')
      expect(close).not.toHaveBeenCalled()
      expect(w.text()).toContain('visits.close.noteRequired')

      close.mockResolvedValue({})
      get.mockResolvedValue(
        detail(
          {
            status: 'closed',
            checkedOutAt: null,
            closedAt: '2026-11-20T02:00:00Z',
            closeNote: 'Phone lost',
          },
          { displayStatus: 'closed', closedByName: 'Siti' },
        ),
      )
      await w.get('[data-testid="close-note"]').setValue('  Phone lost ')
      await w.get('[data-testid="close-confirm"]').trigger('click')
      await flushPromises()
      expect(close).toHaveBeenCalledWith(5, 'Phone lost')
      expect(w.emitted('changed')).toHaveLength(1)
      expect(w.find('[data-testid="close-dialog"]').exists()).toBe(false)
      expect(w.get('[data-testid="drawer-close-note"]').text()).toBe('Phone lost')
      expect(w.text()).toContain('Siti')
    })
  })
})
