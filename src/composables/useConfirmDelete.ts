import { ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'

interface UseConfirmDeleteOptions {
  overlayGroup: string
  entityName: string
  onSuccess?: () => void
}

/**
 * Composable for handling delete confirmation pattern
 *
 * @param options Configuration options
 * @returns Object with confirmDelete handler and deleteAcceptanceHandler ref
 *
 * @example
 * const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
 *   overlayGroup: 'usersView',
 *   entityName: 'user',
 *   onSuccess: () => table.value.clearSearch()
 * })
 *
 * // In template: <ConfirmationDialog :accept-handler="deleteAcceptanceHandler" />
 * // In button click: confirmDelete(() => UsersService.delete(id))
 */
export function useConfirmDelete(options: UseConfirmDeleteOptions) {
  const { overlayGroup, entityName, onSuccess } = options
  const confirm = useConfirm()
  const toast = useToast()
  const deleteAcceptanceHandler = ref(async () => {})

  /**
   * Show confirmation dialog and execute delete action on acceptance
   *
   * @param deleteAction Async function that performs the delete operation
   * @param customMessage Optional custom confirmation message
   */
  function confirmDelete(
    deleteAction: () => Promise<void>,
    customMessage?: string
  ) {
    deleteAcceptanceHandler.value = async () => {
      try {
        await deleteAction()

        toast.add(
          commonSuccessToast(`${capitalize(entityName)} is deleted.`, overlayGroup)
        )

        onSuccess?.()
      } catch (e) {
        toast.add(commonErrorToast(e, overlayGroup))
      }
    }

    confirm.require({
      group: overlayGroup,
      message: customMessage || `Are you sure you want to delete the ${entityName}?`,
      header: 'Delete',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: 'No',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: 'Yes',
      },
    })
  }

  return {
    confirmDelete,
    deleteAcceptanceHandler,
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
