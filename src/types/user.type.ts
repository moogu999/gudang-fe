export type DepartmentLite = {
  name: string
}

export type EmployeeLite = {
  name: string
}

export type User = {
  id: number
  email: string
  departmentId: number | null
  department: DepartmentLite | null
  employeeId: number | null
  employee: EmployeeLite | null
  primaryBranchId: number | null
  createdAt: string
  createdBy: string
}

export type CreateUserDto = {
  email: string
  password: string
  departmentId?: number
  employeeId?: number | null
  createdBy: number
}

export type UpdateUserDto = {
  email?: string
  password?: string
  departmentId?: number | null
  employeeId?: number | null
  updatedBy: string
}
