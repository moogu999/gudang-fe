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

export type ErrorResponse = {
  message: string
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
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
