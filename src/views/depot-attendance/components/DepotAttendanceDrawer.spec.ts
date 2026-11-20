import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DepotAttendanceDrawer from './DepotAttendanceDrawer.vue'
import type { DepotAttendanceDetail } from '@/types/depotAttendance.type'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const get = vi.fn()
vi.mock('@/services', () => ({ DepotAttendanceService: { get: (id: number) => get(id) } }))

function detail(
  overrides: Partial<DepotAttendanceDetail['attendance']> = {},
  selfie = '/uploads/a.jpg',
) {
  return {
    attendance: {
      id: 5,
      clientId: 'c',
      branchId: 1,
      employeeId: 2,
      date: '2026-11-19',
      capturedAt: '2026-11-19T01:05:00Z',
      receivedAt: '2026-11-19T01:06:00Z',
      latitude: -6.2,
      longitude: 106.8,
      distanceM: 320,
      radiusM: 150,
      depotLatitude: -6.201,
      depotLongitude: 106.801,
      ruleLevel: 'required',
      withinRadius: false,
      status: 'outside_radius',
      ...overrides,
    },
    employee: { id: 2, name: 'Budi', nip: 'N1' },
    team: { id: 3, name: 'Team A' },
    branch: { id: 1, name: 'Jakarta' },
    reason: { code: 'ADP-02', name: 'GPS off' },
    selfieUrl: selfie,
  } as DepotAttendanceDetail
}

const stubs = {
  Drawer: { template: '<div><slot /></div>' },
  Image: { template: '<img data-testid="drawer-selfie" />' },
  ProgressSpinner: true,
  Tag: { props: ['value'], template: '<span>{{ value }}</span>' },
  BaseMap: {
    props: ['markers', 'circles'],
    template:
      '<div data-testid="base-map" :data-circles="circles.length" :data-markers="markers.length" />',
  },
}

async function mountDrawer(d: DepotAttendanceDetail) {
  get.mockResolvedValue(d)
  const wrapper = mount(DepotAttendanceDrawer, {
    props: { attendanceId: 5, toastGroup: 'g' },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

describe('DepotAttendanceDrawer', () => {
  it('draws the depot, the radius circle and the salesman pin', async () => {
    const w = await mountDrawer(detail())
    const map = w.get('[data-testid="base-map"]')
    expect(map.attributes('data-circles')).toBe('1')
    expect(map.attributes('data-markers')).toBe('2')
    expect(w.find('[data-testid="drawer-selfie"]').exists()).toBe(true)
    expect(w.text()).toContain('ADP-02')
  })

  it('says when the branch has no depot point and no fix was recorded', async () => {
    const w = await mountDrawer(
      detail(
        {
          depotLatitude: null,
          depotLongitude: null,
          latitude: null,
          longitude: null,
          radiusM: null,
        },
        '',
      ),
    )
    expect(w.find('[data-testid="base-map"]').exists()).toBe(false)
    expect(w.get('[data-testid="drawer-no-map"]').text()).toBe(
      'depotAttendance.drawer.noDepotPoint',
    )
    expect(w.text()).toContain('depotAttendance.drawer.noSelfie')
  })
})
