export interface NumberSeries {
  id: number
  name: string
  prefix: string
  separator: string
  dateFormat: string
  padding: number
  currentNumber: number
  entityType: string
  createdAt: string
  updatedAt?: string
  createdBy?: number
  createdByUser?: { id: number; email: string }
  updatedBy?: number
  updatedByUser?: { id: number; email: string }
}

export interface CreateNumberSeriesDto {
  name: string
  prefix: string
  separator: string
  dateFormat: string
  padding: number
  entityType: string
  createdBy: number
}

export interface UpdateNumberSeriesDto {
  name?: string
  prefix?: string
  separator?: string
  dateFormat?: string
  padding?: number
  updatedBy: number
}

export interface NumberSeriesPreview {
  code: string
  nextNumber: number
  seriesId: number
  seriesName: string
}
