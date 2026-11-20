import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { flushPromises, mount } from '@vue/test-utils'
import type { Warehouse } from '@/types/warehouse.type'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/stores', () => ({ useAuthStore: () => ({ userId: 1 }) }))

const update = vi.fn()
const emptyPage = { data: [], meta: { total: 0, limit: 10, offset: 0 } }
vi.mock('@/services', () => ({
  BranchesService: { list: vi.fn(async () => emptyPage) },
  EmployeesService: { listForSelect: vi.fn(async () => emptyPage) },
  EmployeeTypesService: {
    list: vi.fn(async () => ({
      data: [{ id: 7, name: 'Canvass' }],
      meta: { total: 1, limit: 10, offset: 0 },
    })),
  },
  WarehousesService: {
    create: vi.fn(),
    update: (...a: unknown[]) => update(...a),
  },
}))

import WarehouseDialog from './WarehouseDialog.vue'
import DialogMode from '@/constants/dialogMode'

const base: Warehouse = {
  id: 5,
  code: 'WH1',
  name: 'Main',
  branchId: 2,
  branchCode: 'B2',
  branchName: 'Branch Two',
  kind: 'regular',
  salesmanEmployeeId: null,
  salesmanName: null,
  salesmanNip: null,
  createdAt: '',
  createdBy: 1,
  createdByEmail: '',
  updatedAt: null,
  updatedBy: null,
  updatedByEmail: null,
}

async function mountDialog(warehouse: Warehouse) {
  const wrapper = mount(WarehouseDialog, {
    props: { mode: DialogMode.EDIT, warehouse },
    global: { plugins: [PrimeVue], stubs: { Toast: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => vi.clearAllMocks())

describe('WarehouseDialog kind', () => {
  it('hides the salesman picker for a regular warehouse', async () => {
    const wrapper = await mountDialog(base)
    expect(wrapper.find('[data-testid="salesman"]').exists()).toBe(false)
  })

  it('shows the salesman picker and locks the branch for a canvass warehouse', async () => {
    const wrapper = await mountDialog({
      ...base,
      kind: 'canvass',
      salesmanEmployeeId: 9,
      salesmanName: 'Budi',
    })
    expect(wrapper.find('[data-testid="salesman"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('warehouses.labels.branchFromSalesman')
  })

  it('saves a canvass warehouse with its salesman', async () => {
    update.mockResolvedValue(undefined)
    const wrapper = await mountDialog({
      ...base,
      kind: 'canvass',
      salesmanEmployeeId: 9,
      salesmanName: 'Budi',
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ kind: 'canvass', salesmanEmployeeId: 9, branchId: 2 }),
    )
  })

  it('refuses a canvass warehouse without a salesman', async () => {
    const wrapper = await mountDialog({ ...base, kind: 'canvass' })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(update).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('warehouses.validation.salesmanRequired')
  })

  it('never sends a salesman for a regular warehouse', async () => {
    update.mockResolvedValue(undefined)
    const wrapper = await mountDialog(base)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ kind: 'regular', salesmanEmployeeId: null }),
    )
  })
})
