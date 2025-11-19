export type Permission = {
  id: number
  name: string
  description: string
  createdAt: Date
}

export type RolePermission = {
  id: number
  roleId: number
  permissionId: number
  permissionName: string
  permissionDescription: string
  createdAt: string
  createdBy: number
  userEmail: string
}

export type CreateRolePermissionDto = {
  roleId: number
  permissionId: number
  createdBy: number
}
