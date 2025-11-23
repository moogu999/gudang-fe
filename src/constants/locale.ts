/**
 * Internationalization (i18n) constants
 *
 * Re-exports locale-related constants from the i18n module for use throughout the app.
 */

export { SUPPORTED_LOCALES, LOCALE_NAMES } from '@/i18n'

/**
 * Translation key prefixes for different domains
 */
export const I18N_KEYS = {
  COMMON: 'common',
  NAVIGATION: 'navigation',
  TABLE: 'table',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  DEPARTMENTS: 'departments',
  DIVISIONS: 'divisions',
} as const
