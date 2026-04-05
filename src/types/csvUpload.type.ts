export interface CsvUploadError {
  row: number
  column: string
  value: string
  message: string
}

export interface CsvUploadResponse {
  success: boolean
  totalRows: number
  successCount: number
  errors: CsvUploadError[]
}
