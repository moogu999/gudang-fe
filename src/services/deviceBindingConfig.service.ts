import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { DeviceBindingConfig, DeviceBindingConfigInput } from '@/types/deviceBinding.type'

/**
 * Per-company N-Force device binding settings. A company that never saved them
 * gets the defaults back (`saved: false`), never a 404.
 */
export class DeviceBindingConfigService {
  /** The settings of the caller's company. */
  static async getMyCompany(): Promise<DeviceBindingConfig> {
    return ApiService.get<DeviceBindingConfig>(API_ENDPOINTS.DEVICE_BINDING_CONFIGS_MY_COMPANY)
  }

  static async get(companyId: number): Promise<DeviceBindingConfig> {
    return ApiService.get<DeviceBindingConfig>(API_ENDPOINTS.DEVICE_BINDING_CONFIGS(companyId))
  }

  /**
   * Saves the settings. Choosing an approval flow sends every phone change still
   * waiting for one to approval; `submittedCount` says how many.
   */
  static async update(
    companyId: number,
    body: DeviceBindingConfigInput,
  ): Promise<DeviceBindingConfig> {
    return ApiService.put<DeviceBindingConfig>(
      API_ENDPOINTS.DEVICE_BINDING_CONFIGS(companyId),
      body,
    )
  }
}
