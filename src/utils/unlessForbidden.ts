import { ApiError } from '@/types/api.type'

/**
 * Resolves to `undefined` instead of rejecting when the request is refused (403), so a
 * page can fall back to data it already has. Any other failure still rejects.
 *
 * For secondary lookups on a document page, e.g. the full supplier record next to the
 * lite one embedded in a purchase order: an approver may read the document but not
 * the master data around it.
 */
export async function unlessForbidden<T>(request: Promise<T>): Promise<T | undefined> {
  try {
    return await request
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return undefined
    throw e
  }
}
