export type Role = {
  id: number
  name: string
  description: string
  createdAt?: string
  createdBy?: number
  createdByUser?: {
    email: string
  }
}

export type CreateRoleDto = {
  name: string
  description: string
  createdBy: number
}

export type UpdateRoleDto = {
  name: string
  description: string
  updatedBy: number
}
