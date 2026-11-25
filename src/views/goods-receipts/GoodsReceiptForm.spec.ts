import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Component } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import GoodsReceiptForm from './GoodsReceiptForm.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'

const { auth, services, setFieldValue, stubs } = vi.hoisted(() => ({
  auth: { branchIds: [] as number[], primaryBranchId: null as number | null, userId: 1 },
  services: {
    warehousesList: vi.fn(),
    branchesList: vi.fn(),
    availablePOs: vi.fn(),
    getReceipt: vi.fn(),
  },
  setFieldValue: vi.fn(),
  stubs: {} as { select?: Component },
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: ref('en-US') }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/composables', () => ({
  useNumberSeries: () => ({
    codeMode: ref('auto'),
    previewCode: ref(''),
    seriesId: ref(null),
    loading: ref(false),
    hasDefaultSeries: ref(true),
    generateCode: vi.fn(),
  }),
}))
vi.mock('@/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services')>()),
  WarehousesService: { list: services.warehousesList },
  BranchesService: { list: services.branchesList },
  SuppliersService: { get: vi.fn(), listForSelect: vi.fn() },
  GoodsReceiptsService: {
    get: services.getReceipt,
    listAvailablePurchaseOrders: services.availablePOs,
  },
  PurchaseOrderHeadersService: { getById: vi.fn() },
  PurchaseOrderDetailsService: { list: vi.fn().mockResolvedValue({ data: [] }) },
  TaxConfigurationService: { get: vi.fn().mockResolvedValue({ percentage: '11' }) },
}))

// The Form renders its slot with an empty $form and exposes setFieldValue, so the test can
// see the form being told to clear a field.
vi.mock('@primevue/forms/form', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      setup(_, { slots, expose }) {
        expose({ setFieldValue })
        return () => h('form', slots.default?.({}))
      },
    }),
  }
})

// Records the props each select is given; the branch select can emit a pick.
vi.mock('@/components/select/InfiniteSelect.vue', async () => {
  const { defineComponent, h } = await import('vue')
  stubs.select = defineComponent({
    name: 'InfiniteSelect',
    props: ['modelValue', 'fetchFn', 'customFilters', 'disabled', 'placeholder', 'initialOption'],
    emits: ['select-option', 'update:modelValue'],
    setup: () => () => h('div'),
  })
  return { default: stubs.select }
})

function mountForm(props: { mode: DialogMode.ADD | DialogMode.EDIT; goodsReceiptId?: number }) {
  return mount(GoodsReceiptForm, {
    props,
    global: {
      plugins: [PrimeVue],
      stubs: {
        Toast: true,
        ConfirmDialog: true,
        ApprovalTimeline: true,
        ApprovalActionBar: true,
        GoodsReceiptDetailsTable: true,
        PurchaseOrderReceiptLinesTable: true,
      },
    },
  })
}

function select(wrapper: VueWrapper, which: 'warehouseId' | 'branchId' | 'po') {
  const all = wrapper.findAllComponents(stubs.select!)
  const found =
    which === 'po'
      ? all.find((s) => s.attributes('id') === undefined)
      : all.find((s) => s.attributes('id') === which)
  if (!found) throw new Error(`no ${which} select`)
  return found
}

function prop(stub: ReturnType<typeof select>, name: string): unknown {
  return (stub.props() as Record<string, unknown>)[name]
}

function fetchFrom(stub: ReturnType<typeof select>, query: string) {
  return (prop(stub, 'fetchFn') as (q: string) => Promise<unknown>)(query)
}

const branchFilter = (id: number) => ({
  filterBy: 'branch_id',
  filterOperator: FilterOperator.EQUAL,
  filterValue: id,
})

beforeEach(() => {
  vi.clearAllMocks()
  auth.branchIds = []
  auth.primaryBranchId = null
  services.branchesList.mockImplementation(async (query: string) => {
    const id = Number(new URLSearchParams(query).get('filterValue'))
    return { data: [{ id, code: `B${id}`, name: `Branch ${id}` }] }
  })
  services.availablePOs.mockResolvedValue({ data: [], meta: {} })
})

