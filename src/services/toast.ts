import ToastLife from '@/common/enum/toastLife'
import type { ToastMessageOptions } from 'primevue'

function commonErrorToast(e: unknown, group: string): ToastMessageOptions {
  return {
    severity: 'error',
    summary: 'Error',
    detail: e,
    life: ToastLife.TWO_SECONDS,
    group: group,
  }
}

export { commonErrorToast }
