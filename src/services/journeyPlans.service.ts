import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  AddJourneyVisitRequest,
  JourneyPlanRow,
  JourneyPlanRun,
  JourneyPlanSalesman,
  JourneyPlanStatus,
} from '@/types/journeyPlan.type'

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}

/**
 * Journey plans: one row per salesman, customer and date, generated from the routes.
 * Today and the past are archive; only supervisor additions change them.
 */
export class JourneyPlansService {
  /** @param date - `YYYY-MM-DD`; today when omitted */
  static async list(
    branchId: number,
    date?: string,
    employeeId?: number,
  ): Promise<JourneyPlanRow[]> {
    const res = await ApiService.get<{ data: JourneyPlanRow[] }>(
      `${API_ENDPOINTS.JOURNEY_PLANS}?${query({ branchId, date, employeeId })}`,
    )
    return res.data
  }

  static async salesmen(branchId: number, date?: string): Promise<JourneyPlanSalesman[]> {
    const res = await ApiService.get<{ data: JourneyPlanSalesman[] }>(
      `${API_ENDPOINTS.JOURNEY_PLAN_SALESMEN}?${query({ branchId, date })}`,
    )
    return res.data
  }

  static async status(branchId: number): Promise<JourneyPlanStatus> {
    return ApiService.get<JourneyPlanStatus>(
      `${API_ENDPOINTS.JOURNEY_PLAN_STATUS}?${query({ branchId })}`,
    )
  }

  /** Rebuilds tomorrow onward from the current routes; today is not changed. */
  static async regenerate(branchId: number): Promise<JourneyPlanRun> {
    return ApiService.post<JourneyPlanRun>(API_ENDPOINTS.JOURNEY_PLAN_REGENERATE, { branchId })
  }

  static async addVisit(body: AddJourneyVisitRequest): Promise<JourneyPlanRow> {
    return ApiService.post<JourneyPlanRow>(API_ENDPOINTS.JOURNEY_PLAN_ADDITIONS, body)
  }

  static async deleteAddition(id: number): Promise<void> {
    await ApiService.delete<void>(API_ENDPOINTS.JOURNEY_PLAN_ADDITION(id))
  }
}
