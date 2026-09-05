import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  FiscalYear,
  FiscalYearDetail,
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
} from '@/types/accountingPeriod.type'
import { API_ENDPOINTS } from '@/constants/api'

export class FiscalYearsService {
  private static readonly BASE_URL = API_ENDPOINTS.FISCAL_YEARS

  static async list(queryString?: string): Promise<Base<FiscalYear>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<FiscalYear>>(url)
  }

  static async get(id: number): Promise<FiscalYearDetail> {
    return ApiService.get<FiscalYearDetail>(API_ENDPOINTS.FISCAL_YEAR_BY_ID(id))
  }

  static async create(data: CreateFiscalYearDto): Promise<FiscalYearDetail> {
    return ApiService.post<FiscalYearDetail>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateFiscalYearDto): Promise<FiscalYearDetail> {
    return ApiService.put<FiscalYearDetail>(API_ENDPOINTS.FISCAL_YEAR_BY_ID(id), data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.FISCAL_YEAR_BY_ID(id))
  }
}
