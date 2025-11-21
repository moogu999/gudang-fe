export type User = {
  id: number
  email: string
  createdAt: string
  createdBy: string
}

export type CreateUserDto = {
  email: string
  password: string
  createdBy: number
}

export type UpdateUserDto = {
  email?: string
  password?: string
  updatedBy: string
}
