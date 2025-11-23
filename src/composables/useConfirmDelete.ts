import { ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
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
  const { t } = useI18n()
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
          commonSuccessToast(t('common.messages.deleteSuccess', { entity: capitalize(entityName) }), overlayGroup)
        )

        onSuccess?.()
      } catch (e) {
        toast.add(commonErrorToast(e, overlayGroup))
      }
    }

    confirm.require({
      group: overlayGroup,
      message: customMessage || t('common.messages.confirmDelete', { entity: entityName }),
      header: t('common.confirmation.delete'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: t('common.confirmation.no'),
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: t('common.confirmation.yes'),
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