describe('GoodsReceiptForm: the receipt branch drives warehouses and POs', () => {
  it('a single-branch user is offered that branch’s warehouses and POs', async () => {
    auth.branchIds = [5]
    const wrapper = mountForm({ mode: DialogMode.ADD })
    await flushPromises()

    const warehouse = select(wrapper, 'warehouseId')
    expect(prop(warehouse, 'customFilters')).toContainEqual(branchFilter(5))
    expect(prop(warehouse, 'disabled')).toBe(false)

    await fetchFrom(select(wrapper, 'po'), 'page=1')
    expect(services.availablePOs).toHaveBeenCalledWith('page=1', 5)
  })

  it('a multi-branch user starts on the primary branch, and changing it clears warehouse and PO', async () => {
    auth.branchIds = [3, 4]
    auth.primaryBranchId = 4
    const wrapper = mountForm({ mode: DialogMode.ADD })
    await flushPromises()

    expect(prop(select(wrapper, 'warehouseId'), 'customFilters')).toContainEqual(branchFilter(4))

    select(wrapper, 'branchId').vm.$emit('select-option', { id: 3, name: 'Branch 3' })
    await flushPromises()

    expect(setFieldValue).toHaveBeenCalledWith('warehouseId', undefined)
    expect(prop(select(wrapper, 'warehouseId'), 'customFilters')).toContainEqual(branchFilter(3))
    expect(prop(select(wrapper, 'warehouseId'), 'initialOption')).toBeUndefined()
    expect(prop(select(wrapper, 'po'), 'modelValue')).toBeUndefined()

    await fetchFrom(select(wrapper, 'po'), '')
    expect(services.availablePOs).toHaveBeenCalledWith('', 3)
  })

  it('picking the branch already chosen clears nothing', async () => {
    auth.branchIds = [3, 4]
    auth.primaryBranchId = 4
    const wrapper = mountForm({ mode: DialogMode.ADD })
    await flushPromises()

    select(wrapper, 'branchId').vm.$emit('select-option', { id: 4, name: 'Branch 4' })
    await flushPromises()

    expect(setFieldValue).not.toHaveBeenCalled()
  })

  it('a user without branches cannot pick a warehouse or a PO', async () => {
    const wrapper = mountForm({ mode: DialogMode.ADD })
    await flushPromises()

    expect(prop(select(wrapper, 'warehouseId'), 'disabled')).toBe(true)
    expect(prop(select(wrapper, 'warehouseId'), 'placeholder')).toBe(
      'goodsReceipts.labels.selectBranchFirst',
    )
    expect(prop(select(wrapper, 'po'), 'disabled')).toBe(true)
    expect(prop(select(wrapper, 'warehouseId'), 'customFilters')).not.toContainEqual(
      expect.objectContaining({ filterBy: 'branch_id' }),
    )
  })

  it('EDIT offers the saved receipt’s branch’s warehouses', async () => {
    auth.branchIds = [3, 4]
    services.getReceipt.mockResolvedValue({
      id: 1,
      no: 'GR-1',
      receiptDate: '2026-11-20',
      warehouseId: 30,
      warehouseName: 'WT 003',
      arrivalType: 'regular',
      branchId: 4,
      status: 'draft',
      supplierId: null,
      purchaseOrderHeaderId: null,
      subtotalAmount: '0',
      taxAmount: '0',
      totalAmount: '0',
      details: [],
    })
    const wrapper = mountForm({ mode: DialogMode.EDIT, goodsReceiptId: 1 })
    await flushPromises()

    expect(prop(select(wrapper, 'warehouseId'), 'customFilters')).toContainEqual(branchFilter(4))
    expect(prop(select(wrapper, 'warehouseId'), 'disabled')).toBe(false)
  })
})
