import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ChartOfAccount,
  ChartOfAccountNode,
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
} from '@/types/chartOfAccount.type'
import { API_ENDPOINTS } from '@/constants/api'

export class ChartOfAccountsService {
  private static readonly BASE_URL = API_ENDPOINTS.CHART_OF_ACCOUNTS

  static async list(queryString?: string): Promise<Base<ChartOfAccount>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ChartOfAccount>>(url)
  }

  static async tree(companyId: number, includeInactive = true): Promise<ChartOfAccountNode[]> {
    const params = new URLSearchParams({
      companyId: String(companyId),
      includeInactive: String(includeInactive),
    })
    return ApiService.get<ChartOfAccountNode[]>(
      `${API_ENDPOINTS.CHART_OF_ACCOUNTS_TREE}?${params.toString()}`,
    )
  }

  static async get(id: number): Promise<ChartOfAccount> {
    return ApiService.get<ChartOfAccount>(API_ENDPOINTS.CHART_OF_ACCOUNT_BY_ID(id))
  }

  static async create(data: CreateChartOfAccountDto): Promise<ChartOfAccount> {
    return ApiService.post<ChartOfAccount>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateChartOfAccountDto): Promise<ChartOfAccount> {
    return ApiService.put<ChartOfAccount>(API_ENDPOINTS.CHART_OF_ACCOUNT_BY_ID(id), data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.CHART_OF_ACCOUNT_BY_ID(id))
  }
}
