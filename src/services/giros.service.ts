import ApiService from './api'
import type { GiroRegisterParams, GiroRegisterResponse } from '@/types/giroReceipt.type'
import { API_ENDPOINTS } from '@/constants/api'

function toQuery(params: GiroRegisterParams): string {
  const qs = new URLSearchParams()
  if (params.bucket) qs.set('bucket', params.bucket)
  if (params.branchId) qs.set('branchId', String(params.branchId))
  if (params.customerId) qs.set('customerId', String(params.customerId))
  if (params.search) qs.set('search', params.search)
  if (params.dueOnOrBefore) qs.set('dueOnOrBefore', params.dueOnOrBefore)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  return qs.toString()
}

/**
 * Read-only service over the Giro Register (`GET /v1/giros`): every received giro, bucketed by
 * status and due date. Takes bespoke page/limit parameters, not GenericQueryBuilder triples.
 */
export class GirosService {
  static async register(params: GiroRegisterParams = {}): Promise<GiroRegisterResponse> {
    const query = toQuery(params)
    return ApiService.get<GiroRegisterResponse>(
      query ? `${API_ENDPOINTS.GIROS}?${query}` : API_ENDPOINTS.GIROS,
    )
  }
}
