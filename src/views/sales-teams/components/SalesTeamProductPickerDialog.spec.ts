import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SalesTeamProductPickerDialog from './SalesTeamProductPickerDialog.vue'
import { DataTableStub } from '@/views/ar-clearings/components/dataTableStub'
import type { PickerCandidate } from '@/types/salesTeam.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const pickerTree = vi.fn()
const pickerCandidates = vi.fn()
const addProducts = vi.fn()
vi.mock('@/services', () => ({
  SalesTeamsService: {
    pickerTree: (...args: unknown[]) => pickerTree(...args),
    pickerCandidates: (...args: unknown[]) => pickerCandidates(...args),
    addProducts: (...args: unknown[]) => addProducts(...args),
  },
}))

function candidate(productId: number, inThisTeam = false): PickerCandidate {
  return {
    productId,
    code: `P${productId}`,
    name: `Product ${productId}`,
    inThisTeam,
    otherTeams: [],
  }
}

function page(items: PickerCandidate[], total = items.length) {
  return { data: items, meta: { total, limit: 100, offset: 0 } }
}

const SelectButtonStub = defineComponent({
  name: 'SelectButton',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        class: 'segment',
        onClick: () => emit('update:modelValue', 'all'),
      })
  },
})

const TreeStub = defineComponent({
  name: 'TreeStub',
  props: ['value'],
  emits: ['node-select', 'node-unselect', 'update:selectionKeys', 'update:expandedKeys'],
  setup(props, { emit }) {
    // One button per category node, so a test can pick one.
    return () =>
      h(
        'div',
        {},
        ((props.value ?? []) as { children?: { children?: { key: string }[] }[] }[]).flatMap(
          (root) =>
            (root.children ?? []).flatMap((principal) =>
              (principal.children ?? []).map((node) =>
                h('button', {
                  class: 'tree-node',
                  'data-key': node.key,
                  onClick: () => emit('node-select', node),
                }),
              ),
            ),
        ),
      )
  },
})

const stubs = {
  Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
  DataTable: DataTableStub,
  Column: { template: '<div />' },
  SelectButton: SelectButtonStub,
  Tree: TreeStub,
  Tag: { props: ['value'], template: '<span class="tag">{{ value }}</span>' },
  IconField: { template: '<div><slot /></div>' },
  InputIcon: { template: '<span />' },
  InputText: { template: '<input />' },
  Button: {
    props: ['label', 'disabled'],
    emits: ['click'],
    template:
      '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
  },
}

function mountPicker() {
  return mount(SalesTeamProductPickerDialog, {
    props: { team: { id: 5, code: 'TM-005', skuCount: 3 }, toastGroup: 'test' },
    global: { stubs, directives: { tooltip: {} } },
  })
}

beforeEach(() => {
  pickerTree.mockReset().mockResolvedValue([
    {
      principalOptionId: 1,
      name: 'Indofood',
      count: 2,
      categories: [{ categoryOptionId: 9, name: 'Noodle', count: 2 }, { count: 1 }],
    },
  ])
  pickerCandidates
    .mockReset()
    .mockResolvedValue(page([candidate(1), candidate(2, true), candidate(3)]))
  addProducts.mockReset().mockResolvedValue({ added: 2, skipped: 0 })
})

describe('SalesTeamProductPickerDialog', () => {
  it("doesn't select a product the team already carries", async () => {
    const wrapper = mountPicker()
    await flushPromises()
    const boxes = wrapper.findAll('.row-checkbox')
    await boxes[1]!.trigger('change')
    expect(wrapper.find('[data-testid="picker-summary"]').text()).toBe('salesTeams.picker.selected')
    expect(wrapper.find('[data-testid="picker-add"]').attributes('disabled')).toBeDefined()
  })

  it('select-all takes only the selectable rows of the page', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.find('.select-all').trigger('change')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    await flushPromises()
    expect(addProducts).toHaveBeenCalledWith(5, [1, 3])
  })

  it('keeps the selection across pages and segment changes', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0]!.trigger('change')

    pickerCandidates.mockResolvedValueOnce(page([candidate(4)]))
    await wrapper.find('.segment').trigger('click')
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0]!.trigger('change')

    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    await flushPromises()
    expect(addProducts).toHaveBeenCalledWith(5, [1, 4])
  })

  it('refetches both the tree and the table when the segment changes', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    pickerTree.mockClear()
    pickerCandidates.mockClear()

    await wrapper.find('.segment').trigger('click')
    await flushPromises()

    expect(pickerTree).toHaveBeenCalledWith(5, 'all')
    expect(pickerCandidates).toHaveBeenCalledWith(5, expect.objectContaining({ segment: 'all' }))
  })

  it('filters by the picked tree node, including the uncategorised bucket', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.find('[data-key="p:1|c:9"]').trigger('click')
    await flushPromises()
    expect(pickerCandidates).toHaveBeenLastCalledWith(
      5,
      expect.objectContaining({ principalOptionId: 1, categoryOptionId: 9, offset: 0 }),
    )

    await wrapper.find('[data-key="p:1|c:none"]').trigger('click')
    await flushPromises()
    const last = pickerCandidates.mock.calls.at(-1)![1]
    expect(last).toMatchObject({ principalOptionId: 1, noCategory: true })
    expect(last.categoryOptionId).toBeUndefined()
  })

  it('emits added and close after adding', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.findAll('.row-checkbox')[0]!.trigger('change')
    await wrapper.find('[data-testid="picker-add"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('added')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
