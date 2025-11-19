import ApiService from './api'
import type { SignInRequest, SignInResponse, MeResponse } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Authentication Service
 *
 * Handles all authentication-related API calls including sign-in, sign-out,
 * and token refresh operations.
 *
 * @example
 * ```typescript
 * // Sign in
 * const { accessToken, refreshToken } = await AuthService.signIn({
 *   email: 'user@example.com',
 *   password: 'password123'
 * })
 *
 * // Refresh access token
 * const { accessToken } = await AuthService.refreshToken({ refreshToken })
 *
 * // Sign out
 * await AuthService.signOut()
 * ```
 */
export class AuthService {
  /**
   * Sign in user with email and password
   *
   * @param data - Sign-in credentials
   * @returns Promise resolving to access and refresh tokens
   * @throws Error if credentials are invalid (401) or server error occurs
   *
   * @example
   * ```typescript
   * try {
   *   const tokens = await AuthService.signIn({
   *     email: 'user@example.com',
   *     password: 'securePassword123'
   *   })
   *   // Store tokens and redirect to dashboard
   * } catch (error) {
   *   // Handle authentication error
   * }
   * ```
   */
  static async signIn(data: SignInRequest): Promise<SignInResponse> {
    return ApiService.post<SignInResponse>(API_ENDPOINTS.AUTH_SIGN_IN, data)
  }

  /**
   * Refresh the access token
   *
   * Refresh token is sent automatically via HttpOnly cookie.
   * Backend sets a new access_token cookie (204 No Content response).
   *
   * @returns Promise resolving when token is refreshed
   * @throws Error if refresh token is invalid or expired (401)
   *
   * @example
   * ```typescript
   * try {
   *   await AuthService.refreshToken()
   *   // New access token cookie set automatically
   * } catch (error) {
   *   // Redirect to login if refresh fails
   * }
   * ```
   */
  static async refreshToken(): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.AUTH_REFRESH, {})
  }

  /**
   * Sign out the current user
   *
   * Invalidates the current refresh token on the server.
   * Requires Bearer authentication header.
   *
   * @returns Promise resolving when sign-out is complete (204)
   * @throws Error if user is unauthorized (401) or server error occurs
   *
   * @example
   * ```typescript
   * try {
   *   await AuthService.signOut()
   *   // Clear local tokens and redirect to login
   * } catch (error) {
   *   // Handle sign-out error
   * }
   * ```
   */
  static async signOut(): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.AUTH_SIGN_OUT, {})
  }

  /**
   * Get current user information
   *
   * Retrieves the authenticated user's information including id, email, and permissions.
   * Uses the access token from HttpOnly cookie for authentication.
   *
   * @returns Promise resolving to user information
   * @throws Error if user is unauthorized (401) or server error occurs
   *
   * @example
   * ```typescript
   * try {
   *   const user = await AuthService.me()
   *   console.log(user.id, user.email, user.permissions)
   * } catch (error) {
   *   // Handle error (user not authenticated)
   * }
   * ```
   */
  static async me(): Promise<MeResponse> {
    return ApiService.get<MeResponse>(API_ENDPOINTS.AUTH_ME)
  }
}
