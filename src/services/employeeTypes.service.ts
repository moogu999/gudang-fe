import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { EmployeeType } from '@/types/employee.type'
import { API_ENDPOINTS } from '@/constants/api'

export class EmployeeTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.EMPLOYEE_TYPES

  static async list(queryString?: string): Promise<Base<EmployeeType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<EmployeeType>>(url)
  }
}
