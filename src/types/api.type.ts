export type Base<T> = {
  data: Array<T>
  meta: Meta
}

export type Meta = {
  total: number
  limit: number
  offset: number
  nextCursor?: string | null
  prevCursor?: string | null
  hasMore?: boolean
}

/** Where in a submitted document a coded error points, on the endpoints that say. */
export type ErrorDetails = {
  field?: string
  /** Zero-based position of the offending item in its array. */
  index?: number
  questionId?: number
  productIds?: number[]
  /** Per-item breakdown some coded errors carry (the response's `details`), e.g. each short product. */
  items?: unknown
}

export type ErrorResponse = Omit<ErrorDetails, 'items'> & {
  /** Per-item breakdown of a coded error; surfaced to callers as `ApiError.details.items`. */
  details?: unknown
  message: string
  /** A stable machine-readable reason, on the endpoints that send one. */
  code?: string
}

/**
 * Error thrown by ApiService, carrying the HTTP status alongside the message so
 * callers can react to specific outcomes (e.g. 409 when a record is still in use)
 * instead of matching on message text.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
