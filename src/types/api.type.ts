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
