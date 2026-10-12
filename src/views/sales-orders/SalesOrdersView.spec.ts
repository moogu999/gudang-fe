import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PrimeVue from 'primevue/config'
import SalesOrdersView from './SalesOrdersView.vue'

const { canWrite } = vi.hoisted(() => ({ canWrite: { value: true } }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/composables', () => ({
  usePermissions: () => ({ canWrite: ref(canWrite.value) }),
}))

// Renders the actions cell of one draft sales order, the row the Edit button shows on.
const TableStub = defineComponent({
  setup(_, { slots }) {
    return () =>
      h(
        'div',
        slots.content?.({
          col: { field: 'actions', header: 'common.labels.actions' },
          data: { id: 7, status: 'draft', salesOrderType: { code: 'regular' } },
        }),
      )
  },
})

function mountView() {
  return mount(SalesOrdersView, {
    global: {
      plugins: [PrimeVue],
      stubs: { TableComponent: TableStub, ResponsiveButton: true, ResponsiveCard: false },
    },
  })
}

beforeEach(() => {
  canWrite.value = true
})

describe('SalesOrdersView write gating', () => {
  it('offers Add and Edit to a user with SALES_ORDER_WRITE', () => {
    const wrapper = mountView()
    expect(wrapper.find('responsive-button-stub').exists()).toBe(true)
    expect(wrapper.find('.pi-pencil').exists()).toBe(true)
  })

  it('hides Add and Edit from a read-only user, keeping View', () => {
    canWrite.value = false
    const wrapper = mountView()
    expect(wrapper.find('responsive-button-stub').exists()).toBe(false)
    expect(wrapper.find('.pi-pencil').exists()).toBe(false)
    expect(wrapper.find('.pi-eye').exists()).toBe(true)
  })
})
