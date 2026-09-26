import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'

export class CacheService {
  /**
   * Clears the server cache and this browser's HTTP cache. Needs the
   * CACHE_CLEAR permission. Every master-data cache key is bumped afterwards
   * by the response interceptor, so nothing needs reloading.
   */
  static async clear(): Promise<void> {
    await ApiService.post(API_ENDPOINTS.CACHE_CLEAR, {})
  }
}
