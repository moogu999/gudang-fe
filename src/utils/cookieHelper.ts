/**
 * Cookie Helper Utilities
 *
 * Utilities for reading cookies (non-HttpOnly cookies only).
 * Note: HttpOnly cookies cannot be read by JavaScript for security.
 * These utilities are for reading non-sensitive data from cookies.
 */

import type { AccessTokenPayload } from '@/types'

/**
 * Get a cookie value by name
 * Note: Cannot read HttpOnly cookies (access_token, refresh_token)
 *
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * Decode a JWT token without verification
 * Note: This only decodes the payload, does not verify signature
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJwt<T = AccessTokenPayload>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as T
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if a JWT token is expired
 *
 * @param token - JWT token string
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt<{ exp: number }>(token)
  if (!decoded || !decoded.exp) {
    return true
  }

  // Check if token is expired (with 30 second buffer)
  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime + 30
}
