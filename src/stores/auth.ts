import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { AuthService } from '@/services'
import type { SignInRequest } from '@/types'

/**
 * Authentication state management store
 *
 * Manages user authentication state using HttpOnly cookies for token storage.
 * The backend sets access_token and refresh_token cookies automatically.
 *
 * User information is fetched from /v1/auth/me endpoint on initialization
 * and after successful sign-in.
 */
export const useAuthStore = defineStore('auth', () => {
  // Track if user is authenticated
  const isAuthenticated = ref<boolean>(false)

  // Store user info (fetched from /me endpoint)
  const userId = ref<number | null>(null)
  const email = ref<string | null>(null)
  const permissions = ref<number[]>([])

  // Track initialization state
  const isInitialized = ref<boolean>(false)
  let initPromise: Promise<void> | null = null

  /**
   * Check if user has a specific permission
   */
  const hasPermission = computed(() => {
    return (permissionId: number) => permissions.value.includes(permissionId)
  })

  /**
   * Sign in user with email and password
   * Backend sets HttpOnly cookies on success
   * Fetches user info from /me endpoint after successful sign-in
   *
   * @param credentials - User email and password
   */
  async function signIn(credentials: SignInRequest): Promise<void> {
    await AuthService.signIn(credentials)

    // Fetch user info from /me endpoint
    const userInfo = await AuthService.me()
    isAuthenticated.value = true
    userId.value = userInfo.id
    email.value = userInfo.email
    permissions.value = userInfo.permissions
  }

  /**
   * Sign out current user
   * Backend clears HttpOnly cookies
   */
  async function signOut(): Promise<void> {
    try {
      await AuthService.signOut()
    } finally {
      // Clear state even if API call fails
      isAuthenticated.value = false
      userId.value = null
      email.value = null
      permissions.value = []
    }
  }

  /**
   * Refresh the access token
   * Backend sets new access_token cookie (204 No Content)
   */
  async function refreshToken(): Promise<void> {
    try {
      await AuthService.refreshToken()
    } catch (error) {
      // If refresh fails, user needs to sign in again
      isAuthenticated.value = false
      userId.value = null
      email.value = null
      permissions.value = []
      throw error
    }
  }

  /**
   * Initialize auth state
   * Call this on app startup to check if user has valid cookies
   *
   * Fetches user info from /me endpoint to verify authentication
   * and populate user data (id, email, permissions)
   */
  async function initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      try {
        const userInfo = await AuthService.me()
        isAuthenticated.value = true
        userId.value = userInfo.id
        email.value = userInfo.email
        permissions.value = userInfo.permissions
      } catch {
        isAuthenticated.value = false
        userId.value = null
        email.value = null
        permissions.value = []
      } finally {
        isInitialized.value = true
      }
    })()

    return initPromise
  }

  /**
   * Wait for initialization to complete
   * Use this in router guards to ensure auth state is ready
   */
  async function waitForInit(): Promise<void> {
    if (isInitialized.value) {
      return
    }
    if (initPromise) {
      await initPromise
    }
  }

  /**
   * Set user information
   * Call this after fetching user data from external sources
   */
  function setUserInfo(id: number, userEmail: string, userPermissions: number[]): void {
    userId.value = id
    email.value = userEmail
    permissions.value = userPermissions
  }

  return {
    // State
    isAuthenticated,
    isInitialized,
    userId,
    email,
    permissions,

    // Computed
    hasPermission,

    // Actions
    signIn,
    signOut,
    refreshToken,
    initialize,
    waitForInit,
    setUserInfo,
  }
})
