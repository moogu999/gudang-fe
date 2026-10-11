import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import ReasonsView from './ReasonsView.vue'
import type { Reason } from '@/types'

const { list, canWrite } = vi.hoisted(() => ({ list: vi.fn(), canWrite: { value: true } }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('@/services', () => ({ ReasonsService: { list } }))
vi.mock('@/composables', () => ({
  usePermissions: () => ({ canWrite: ref(canWrite.value) }),
  useDialog: () => ({ isVisible: ref(false), open: vi.fn(), close: vi.fn() }),
  useConfirmDelete: () => ({
    confirmDelete: vi.fn(),
    deleteAcceptanceHandler: ref(async () => {}),
  }),
}))

function reason(id: number, overrides: Partial<Reason> = {}): Reason {
  return {
    id,
    code: `OTO-0${id}`,
    type: 'customer_no_order',
    name: `Reason ${id}`,
    forTakingOrder: true,
    forCanvass: true,
    requiresPhoto: false,
    requiresNote: false,
    sortOrder: id,
    isActive: true,
    createdAt: '2026-10-10T00:00:00Z',
    ...overrides,
  }
}

async function mountView() {
  const wrapper = mount(ReasonsView, {
    global: {
      plugins: [PrimeVue, ToastService, ConfirmationService],
      directives: { tooltip: Tooltip },
      stubs: {
        ResponsiveButton: true,
        ConfirmationDialog: true,
        ReasonDialog: true,
        TableActionButtons: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  canWrite.value = true
  list.mockResolvedValue({
    data: [
      reason(1),
      reason(2),
      reason(3, { isActive: false }),
      reason(4, { type: 'outside_radius', code: 'RAD-01' }),
    ],
    meta: { total: 4, limit: 4, offset: 0 },
  })
})

describe('ReasonsView', () => {
  it('counts active reasons only in the tab badges', async () => {
    const wrapper = await mountView()
    const badges = wrapper.findAll('.p-badge').map((b) => b.text())
    expect(badges.slice(0, 2)).toEqual(['2', '1'])
  })

  it('shows reorder handles for a writer with no filters', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('.p-datatable-reorderable-row-handle').exists()).toBe(true)
  })

  it('hides reorder handles while searching', async () => {
    const wrapper = await mountView()
    await wrapper.get('input[type="text"]').setValue('Reason')
    expect(wrapper.find('.p-datatable-reorderable-row-handle').exists()).toBe(false)
  })

  it('hides reorder handles without write permission', async () => {
    canWrite.value = false
    const wrapper = await mountView()
    expect(wrapper.find('.p-datatable-reorderable-row-handle').exists()).toBe(false)
  })
})
