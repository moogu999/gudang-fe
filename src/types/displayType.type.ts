/** Display types: the kinds of display place a program is about. Mirrors `gudang-be/internal/display_type`. */
export interface DisplayType {
  id: number
  code: string
  name: string
  minPhotos: number
  description?: string
  isActive: boolean
  /** Programs that use the type; above zero it can't be deleted. */
  programCount: number
  createdAt: string
  updatedAt?: string
}

export interface DisplayTypeOption {
  id: number
  code: string
  name: string
  minPhotos: number
  isActive: boolean
}

export interface DisplayTypePayload {
  code: string
  name: string
  minPhotos: number
  description?: string
  isActive: boolean
}
