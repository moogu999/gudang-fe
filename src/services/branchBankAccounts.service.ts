import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  BranchBankAccount,
  CreateBranchBankAccountDto,
  UpdateBranchBankAccountDto,
} from '@/types/branchBankAccount.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for the Branch Bank Account master — the account an AP Payment's
 * disbursement leaves from. Setting a second default for the same branch
 * returns a 409 from the partial unique index; the UI must clear the existing
 * default first.
 */
export class BranchBankAccountsService {
  private static readonly BASE_URL = API_ENDPOINTS.BRANCH_BANK_ACCOUNTS

  static async list(queryString?: string): Promise<Base<BranchBankAccount>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<BranchBankAccount>>(url)
  }

  static async getById(id: number): Promise<BranchBankAccount> {
    return ApiService.get<BranchBankAccount>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateBranchBankAccountDto): Promise<BranchBankAccount> {
    return ApiService.post<BranchBankAccount>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateBranchBankAccountDto): Promise<BranchBankAccount> {
    return ApiService.patch<BranchBankAccount>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
