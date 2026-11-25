import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  CompanyRules,
  EffectiveRules,
  PutCompanyRulesDto,
  PutTeamRulesDto,
  TeamRules,
  TeamSummary,
} from '@/types/visitRule.type'

/** Visit Rules: the company defaults, per-team overrides and the effective set for one employee. */
export class VisitRulesService {
  static async getCompany(companyId: number): Promise<CompanyRules> {
    return ApiService.get<CompanyRules>(API_ENDPOINTS.VISIT_RULES_COMPANY(companyId))
  }

  static async putCompany(companyId: number, dto: PutCompanyRulesDto): Promise<CompanyRules> {
    return ApiService.put<CompanyRules>(API_ENDPOINTS.VISIT_RULES_COMPANY(companyId), dto)
  }

  static async listTeams(companyId: number): Promise<TeamSummary[]> {
    const res = await ApiService.get<{ data: TeamSummary[] }>(
      API_ENDPOINTS.VISIT_RULES_COMPANY_TEAMS(companyId),
    )
    return res.data
  }

  static async getTeam(teamId: number): Promise<TeamRules> {
    return ApiService.get<TeamRules>(API_ENDPOINTS.VISIT_RULES_TEAM(teamId))
  }

  static async putTeam(teamId: number, dto: PutTeamRulesDto): Promise<TeamRules> {
    return ApiService.put<TeamRules>(API_ENDPOINTS.VISIT_RULES_TEAM(teamId), dto)
  }

  static async deleteTeam(teamId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.VISIT_RULES_TEAM(teamId))
  }

  static async getEffective(employeeId: number): Promise<EffectiveRules> {
    return ApiService.get<EffectiveRules>(
      `${API_ENDPOINTS.VISIT_RULES_EFFECTIVE}?employeeId=${employeeId}`,
    )
  }
}
