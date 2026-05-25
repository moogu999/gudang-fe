import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'

interface TaxConfigurationResponse {
  percentage: string
}

export class TaxConfigurationService {
  static async get(): Promise<TaxConfigurationResponse> {
    return ApiService.get<TaxConfigurationResponse>(API_ENDPOINTS.TAX_CONFIGURATION)
  }
}
