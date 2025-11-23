export type Department = {
  id: number
  name: string
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export type CreateDepartmentDto = {
  name: string
  createdBy: number
}

export type UpdateDepartmentDto = {
  name?: string
  updatedBy: number
}
