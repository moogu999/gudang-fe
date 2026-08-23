import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CorrectionCategory,
  CreateCorrectionCategoryDto,
  UpdateCorrectionCategoryDto,
} from '@/types/correctionCategory.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * CorrectionCategoriesService
 *
 * Service for managing "Kategori Koreksi" master data entries (e.g. Price correction,
 * Quantity billing error, VAT billing error) referenced by Credit/Debit Note.
 *
 * @example
 * ```typescript
 * // List all correction categories
 * const categories = await CorrectionCategoriesService.list()
 *
 * // Create a new correction category
 * const newCategory = await CorrectionCategoriesService.create({
 *   name: 'Freight adjustment',
 *   isActive: true,
 * })
 * ```
 */
export class CorrectionCategoriesService {
  private static readonly BASE_URL = API_ENDPOINTS.CORRECTION_CATEGORIES

  /**
   * Retrieve a paginated list of correction categories
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to a paginated list of correction categories
   */
  static async list(queryString?: string): Promise<Base<CorrectionCategory>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CorrectionCategory>>(url)
  }

  /**
   * Retrieve a single correction category by ID
   *
   * @param id - CorrectionCategory ID
   * @returns Promise resolving to the correction category
   * @throws Error if not found
   */
  static async getById(id: number): Promise<CorrectionCategory> {
    return ApiService.get<CorrectionCategory>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a new correction category
   *
   * @param data - CorrectionCategory creation data
   * @returns Promise resolving to the created correction category
   * @throws Error if validation fails
   */
  static async create(data: CreateCorrectionCategoryDto): Promise<CorrectionCategory> {
    return ApiService.post<CorrectionCategory>(this.BASE_URL, data)
  }

  /**
   * Update an existing correction category
   *
   * @param id - CorrectionCategory ID to update
   * @param data - Partial update data
   * @returns Promise resolving to the updated correction category
   * @throws Error if not found or validation fails
   */
  static async update(id: number, data: UpdateCorrectionCategoryDto): Promise<CorrectionCategory> {
    return ApiService.patch<CorrectionCategory>(`${this.BASE_URL}/${id}`, data)
  }

  /**
   * Delete a correction category
   *
   * @param id - CorrectionCategory ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if not found or is in use
   */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
