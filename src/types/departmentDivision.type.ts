export type DepartmentDivision = {
  id: number
  departmentId: number
  divisionId: number
  createdAt: string
  createdBy: number
}

export type CreateDepartmentDivisionDto = {
  departmentId: number
  divisionId: number
  createdBy: number
}
