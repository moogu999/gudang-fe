import ApiService from './api'
import type { FileRecord } from '@/types/file.type'
import { API_ENDPOINTS } from '@/constants/api'

export class FilesService {
  private static readonly BASE_URL = API_ENDPOINTS.FILES

  static async upload(
    ownerType: string,
    ownerId: number,
    category: string,
    file: File,
  ): Promise<FileRecord> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('ownerType', ownerType)
    formData.append('ownerId', String(ownerId))
    formData.append('category', category)
    return ApiService.postMultipart<FileRecord>(this.BASE_URL, formData)
  }

  static async list(params: {
    ownerType: string
    ownerId: number
    category?: string
  }): Promise<FileRecord[]> {
    const query = new URLSearchParams({
      ownerType: params.ownerType,
      ownerId: String(params.ownerId),
      ...(params.category ? { category: params.category } : {}),
    })
    return ApiService.get<FileRecord[]>(`${this.BASE_URL}?${query}`)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
