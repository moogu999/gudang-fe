/**
 * How My Approvals shows a request of a given module: a readable name and,
 * where one exists, the page the approver can review it on. Modules not listed
 * keep showing their raw key and id.
 */
export interface ApprovalModuleEntry {
  labelKey: string
  /** The page that reviews the request with this reference id. */
  link?: (referenceId: number) => string
}

export const APPROVAL_MODULES: Record<string, ApprovalModuleEntry> = {
  device_binding: {
    labelKey: 'approvals.modules.device_binding',
    link: (referenceId) => `/device-binding?request=${referenceId}`,
  },
}
