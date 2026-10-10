import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SalesTeamAddMemberDialog from './SalesTeamAddMemberDialog.vue'
import { ApiError } from '@/types/api.type'
import type { MemberCandidate } from '@/types/salesTeam.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const addMember = vi.fn()
const memberCandidates = vi.fn()
vi.mock('@/services', () => ({
  SalesTeamsService: {
    addMember: (...args: unknown[]) => addMember(...args),
    memberCandidates: (...args: unknown[]) => memberCandidates(...args),
    memberCandidatesForSelect: vi.fn(),
  },
}))

const free: MemberCandidate = {
  employee: { id: 11, name: 'Budi', nip: 'S-011', isActive: true },
}
const inAnotherTeam: MemberCandidate = {
  employee: { id: 12, name: 'Sari', nip: 'S-012', isActive: true },
  currentTeam: { id: 8, code: 'TM-008', name: 'GT Selatan', skuCount: 40, startDate: '2026-01-05' },
}

// Picking a candidate is the only thing the tests need from the select.
const InfiniteSelectStub = defineComponent({
  name: 'InfiniteSelect',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(_, { emit }) {
    return () =>
      h('div', [
        h('button', { class: 'pick-free', onClick: () => emit('update:modelValue', free) }),
        h('button', {
          class: 'pick-moving',
          onClick: () => emit('update:modelValue', inAnotherTeam),
        }),
      ])
  },
})

const MoveStub = defineComponent({
  name: 'SalesTeamMoveMemberDialog',
  props: ['candidate', 'team', 'initialDate', 'toastGroup'],
  emits: ['close', 'moved'],
  setup(props) {
    return () => h('div', { class: 'move-dialog' }, props.candidate.employee.name)
  },
})

function mountDialog() {
  return mount(SalesTeamAddMemberDialog, {
    props: { team: { id: 5, code: 'TM-005', name: 'MT Utara', skuCount: 12 }, toastGroup: 'test' },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        DatePicker: { template: '<input />' },
        InfiniteSelect: InfiniteSelectStub,
        SalesTeamMoveMemberDialog: MoveStub,
        Button: {
          props: ['label', 'disabled'],
          emits: ['click'],
          template:
            '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })
}

beforeEach(() => {
  addMember.mockReset().mockResolvedValue({})
  memberCandidates.mockReset()
})

describe('SalesTeamAddMemberDialog', () => {
  it('adds a salesman who is in no team with move: false and a calendar date', async () => {
    const wrapper = mountDialog()
    await wrapper.find('.pick-free').trigger('click')
    await wrapper.find('[data-testid="submit-member"]').trigger('click')
    await flushPromises()

    expect(addMember).toHaveBeenCalledWith(5, {
      employeeId: 11,
      startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      move: false,
    })
    expect(wrapper.emitted('added')).toHaveLength(1)
  })

  it('asks to confirm a move instead of posting when the salesman is in another team', async () => {
    const wrapper = mountDialog()
    await wrapper.find('.pick-moving').trigger('click')
    await wrapper.find('[data-testid="submit-member"]').trigger('click')
    await flushPromises()

    expect(addMember).not.toHaveBeenCalled()
    expect(wrapper.find('.move-dialog').text()).toBe('Sari')
  })

  it('switches to the move confirmation when the salesman joined a team meanwhile', async () => {
    addMember.mockRejectedValueOnce(new ApiError('the employee is a member of another team', 409))
    memberCandidates.mockResolvedValueOnce({
      data: [{ ...inAnotherTeam, employee: { ...inAnotherTeam.employee, id: 11 } }],
      meta: { total: 1, limit: 50, offset: 0 },
    })

    const wrapper = mountDialog()
    await wrapper.find('.pick-free').trigger('click')
    await wrapper.find('[data-testid="submit-member"]').trigger('click')
    await flushPromises()

    expect(memberCandidates).toHaveBeenCalledWith(5, expect.stringContaining('q=S-011'))
    expect(wrapper.find('.move-dialog').exists()).toBe(true)
    expect(wrapper.emitted('added')).toBeUndefined()
  })

  it('reports a confirmed move to the parent', async () => {
    const wrapper = mountDialog()
    await wrapper.find('.pick-moving').trigger('click')
    await wrapper.find('[data-testid="submit-member"]').trigger('click')
    await flushPromises()

    wrapper.findComponent(MoveStub).vm.$emit('moved')
    expect(wrapper.emitted('added')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
