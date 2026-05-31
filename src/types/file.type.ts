export interface FileRecord {
  id: number
  ownerType: string
  ownerId: number
  category: string
  url: string
  originalName: string
  mimeType: string
  size: number
  createdAt: string
}

export interface UploadFileDto {
  ownerType: string
  ownerId: number
  category: string
  file: File
}
