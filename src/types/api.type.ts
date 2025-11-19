export type Base<T> = {
  data: Array<T>
  meta: Meta
}

export type Meta = {
  total: number
  limit: number
  offset: number
}
