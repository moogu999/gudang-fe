import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios'
import { API_ENDPOINTS } from '@/constants/api'
import type { ErrorResponse } from '@/types/api.type'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

class ApiService {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: unknown) => void
    reject: (reason?: unknown) => void
  }> = []
  private authFailureCallback?: () => void

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable sending/receiving cookies with cross-origin requests
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Response interceptor for handling 401 errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ErrorResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Extract error message from API response
        const errorMessage = error.response?.data?.message || error.message

        // Only handle 401 errors that haven't been retried yet
        const is401Error = error.response?.status === 401
        const isRetryAttempt = originalRequest?._retry

        if (!is401Error || !originalRequest || isRetryAttempt) {
          console.error('API error:', errorMessage)
          return Promise.reject(new Error(errorMessage))
        }

        const requestUrl = originalRequest.url || ''

        // Don't attempt token refresh for auth-related endpoints
        if (this.isAuthEndpoint(requestUrl)) {
          const isAuthMeEndpoint = requestUrl.includes(API_ENDPOINTS.AUTH_ME)
          if (!isAuthMeEndpoint) {
            this.handleAuthFailure()
          }
          return Promise.reject(new Error(errorMessage))
        }

        // If already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject })
          })
            .then(() => {
              return this.axiosInstance(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        // Mark as retry to prevent infinite loops
        originalRequest._retry = true
        this.isRefreshing = true

        try {
          await this.post(API_ENDPOINTS.AUTH_REFRESH, {})

          // Refresh succeeded, retry all queued requests
          this.processQueue(null)
          this.isRefreshing = false

          // Retry the original request
          return this.axiosInstance(originalRequest)
        } catch (refreshError) {
          // Refresh failed, reject all queued requests and redirect to sign-in
          this.processQueue(refreshError)
          this.isRefreshing = false
          this.handleAuthFailure()
          return Promise.reject(refreshError)
        }
      },
    )
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes(API_ENDPOINTS.AUTH_SIGN_IN) || url.includes(API_ENDPOINTS.AUTH_REFRESH)
  }

  private processQueue(error: unknown) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error)
      } else {
        promise.resolve()
      }
    })
    this.failedQueue = []
  }

  /**
   * Register a callback to be invoked when authentication fails
   *
   * @param callback - Function to handle auth failure (e.g., clear auth state, redirect to sign-in)
   *
   * @example
   * ```typescript
   * import ApiService from '@/services/api'
   * import { useAuthStore } from '@/stores'
   * import router from '@/router'
   *
   * ApiService.setAuthFailureHandler(() => {
   *   const authStore = useAuthStore()
   *   authStore.clearAuth()
   *   router.push('/sign-in')
   * })
   * ```
   */
  public setAuthFailureHandler(callback: () => void): void {
    this.authFailureCallback = callback
  }

  private handleAuthFailure(): void {
    if (this.authFailureCallback) {
      this.authFailureCallback()
    } else {
      console.warn('Auth failure handler not registered. Redirecting to sign-in page.')
      window.location.href = '/sign-in'
    }
  }

  public async get<T>(endpoint: string, params?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params })
    return response.data
  }

  public async post<T>(endpoint: string, data: object): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, data)
    return response.data
  }

  public async patch<T>(endpoint: string, data: object): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(endpoint, data)
    return response.data
  }

  public async delete<T>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint)
    return response.data
  }
}

// Export a singleton instance
export default new ApiService()
