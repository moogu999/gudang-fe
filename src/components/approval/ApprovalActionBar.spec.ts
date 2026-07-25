import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ApprovalActionBar from './ApprovalActionBar.vue'
import type { ApprovalRequestDetail } from '@/types/approval.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}))

const mockUseApproval = vi.fn()
vi.mock('@/composables/useApproval', () => ({
  useApproval: (...args: unknown[]) => mockUseApproval(...args),
}))

const mockUserId = ref<number | null>(1)
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ userId: mockUserId.value }),
}))

function stubApproval(
  request: ApprovalRequestDetail | null,
  overrides: Partial<{ isLoading: boolean }> = {},
) {
  mockUseApproval.mockReturnValue({
    request: ref(request),
    isLoading: ref(overrides.isLoading ?? false),
    error: ref(null),
    refresh: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn().mockResolvedValue(undefined),
  })
}

function baseRequest(overrides: Partial<ApprovalRequestDetail> = {}): ApprovalRequestDetail {
  return {
    id: 1,
    approvalFlowId: 1,
    moduleKey: 'sales_order',
    referenceId: 10,
    status: 'pending',
    currentTierOrder: 1,
    requestedByUserId: 1,
    requestedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    tiers: [],
    canAct: false,
    ...overrides,
  }
}

const globalStubs = {
  global: {
    stubs: {
      Button: {
        name: 'Button',
        props: ['label', 'severity', 'loading', 'icon', 'outlined'],
        emits: ['click'],
        template: '<button @click="$emit(\'click\')">{{ label }}</button>',
      },
      Dialog: {
        name: 'Dialog',
        props: ['visible'],
        template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
      },
      Textarea: {
        name: 'Textarea',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
          '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
    },
  },
}

describe('ApprovalActionBar', () => {
  beforeEach(() => {
    mockUserId.value = 1
    mockUseApproval.mockReset()
  })

  it('shows only Submit when there is no request yet and a flow id is given', () => {
    stubApproval(null)
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10, submitFlowId: 5 },
      ...globalStubs,
    })

    expect(wrapper.text()).toContain('approvals.actions.submit')
    expect(wrapper.text()).not.toContain('approvals.actions.approve')
    expect(wrapper.text()).not.toContain('approvals.actions.cancel')
  })

  it('shows nothing when there is no request and no submitFlowId', () => {
    stubApproval(null)
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })

    expect(wrapper.text()).not.toContain('approvals.actions.submit')
  })

  it('shows Approve and Reject when pending and canAct is true', () => {
    stubApproval(baseRequest({ canAct: true, requestedByUserId: 999 }))
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })

    expect(wrapper.text()).toContain('approvals.actions.approve')
    expect(wrapper.text()).toContain('approvals.actions.reject')
    expect(wrapper.text()).not.toContain('approvals.actions.cancel')
  })

  it('shows Cancel when pending, not actionable, but the viewer is the requester', () => {
    stubApproval(baseRequest({ canAct: false, requestedByUserId: 1 }))
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })

    expect(wrapper.text()).not.toContain('approvals.actions.approve')
    expect(wrapper.text()).toContain('approvals.actions.cancel')
  })

  it('shows no actions once the request is in a terminal state', () => {
    stubApproval(baseRequest({ status: 'approved', canAct: false, requestedByUserId: 1 }))
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })

    expect(wrapper.text()).not.toContain('approvals.actions.approve')
    expect(wrapper.text()).not.toContain('approvals.actions.reject')
    expect(wrapper.text()).not.toContain('approvals.actions.cancel')
  })

  function rejectButtons(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('button').filter((b) => b.text() === 'approvals.actions.reject')
  }

  it('refuses to reject with a blank comment and does not call the reject API', async () => {
    stubApproval(baseRequest({ canAct: true, requestedByUserId: 999 }))
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })
    const { reject } = mockUseApproval.mock.results[0]!.value

    await rejectButtons(wrapper)[0]!.trigger('click')
    await rejectButtons(wrapper)[1]!.trigger('click')

    expect(reject).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('approvals.validation.rejectCommentRequired')
  })

  it('submits the trimmed comment when rejecting with a filled reason', async () => {
    stubApproval(baseRequest({ canAct: true, requestedByUserId: 999 }))
    const wrapper = mount(ApprovalActionBar, {
      props: { moduleKey: 'sales_order', referenceId: 10 },
      ...globalStubs,
    })
    const { reject } = mockUseApproval.mock.results[0]!.value

    await rejectButtons(wrapper)[0]!.trigger('click')
    await wrapper.find('textarea').setValue('  not good  ')
    await rejectButtons(wrapper)[1]!.trigger('click')

    expect(reject).toHaveBeenCalledWith('not good')
  })
})
