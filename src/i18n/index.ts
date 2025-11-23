/**
 * Vue I18n Configuration
 *
 * Provides internationalization support for the application with:
 * - English (US) and Bahasa Indonesia locales
 * - Automatic locale detection from localStorage
 * - Locale persistence across sessions
 *
 * @example
 * ```typescript
 * // In components with Composition API
 * import { useI18n } from 'vue-i18n'
 *
 * const { t, locale } = useI18n()
 * const message = t('common.actions.save') // 'Save' or 'Simpan'
 * locale.value = 'id-ID' // Switch to Indonesian
 * ```
 *
 * @example
 * ```vue
 * <!-- In templates -->
 * <Button :label="$t('common.actions.save')" />
 * <h1>{{ $t('users.title') }}</h1>
 * ```
 */

import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US'
import idID from './locales/id-ID'

/**
 * Supported locale codes
 */
export const SUPPORTED_LOCALES = {
  EN_US: 'en-US',
  ID_ID: 'id-ID',
} as const

/**
 * Locale display names
 */
export const LOCALE_NAMES = {
  [SUPPORTED_LOCALES.EN_US]: 'English',
  [SUPPORTED_LOCALES.ID_ID]: 'Bahasa Indonesia',
} as const

/**
 * LocalStorage key for persisting locale preference
 */
const LOCALE_STORAGE_KEY = 'app-locale'

/**
 * Default fallback locale
 */
const DEFAULT_LOCALE = SUPPORTED_LOCALES.EN_US

/**
 * Get the user's preferred locale from localStorage or browser settings
 *
 * @returns The detected locale code (en-US or id-ID)
 */
function getInitialLocale(): string {
  // Check localStorage first
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (savedLocale && Object.values(SUPPORTED_LOCALES).includes(savedLocale as any)) {
    return savedLocale
  }

  // Check browser language
  const browserLocale = navigator.language
  if (browserLocale.startsWith('id')) {
    return SUPPORTED_LOCALES.ID_ID
  }

  return DEFAULT_LOCALE
}

/**
 * Save locale preference to localStorage
 *
 * @param locale - The locale code to save
 */
export function saveLocale(locale: string): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

/**
 * Vue I18n instance
 */
const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    [SUPPORTED_LOCALES.EN_US]: enUS,
    [SUPPORTED_LOCALES.ID_ID]: idID,
  },
  // Silences warnings about missing translations
  missingWarn: false,
  fallbackWarn: false,
})

export default i18n
