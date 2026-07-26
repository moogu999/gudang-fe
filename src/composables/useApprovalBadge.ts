import { ref } from 'vue'
import { ApprovalsService } from '@/services/approvals.service'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/constants/permissions'

// Module-level (singleton) state so every consumer — sidebar, header, etc. — shares one count.
const pendingApprovalCount = ref(0)

async function refreshApprovalBadge(): Promise<void> {
  const authStore = useAuthStore()
  if (!authStore.hasPermission(PERMISSIONS.APPROVAL_REQUEST_READ)) {
    pendingApprovalCount.value = 0
    return
  }

  try {
    const result = await ApprovalsService.listPendingForMe()
    pendingApprovalCount.value = result.hasEmployeeLink ? result.data.length : 0
  } catch {
    pendingApprovalCount.value = 0
  }
}

export function useApprovalBadge() {
  return { pendingApprovalCount, refreshApprovalBadge }
}
