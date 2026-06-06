export type VehicleOwnership = 'owned' | 'leased'
export type VehicleCargoType = 'dry' | 'chiller' | 'freezer' | 'mixed'
export type VehicleStatus = 'available' | 'service' | 'inactive'

export interface Vehicle {
  id: number
  plateNumber: string
  vehicleTypeId: number
  vehicleTypeCode: string
  vehicleTypeName: string
  brandModel: string | null
  color: string | null
  year: number | null
  chassisNumber: string | null
  engineNumber: string | null
  ownership: VehicleOwnership
  capacityKg: string | null
  volumeM3: string | null
  bakLengthM: string | null
  bakWidthM: string | null
  bakHeightM: string | null
  cargoType: VehicleCargoType
  stnkExpiry: string | null
  insuranceExpiry: string | null
  nextServiceKm: number | null
  status: VehicleStatus
  createdAt: string
  createdBy: number
  createdByEmail: string
  updatedAt: string | null
  updatedBy: number | null
  updatedByEmail: string | null
}

export interface CreateVehicleDto {
  plateNumber: string
  vehicleTypeId: number
  brandModel?: string
  color?: string
  year?: number
  chassisNumber?: string
  engineNumber?: string
  ownership: VehicleOwnership
  capacityKg?: string
  volumeM3?: string
  bakLengthM?: string
  bakWidthM?: string
  bakHeightM?: string
  cargoType: VehicleCargoType
  stnkExpiry?: string
  insuranceExpiry?: string
  nextServiceKm?: number
  status: VehicleStatus
  createdBy: number
}

export interface UpdateVehicleDto {
  plateNumber?: string
  vehicleTypeId?: number
  brandModel?: string | null
  color?: string | null
  year?: number | null
  chassisNumber?: string | null
  engineNumber?: string | null
  ownership?: VehicleOwnership
  capacityKg?: string | null
  volumeM3?: string | null
  bakLengthM?: string | null
  bakWidthM?: string | null
  bakHeightM?: string | null
  cargoType?: VehicleCargoType
  stnkExpiry?: string | null
  insuranceExpiry?: string | null
  nextServiceKm?: number | null
  status?: VehicleStatus
  updatedBy: number
}
