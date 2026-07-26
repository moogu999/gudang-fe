import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  ApprovalFlow,
  ApprovalModule,
  ApprovalRequest,
  ApprovalRequestDetail,
  PendingForMeResponse,
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
  SubmitApprovalRequestDto,
  ActApprovalRequestDto,
} from '@/types/approval.type'

export class ApprovalsService {
  static async listFlows(moduleKey?: string): Promise<ApprovalFlow[]> {
    const url = moduleKey
      ? `${API_ENDPOINTS.APPROVAL_FLOWS}?moduleKey=${encodeURIComponent(moduleKey)}`
      : API_ENDPOINTS.APPROVAL_FLOWS
    return ApiService.get<ApprovalFlow[]>(url)
  }

  static async getFlow(id: number): Promise<ApprovalFlow> {
    return ApiService.get<ApprovalFlow>(API_ENDPOINTS.APPROVAL_FLOW_BY_ID(id))
  }

  static async createFlow(data: CreateApprovalFlowDto): Promise<ApprovalFlow> {
    return ApiService.post<ApprovalFlow>(API_ENDPOINTS.APPROVAL_FLOWS, data)
  }

  static async updateFlow(id: number, data: UpdateApprovalFlowDto): Promise<ApprovalFlow> {
    return ApiService.put<ApprovalFlow>(API_ENDPOINTS.APPROVAL_FLOW_BY_ID(id), data)
  }

  static async deleteFlow(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.APPROVAL_FLOW_BY_ID(id))
  }

  static async listModules(): Promise<ApprovalModule[]> {
    return ApiService.get<ApprovalModule[]>(API_ENDPOINTS.APPROVAL_MODULES)
  }

  static async submit(data: SubmitApprovalRequestDto): Promise<ApprovalRequest> {
    return ApiService.post<ApprovalRequest>(API_ENDPOINTS.APPROVAL_REQUESTS, data)
  }

  static async listPendingForMe(): Promise<PendingForMeResponse> {
    return ApiService.get<PendingForMeResponse>(API_ENDPOINTS.APPROVAL_REQUESTS_PENDING_ME)
  }

  static async getByReference(
    moduleKey: string,
    referenceId: number,
  ): Promise<ApprovalRequestDetail> {
    return ApiService.get<ApprovalRequestDetail>(
      API_ENDPOINTS.APPROVAL_REQUEST_BY_REFERENCE(moduleKey, referenceId),
    )
  }

  static async approve(id: number, data?: ActApprovalRequestDto): Promise<ApprovalRequest> {
    return ApiService.post<ApprovalRequest>(API_ENDPOINTS.APPROVAL_REQUEST_APPROVE(id), data ?? {})
  }

  static async reject(id: number, data?: ActApprovalRequestDto): Promise<ApprovalRequest> {
    return ApiService.post<ApprovalRequest>(API_ENDPOINTS.APPROVAL_REQUEST_REJECT(id), data ?? {})
  }

  static async cancel(id: number): Promise<ApprovalRequest> {
    return ApiService.post<ApprovalRequest>(API_ENDPOINTS.APPROVAL_REQUEST_CANCEL(id), {})
  }
}
