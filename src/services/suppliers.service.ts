import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** The filters `/v1/suppliers` reads by name. */
const toListQuery = createListQueryAdapter(['isActive', 'paymentTermId'])

export class SuppliersService {
  private static readonly BASE_URL = API_ENDPOINTS.SUPPLIERS

  /**
   * Translates a generic CRUD query string into the parameters `/v1/suppliers`
   * reads.
   *
   * Pass this as `TableComponent`'s `query-adapter` when a table points at this
   * endpoint, or its search box and paginator land on parameters the endpoint
   * drops and the table answers with an unfiltered first page.
   *
   * @example
   * ```vue
   * <TableComponent :url="url" :query-adapter="SuppliersService.toListQuery" />
   * ```
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<Base<Supplier>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Supplier>>(url)
  }

  /**
   * List suppliers for an `InfiniteSelect`, translating its generic query
   * string into the parameters this endpoint reads.
   *
   * Use this instead of {@link list} wherever the caller is an InfiniteSelect.
   * Call {@link list} directly when you are already writing the endpoint's own
   * parameters.
   */
  static async listForSelect(queryString?: string): Promise<Base<Supplier>> {
    return this.list(toListQuery(queryString))
  }

  static async get(id: number): Promise<Supplier> {
    return ApiService.get<Supplier>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateSupplierDto): Promise<Supplier> {
    return ApiService.post<Supplier>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateSupplierDto): Promise<Supplier> {
    return ApiService.put<Supplier>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
