import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ApprovalTimeline from './ApprovalTimeline.vue'
import { ApiError } from '@/types/api.type'
import type { ApprovalRequestDetail } from '@/types/approval.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const mockUseApproval = vi.fn()
vi.mock('@/composables/useApproval', () => ({
  useApproval: (...args: unknown[]) => mockUseApproval(...args),
}))

function stubApproval(request: ApprovalRequestDetail | null, error: unknown = null) {
  mockUseApproval.mockReturnValue({
    request: ref(request),
    isLoading: ref(false),
    error: ref(error),
    refresh: vi.fn().mockResolvedValue(undefined),
  })
}

const globalStubs = {
  global: {
    stubs: {
      ProgressSpinner: true,
      Tag: {
        name: 'Tag',
        props: ['value', 'severity'],
        template: '<span class="tag">{{ value }}</span>',
      },
      Timeline: {
        name: 'Timeline',
        props: ['value'],
        template:
          '<div><div v-for="item in value" :key="item.tierOrder"><slot name="marker" :item="item" /><slot name="content" :item="item" /></div></div>',
      },
    },
  },
}

function mountTimeline() {
  return mount(ApprovalTimeline, {
    props: { moduleKey: 'sales_order', referenceId: 9 },
    ...globalStubs,
  })
}

describe('ApprovalTimeline empty state', () => {
  beforeEach(() => mockUseApproval.mockReset())

  it('says there is no approval request only when the backend answers 404', () => {
    stubApproval(null, new ApiError('approval request not found', 404))
    expect(mountTimeline().text()).toContain('approvals.timeline.none')
  })

  // SIT: a document's creator without APPROVAL_REQUEST_READ was told their rejected
  // document had "no approval request". A 403 must say access is missing instead.
  it('says access is missing on 403, not that there is no request', () => {
    stubApproval(null, new ApiError('forbidden', 403))
    const text = mountTimeline().text()
    expect(text).toContain('approvals.timeline.forbidden')
    expect(text).not.toContain('approvals.timeline.none')
  })

  it('reports a load failure on any other error', () => {
    stubApproval(null, new ApiError('boom', 500))
    expect(mountTimeline().text()).toContain('approvals.timeline.loadFailed')
  })
})

describe('ApprovalTimeline tiers', () => {
  beforeEach(() => mockUseApproval.mockReset())

  it('shows a rejection reason and marks the unreached tier as skipped', () => {
    stubApproval({
      id: 2,
      approvalFlowId: 1,
      moduleKey: 'sales_order',
      referenceId: 9,
      status: 'rejected',
      currentTierOrder: 1,
      requestedByUserId: 3,
      requestedAt: '2026-09-27T11:34:00Z',
      completedAt: '2026-09-27T11:34:29Z',
      canAct: false,
      tiers: [
        {
          id: 1,
          tierOrder: 1,
          name: 'Supervisor',
          status: 'rejected',
          actedByEmployeeId: 12,
          actedByUserId: 5,
          actedAt: '2026-09-27T11:34:29Z',
          comment: 'Harga belum sesuai kesepakatan',
          approvers: [],
        },
        {
          id: 2,
          tierOrder: 2,
          name: 'Manager',
          status: 'skipped',
          actedByEmployeeId: null,
          actedByUserId: null,
          actedAt: null,
          comment: null,
          approvers: [],
        },
      ],
    })

    const text = mountTimeline().text()
    expect(text).toContain('Harga belum sesuai kesepakatan')
    expect(text).toContain('approvals.tierStatus.skipped')
  })
})
