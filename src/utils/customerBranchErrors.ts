import { ApiError } from '@/types/api.type'

/** The customer-branch codes the API returns, and the i18n key of each message. */
const CUSTOMER_BRANCH_ERRORS: Record<string, string> = {
  CUSTOMER_BRANCH_REQUIRED: 'customers.validation.branchRequired',
  CUSTOMER_BRANCH_NOT_ALLOWED: 'customers.messages.branchNotAllowed',
  CUSTOMER_BRANCH_CHANGE: 'customers.messages.branchChange',
  CUSTOMER_PARTNER_BRANCH_MISMATCH: 'customers.messages.partnerBranchMismatch',
  CUSTOMER_CODE_DUPLICATE: 'customers.messages.codeDuplicate',
  CUSTOMER_BRANCH_MISMATCH: 'common.errors.customerBranchMismatch',
}

/** The codes this module knows, for tests. */
export const CUSTOMER_BRANCH_ERROR_CODES = Object.keys(CUSTOMER_BRANCH_ERRORS)

/**
 * Replaces an API error's message with its translation when the code is one of the
 * customer-branch codes, so toasts show localized text rather than the server's English.
 * Any other error is returned unchanged.
 */
export function translateCustomerBranchError(e: unknown, t: (key: string) => string): unknown {
  const key = e instanceof ApiError && e.code ? CUSTOMER_BRANCH_ERRORS[e.code] : undefined
  return key ? new Error(t(key)) : e
}
