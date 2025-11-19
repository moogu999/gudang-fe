/**
 * Authentication-related type definitions
 * Based on OpenAPI spec: /v1/auth/*
 *
 * Note: Backend sets HttpOnly cookies for access_token and refresh_token
 * Tokens are not returned in response bodies
 */

/**
 * Sign-in request payload
 */
export interface SignInRequest {
  email: string
  password: string
}

/**
 * Sign-in response
 * Tokens are set via HttpOnly cookies by the backend
 * Response is 204 No Content
 */
export type SignInResponse = object

/**
 * Refresh token request payload
 * Refresh token is sent automatically via HttpOnly cookie
 */
export type RefreshTokenRequest = object

/**
 * Refresh token response
 * New access token is set via HttpOnly cookie by the backend
 */
export type RefreshTokenResponse = object

/**
 * Decoded access token JWT payload structure
 */
export interface AccessTokenPayload {
  userId: number
  permissions: number[]
  iat: number // Issued at
  exp: number // Expiration time
}

/**
 * Decoded refresh token JWT payload structure
 */
export interface RefreshTokenPayload {
  userId: number
  iat: number // Issued at
  exp: number // Expiration time
}

/**
 * /me endpoint response
 * Returns current authenticated user's information
 */
export interface MeResponse {
  id: number
  email: string
  permissions: number[]
}
