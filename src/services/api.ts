import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

class ApiService {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Interceptors can be added here for request/response handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API error:', error.response?.data || error.message)
        return Promise.reject(error)
      },
    )
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
