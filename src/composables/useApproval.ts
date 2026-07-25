import { ref } from 'vue'
import { ApprovalsService } from '@/services/approvals.service'
import type { ApprovalRequestDetail } from '@/types/approval.type'

/**
 * Shared fetch/act/refresh logic behind ApprovalTimeline and ApprovalActionBar.
 * `canAct` on the fetched request comes straight from the backend and is never
 * re-derived here — see master plan decision on eligibility being server-side only.
 */
export function useApproval(moduleKey: string, referenceId: number) {
  const request = ref<ApprovalRequestDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<unknown>(null)

  async function refresh(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      request.value = await ApprovalsService.getByReference(moduleKey, referenceId)
    } catch (e) {
      request.value = null
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  async function approve(comment?: string): Promise<void> {
    if (!request.value) return
    await ApprovalsService.approve(request.value.id, comment ? { comment } : undefined)
    await refresh()
  }

  async function reject(comment?: string): Promise<void> {
    if (!request.value) return
    await ApprovalsService.reject(request.value.id, comment ? { comment } : undefined)
    await refresh()
  }

  async function cancel(): Promise<void> {
    if (!request.value) return
    await ApprovalsService.cancel(request.value.id)
    await refresh()
  }

  async function submit(flowId: number): Promise<void> {
    await ApprovalsService.submit({ moduleKey, referenceId, flowId })
    await refresh()
  }

  return {
    request,
    isLoading,
    error,
    refresh,
    approve,
    reject,
    cancel,
    submit,
  }
}
