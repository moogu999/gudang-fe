export type Division = {
  id: number
  name: string
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export type CreateDivisionDto = {
  name: string
  createdBy: number
}

export type UpdateDivisionDto = {
  name?: string
  updatedBy: number
}
