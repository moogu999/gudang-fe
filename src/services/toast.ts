import ToastLife from '@/constants/toastLife'
import type { ToastMessageOptions } from 'primevue'

/**
 * Creates a standard error toast notification
 * @param e The error object or message
 * @param group The toast group identifier
 * @returns ToastMessageOptions for error display
 */
function commonErrorToast(e: unknown, group: string): ToastMessageOptions {
  // Extract error message from Error object or use as-is if it's a string
  const errorMessage = e instanceof Error ? e.message : String(e)

  return {
    severity: 'error',
    summary: 'Error',
    detail: errorMessage,
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

/**
 * Creates a standard warning toast notification
 * @param message The warning message to display
 * @param group The toast group identifier
 * @returns ToastMessageOptions for warning display
 */
function commonWarnToast(message: string, group: string): ToastMessageOptions {
  return {
    severity: 'warn',
    summary: 'Validation Error',
    detail: message,
    life: ToastLife.TWO_SECONDS,
    group: group,
  }
}

export { commonErrorToast, commonSuccessToast, commonWarnToast }
