import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SalesmanTargetAchievementTab from './SalesmanTargetAchievementTab.vue'
import { ApiError } from '@/types/api.type'
import type { SalesmanTarget, SalesmanTargetAchievement } from '@/types/salesmanTarget.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, te: () => false, locale: { value: 'en-US' } }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const achievement = vi.fn()
vi.mock('@/services', () => ({
  SalesmanTargetsService: { achievement: (...a: unknown[]) => achievement(...a) },
}))

const ctn = { uomId: 2, name: 'Carton', symbol: 'CTN', factorToBase: '10', isBase: false }
const pcs = { uomId: 1, name: 'Piece', symbol: 'PCS', factorToBase: '1', isBase: true }

function makeTarget(overrides: Partial<SalesmanTarget> = {}): SalesmanTarget {
  return {
    id: 1,
    hasValue: true,
    hasQty: true,
    source: 'internal',
    status: 'active',
    items: [
      {
        id: 11,
        productId: 5,
        productName: 'Noodle',
        uomId: 2,
        units: [ctn, pcs],
        sortOrder: 0,
        alsoIn: [],
      },
      { id: 12, categoryOptionId: 9, categoryName: 'Snacks', units: [], sortOrder: 1, alsoIn: [] },
    ],
    lines: [
      {
        id: 1,
        employeeId: 100,
        employeeName: 'Fajar',
        employeeActive: false,
        targetValue: '1000',
        cells: { '11': '100' },
      },
      { id: 2, employeeId: 101, employeeName: 'Budi', employeeActive: true, cells: {} },
    ],
    ...overrides,
  } as unknown as SalesmanTarget
}

const response: SalesmanTargetAchievement = {
  targetId: 1,
  asOf: '2026-10-07T06:00:00Z',
  workingDays: { total: 26, elapsed: 6 },
  lines: [{ employeeId: 100, achievedValue: '230', cells: { '11': '50', '12': '8' } }],
  totals: { achievedValue: '230', cells: { '11': '50', '12': '8' } },
}

const stubs = {
  Message: { template: '<div><slot /></div>' },
  Button: { template: '<button />' },
  Tag: { props: ['value'], template: '<span class="tag">{{ value }}</span>' },
  SelectButton: { template: '<div class="toggle" />' },
  AchievementSkuDialog: { template: '<div class="sku-dialog" />' },
}

async function mountTab(target: SalesmanTarget) {
  const wrapper = mount(SalesmanTargetAchievementTab, {
    props: { target, reloadKey: 0, toastGroup: 'g' },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  achievement.mockReset().mockResolvedValue(response)
})

describe('SalesmanTargetAchievementTab', () => {
  it('hides the toggle when only one target type is on', async () => {
    const wrapper = await mountTab(makeTarget({ hasQty: false }))
    expect(wrapper.find('.toggle').exists()).toBe(false)
  })

  it('shows the toggle when both types are on', async () => {
    const wrapper = await mountTab(makeTarget())
    expect(wrapper.find('.toggle').exists()).toBe(true)
  })

  it('marks an inactive salesman and shows no % for an empty target', async () => {
    const wrapper = await mountTab(makeTarget())
    expect(wrapper.text()).toContain('salesmanTargets.grid.inactive')
    const budi = wrapper.findAll('tbody tr')[1]
    expect(budi.text()).toContain('—')
  })

  it('shows a draft-race 409 as the not-active message', async () => {
    achievement.mockRejectedValue(new ApiError('x', 409, 'TARGET_NOT_ACTIVE'))
    const wrapper = await mountTab(makeTarget())
    expect(wrapper.text()).toContain('salesmanTargets.achievement.notActive')
  })
})
