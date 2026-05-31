import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeSummary,
} from '@/types/employee.type'
import { API_ENDPOINTS } from '@/constants/api'

export class EmployeesService {
  private static readonly BASE_URL = API_ENDPOINTS.EMPLOYEES

  static async list(queryString?: string): Promise<Base<Employee>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Employee>>(url)
  }

  static async summary(): Promise<EmployeeSummary> {
    return ApiService.get<EmployeeSummary>(`${this.BASE_URL}/summary`)
  }

  static async get(id: number): Promise<Employee> {
    return ApiService.get<Employee>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateEmployeeDto): Promise<Employee> {
    return ApiService.post<Employee>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateEmployeeDto): Promise<Employee> {
    return ApiService.put<Employee>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
