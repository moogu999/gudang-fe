import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CreateJournalConfigDto,
  GenerateResult,
  JournalBasisDto,
  JournalConfig,
  JournalDimension,
  JournalDocumentType,
  JournalMapping,
  JournalRole,
  ReplaceBasesResult,
  SaveMappingDto,
  UpdateJournalConfigDto,
} from '@/types/journalConfig.type'
import { ApiError } from '@/types/api.type'
import { API_ENDPOINTS } from '@/constants/api'

export class JournalConfigService {
  private static readonly BASE_URL = API_ENDPOINTS.JOURNAL_CONFIGS

  static async documentTypes(): Promise<Base<JournalDocumentType>> {
    return ApiService.get<Base<JournalDocumentType>>(API_ENDPOINTS.JOURNAL_DOCUMENT_TYPES)
  }

  static async roles(documentTypeCode: string): Promise<Base<JournalRole>> {
    return ApiService.get<Base<JournalRole>>(
      `${API_ENDPOINTS.JOURNAL_ROLES}?documentTypeCode=${documentTypeCode}`,
    )
  }

  static async dimensions(
    documentTypeCode: string,
    roleCode: string,
  ): Promise<Base<JournalDimension>> {
    return ApiService.get<Base<JournalDimension>>(
      `${API_ENDPOINTS.JOURNAL_DIMENSIONS}?documentTypeCode=${documentTypeCode}&roleCode=${roleCode}`,
    )
  }

  /** 404 (no config yet for this company/document type) is the normal
   *  first-visit state, not a failure — swallowed into `null` here so every
   *  other call can let errors propagate to the view's toast. */
  static async find(companyId: number, documentTypeId: number): Promise<JournalConfig | null> {
    try {
      const result = await ApiService.get<Base<JournalConfig>>(
        `${this.BASE_URL}?companyId=${companyId}&documentTypeId=${documentTypeId}`,
      )
      return result.data[0] ?? null
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return null
      }
      throw e
    }
  }

  static async get(id: number): Promise<JournalConfig> {
    return ApiService.get<JournalConfig>(API_ENDPOINTS.JOURNAL_CONFIG_BY_ID(id))
  }

  static async create(data: CreateJournalConfigDto): Promise<JournalConfig> {
    return ApiService.post<JournalConfig>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateJournalConfigDto): Promise<JournalConfig> {
    return ApiService.put<JournalConfig>(API_ENDPOINTS.JOURNAL_CONFIG_BY_ID(id), data)
  }

  static async replaceBases(
    id: number,
    roleId: number,
    bases: JournalBasisDto[],
  ): Promise<ReplaceBasesResult> {
    return ApiService.put<ReplaceBasesResult>(API_ENDPOINTS.JOURNAL_CONFIG_ROLE_BASES(id, roleId), {
      bases,
    })
  }

  static async generate(id: number, roleId: number): Promise<GenerateResult> {
    return ApiService.post<GenerateResult>(
      API_ENDPOINTS.JOURNAL_CONFIG_ROLE_GENERATE(id, roleId),
      {},
    )
  }

  static async mappings(
    id: number,
    roleId: number,
    queryString?: string,
  ): Promise<Base<JournalMapping>> {
    const base = API_ENDPOINTS.JOURNAL_CONFIG_ROLE_MAPPINGS(id, roleId)
    const url = queryString ? `${base}?${queryString}` : base
    return ApiService.get<Base<JournalMapping>>(url)
  }

  static async saveMappings(id: number, roleId: number, rows: SaveMappingDto[]): Promise<void> {
    return ApiService.put<void>(API_ENDPOINTS.JOURNAL_CONFIG_ROLE_MAPPINGS(id, roleId), { rows })
  }

  static async deleteMapping(id: number, roleId: number, mappingId: number): Promise<void> {
    return ApiService.delete<void>(
      API_ENDPOINTS.JOURNAL_CONFIG_ROLE_MAPPING_BY_ID(id, roleId, mappingId),
    )
  }

  static async activate(id: number): Promise<JournalConfig> {
    return ApiService.post<JournalConfig>(API_ENDPOINTS.JOURNAL_CONFIG_ACTIVATE(id), {})
  }

  static async deactivate(id: number): Promise<JournalConfig> {
    return ApiService.post<JournalConfig>(API_ENDPOINTS.JOURNAL_CONFIG_DEACTIVATE(id), {})
  }
}
