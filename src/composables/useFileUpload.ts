import { ref } from 'vue'
import { FilesService } from '@/services/files.service'
import type { FileRecord } from '@/types/file.type'

interface UseFileUploadOptions {
  ownerType: string
  category: string
  cardinality?: 'single' | 'multi'
  accept?: string
  maxSize?: number
}

export function useFileUpload(options: UseFileUploadOptions) {
  const { ownerType, category, cardinality = 'single', maxSize } = options

  const isUploading = ref(false)
  const error = ref<string | null>(null)

  const pendingFile = ref<File | null>(null)
  const pendingPreview = ref<string | null>(null)

  function buildUrl(url: string): string {
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_API_BASE_URL ?? ''}${url}`
  }

  function selectFile(file: File): string | null {
    if (maxSize && file.size > maxSize) {
      error.value = `File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
      return null
    }
    error.value = null
    pendingFile.value = file
    const preview = URL.createObjectURL(file)
    pendingPreview.value = preview
    return preview
  }

  function clearPending() {
    if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
    pendingFile.value = null
    pendingPreview.value = null
  }

  async function upload(ownerId: number): Promise<FileRecord | null> {
    if (!pendingFile.value) return null
    isUploading.value = true
    error.value = null
    try {
      const record = await FilesService.upload(ownerType, ownerId, category, pendingFile.value)
      clearPending()
      return record
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Upload failed'
      return null
    } finally {
      isUploading.value = false
    }
  }

  async function remove(id: number): Promise<boolean> {
    isUploading.value = true
    error.value = null
    try {
      await FilesService.remove(id)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Delete failed'
      return false
    } finally {
      isUploading.value = false
    }
  }

  return {
    cardinality,
    isUploading,
    error,
    pendingFile,
    pendingPreview,
    buildUrl,
    selectFile,
    clearPending,
    upload,
    remove,
  }
}
