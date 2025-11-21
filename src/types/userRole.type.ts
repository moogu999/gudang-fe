export type UserRole = {
  id: number
  userId: number
  roleId: number
  roleName: string
  roleDescription: string
  createdAt: string
  createdBy: number
  userEmail: string
}

export type CreateUserRoleDto = {
  userId: number
  roleId: number
  createdBy: number
}
