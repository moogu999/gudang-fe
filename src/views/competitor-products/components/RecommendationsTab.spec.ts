import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: { template: '<a><slot /></a>' },
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const list = vi.fn()
vi.mock('@/services', () => ({
  CompetitorProductRecommendationsService: {
    list: (...a: unknown[]) => list(...a),
    reject: vi.fn(),
  },
  CompetitorProductsService: {},
}))

import RecommendationsTab from './RecommendationsTab.vue'

const rec = {
  id: 1,
  name: 'Sedaap Goreng',
  status: 'pending',
  createdAt: '2026-10-11T00:00:00Z',
  submitter: { employeeId: 1, name: 'Budi' },
  suggestions: [
    {
      competitorProductId: 7,
      code: 'CP-7',
      name: 'Mie Sedaap Goreng',
      brandName: 'Sedaap',
      score: 0.82,
    },
  ],
  siblingIds: [2, 3],
}

function mountTab(canWrite: boolean) {
  list.mockResolvedValue({ data: [rec], meta: { total: 1, limit: 20, offset: 0 } })
  return mount(RecommendationsTab, {
    props: { canWrite, toastGroup: 'g' },
    global: {
      plugins: [PrimeVue],
      stubs: { MergeRecommendationDialog: true, Dialog: true, Select: true, Paginator: true },
    },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('RecommendationsTab', () => {
  it('shows the top suggestion and the sibling count', async () => {
    const wrapper = mountTab(true)
    await flushPromises()
    const box = wrapper.get('[data-testid="suggestion"]').text()
    expect(box).toContain('Mie Sedaap Goreng')
    expect(box).toContain('CP-7')
    expect(box).toContain('competitorProducts.recommendations.siblings')
  })

  it('asks the server for pending recommendations by default', async () => {
    mountTab(true)
    await flushPromises()
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', limit: 20, offset: 0 }),
    )
  })

  it('has no action column without write', async () => {
    const wrapper = mountTab(false)
    await flushPromises()
    expect(wrapper.find('[data-testid="actions"]').exists()).toBe(false)
  })
})
