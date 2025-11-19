import { ref, type Ref } from 'vue'

interface UseDialogOptions {
  onClose?: () => void | Promise<void>
}

interface UseDialogReturn {
  isVisible: Ref<boolean>
  open: () => void
  close: () => Promise<void>
  toggle: () => Promise<void>
}

/**
 * Composable for managing dialog visibility state
 * Provides consistent dialog open/close behavior with optional callbacks
 *
 * @param options Configuration options
 * @returns Object with dialog state and control functions
 *
 * @example
 * ```typescript
 * const { isVisible, open, close } = useDialog({
 *   onClose: async () => {
 *     await table.value.clearSearch()
 *   }
 * })
 *
 * // In template: <Dialog v-model:visible="isVisible" @hide="close">
 * // In button: <Button @click="open">Add User</Button>
 * ```
 */
export function useDialog(options: UseDialogOptions = {}): UseDialogReturn {
  const { onClose } = options
  const isVisible = ref(false)

  /**
   * Open the dialog
   */
  function open() {
    isVisible.value = true
  }

  /**
   * Close the dialog and execute onClose callback
   */
  async function close() {
    isVisible.value = false
    if (onClose) {
      await onClose()
    }
  }

  /**
   * Toggle dialog visibility
   * If closing, executes onClose callback
   */
  async function toggle() {
    if (isVisible.value) {
      await close()
    } else {
      open()
    }
  }

  return {
    isVisible,
    open,
    close,
    toggle,
  }
}
