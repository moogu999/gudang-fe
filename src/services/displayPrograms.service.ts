import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type {
  AddDisplayParticipantsRequest,
  AddDisplayParticipantsResponse,
  CreateDisplayProgramRequest,
  DisplayCustomerOptionQuery,
  DisplayCustomerRef,
  DisplayParticipant,
  DisplayParticipantQuery,
  DisplayProgram,
  DisplayProgramDuplicateResponse,
  DisplayProgramListResponse,
  DisplayVersionResponse,
  ExitDisplayParticipantRequest,
  UpdateDisplayParticipantRequest,
  UpdateDisplayProgramRequest,
} from '@/types/displayProgram.type'

/** The filters `/v1/display-programs` reads by name. */
const toListQuery = createListQueryAdapter([
  'branchId',
  'principalOptionId',
  'principal',
  'displayTypeId',
  'status',
])

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Display programs. Every route is scoped to the caller's branches; another branch's program
 * reads as 404. Participant writes carry the program's `version` and return the new one.
 */
export class DisplayProgramsService {
  /** Translates a generic CRUD query string into the parameters `/v1/display-programs` reads. */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<DisplayProgramListResponse> {
    const url = API_ENDPOINTS.DISPLAY_PROGRAMS
    return ApiService.get<DisplayProgramListResponse>(queryString ? `${url}?${queryString}` : url)
  }

  static async get(id: number): Promise<DisplayProgram> {
    return ApiService.get<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAM_BY_ID(id))
  }

  static async create(body: CreateDisplayProgramRequest): Promise<DisplayProgram> {
    return ApiService.post<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAMS, body)
  }

  /** What can change depends on the status. 409 `DISPLAY_PROGRAM_STALE` on an old version. */
  static async update(id: number, body: UpdateDisplayProgramRequest): Promise<DisplayProgram> {
    return ApiService.put<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAM_BY_ID(id), body)
  }

  /** Only a draft can be deleted. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.DISPLAY_PROGRAM_BY_ID(id))
  }

  static async publish(id: number, version: number): Promise<DisplayProgram> {
    return ApiService.post<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAM_PUBLISH(id), { version })
  }

  /** Scheduled programs only. */
  static async unpublish(id: number, version: number): Promise<DisplayProgram> {
    return ApiService.post<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAM_UNPUBLISH(id), { version })
  }

  /** Active programs only; it ends today and every open customer exits today. */
  static async endEarly(id: number, version: number): Promise<DisplayProgram> {
    return ApiService.post<DisplayProgram>(API_ENDPOINTS.DISPLAY_PROGRAM_END_EARLY(id), { version })
  }

  static async duplicate(id: number): Promise<DisplayProgramDuplicateResponse> {
    return ApiService.post<DisplayProgramDuplicateResponse>(
      API_ENDPOINTS.DISPLAY_PROGRAM_DUPLICATE(id),
      {},
    )
  }

  static async participants(
    id: number,
    query: DisplayParticipantQuery = {},
  ): Promise<Base<DisplayParticipant>> {
    const params = new URLSearchParams()
    if (query.q) params.set('q', query.q)
    if (query.state) params.set('state', query.state)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<DisplayParticipant>>(
      withQuery(API_ENDPOINTS.DISPLAY_PROGRAM_PARTICIPANTS(id), params),
    )
  }

  static async addParticipants(
    id: number,
    body: AddDisplayParticipantsRequest,
  ): Promise<AddDisplayParticipantsResponse> {
    return ApiService.post<AddDisplayParticipantsResponse>(
      API_ENDPOINTS.DISPLAY_PROGRAM_PARTICIPANTS(id),
      body,
    )
  }

  static async updateParticipant(
    id: number,
    participantId: number,
    body: UpdateDisplayParticipantRequest,
  ): Promise<DisplayVersionResponse> {
    return ApiService.put<DisplayVersionResponse>(
      API_ENDPOINTS.DISPLAY_PROGRAM_PARTICIPANT(id, participantId),
      body,
    )
  }

  static async exitParticipant(
    id: number,
    participantId: number,
    body: ExitDisplayParticipantRequest,
  ): Promise<DisplayVersionResponse> {
    return ApiService.post<DisplayVersionResponse>(
      API_ENDPOINTS.DISPLAY_PROGRAM_PARTICIPANT_EXIT(id, participantId),
      body,
    )
  }

  /** Draft and scheduled programs only; an active program's customers exit instead. */
  static async removeParticipant(
    id: number,
    participantId: number,
    version: number,
  ): Promise<DisplayVersionResponse> {
    return ApiService.delete<DisplayVersionResponse>(
      `${API_ENDPOINTS.DISPLAY_PROGRAM_PARTICIPANT(id, participantId)}?version=${version}`,
    )
  }

  /** Customers that can be added, leaving out the open ones of `programId`. */
  static async customerOptions(
    query: DisplayCustomerOptionQuery,
  ): Promise<Base<DisplayCustomerRef>> {
    const params = new URLSearchParams()
    if (query.programId) params.set('programId', String(query.programId))
    if (query.q) params.set('q', query.q)
    if (query.outletTypeId) params.set('outletTypeId', String(query.outletTypeId))
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<DisplayCustomerRef>>(
      withQuery(API_ENDPOINTS.DISPLAY_PROGRAM_CUSTOMER_OPTIONS, params),
    )
  }
}
