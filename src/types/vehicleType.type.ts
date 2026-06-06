export interface VehicleType {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}
