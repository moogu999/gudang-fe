import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SalesTeamMembersTab from './SalesTeamMembersTab.vue'
import { DataTableStub } from '@/views/ar-clearings/components/dataTableStub'
import type { SalesTeam, SalesTeamMember } from '@/types/salesTeam.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const listMembers = vi.fn()
vi.mock('@/services', () => ({
  SalesTeamsService: { listMembers: (...args: unknown[]) => listMembers(...args) },
}))

const current: SalesTeamMember = {
  membershipId: 1,
  employee: { id: 11, name: 'Budi Santoso', isActive: true },
  startDate: '2026-10-01',
  isCurrent: true,
}
const past: SalesTeamMember = {
  membershipId: 2,
  employee: { id: 12, name: 'Sari', isActive: true },
  startDate: '2026-01-01',
  endDate: '2026-09-30',
  isCurrent: false,
}

const team = { id: 5, code: 'TM-005', isActive: true } as SalesTeam

const ToggleStub = defineComponent({
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'show-history',
        onClick: () => emit('update:modelValue', !props.modelValue),
      })
  },
})

function mountTab(canWrite = true) {
  return mount(SalesTeamMembersTab, {
    props: { team, canWrite, toastGroup: 'test' },
    global: {
      stubs: {
        DataTable: DataTableStub,
        ToggleSwitch: ToggleStub,
        Tag: { template: '<span />' },
        SalesTeamAddMemberDialog: true,
        SalesTeamEndMemberDialog: true,
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })
}

beforeEach(() => {
  listMembers.mockReset().mockResolvedValue([current, past])
})

describe('SalesTeamMembersTab', () => {
  it('refetches with includeHistory when the toggle flips', async () => {
    const wrapper = mountTab()
    await flushPromises()
    expect(listMembers).toHaveBeenLastCalledWith(5, false)

    await wrapper.find('[data-testid="show-history"]').trigger('click')
    await flushPromises()
    expect(listMembers).toHaveBeenLastCalledWith(5, true)
  })

  it('offers End membership on current rows only', async () => {
    const wrapper = mountTab()
    await flushPromises()
    const rows = wrapper.findAll('.row')
    expect(rows[0]!.find('[data-testid="end-member"]').exists()).toBe(true)
    expect(rows[1]!.find('[data-testid="end-member"]').exists()).toBe(false)
  })

  it('hides the write actions without permission', async () => {
    const wrapper = mountTab(false)
    await flushPromises()
    expect(wrapper.find('[data-testid="add-member"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="end-member"]').exists()).toBe(false)
  })
})
