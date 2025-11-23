export type DepartmentLite = {
  name: string
}

export type User = {
  id: number
  email: string
  departmentId: number | null
  department: DepartmentLite | null
  createdAt: string
  createdBy: string
}

export type CreateUserDto = {
  email: string
  password: string
  departmentId?: number
  createdBy: number
}

export type UpdateUserDto = {
  email?: string
  password?: string
  departmentId?: number | null
  updatedBy: string
}
