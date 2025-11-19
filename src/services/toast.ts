import ToastLife from '@/constants/toastLife'
import type { ToastMessageOptions } from 'primevue'

/**
 * Creates a standard error toast notification
 * @param e The error object or message
 * @param group The toast group identifier
 * @returns ToastMessageOptions for error display
 */
function commonErrorToast(e: unknown, group: string): ToastMessageOptions {
  return {
    severity: 'error',
    summary: 'Error',
    detail: e,
    life: ToastLife.TWO_SECONDS,
    group: group,
  }
}

/**
 * Creates a standard success toast notification
 * @param message The success message to display
 * @param group The toast group identifier
 * @returns ToastMessageOptions for success display
 */
function commonSuccessToast(message: string, group: string): ToastMessageOptions {
  return {
    severity: 'success',
    summary: message,
    life: ToastLife.TWO_SECONDS,
    group: group,
  }
}

export { commonErrorToast, commonSuccessToast }
