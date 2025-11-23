<template>
  <Button
    :label="currentLocaleLabel"
    icon="pi pi-globe"
    severity="secondary"
    text
    aria-label="Change language"
    aria-controls="language_menu"
    @click="toggle"
    class="!px-3"
  />
  <Menu ref="menu" id="language_menu" :model="languageMenu" :popup="true" />
</template>

<script setup lang="ts">
/**
 * LanguageSwitcherComponent
 *
 * Dropdown menu for switching between supported locales.
 * Persists the user's locale preference to localStorage.
 *
 * @example
 * ```vue
 * <LanguageSwitcherComponent />
 * ```
 */

import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '@/constants'
import { saveLocale } from '@/i18n'

const { locale } = useI18n()

/**
 * Current locale display label
 */
const currentLocaleLabel = computed(() => {
  const labels: Record<string, string> = {
    [SUPPORTED_LOCALES.EN_US]: 'EN',
    [SUPPORTED_LOCALES.ID_ID]: 'ID',
  }
  return labels[locale.value] || 'EN'
})

/**
 * Language menu items
 */
const languageMenu = computed<MenuItem[]>(() => [
  {
    label: LOCALE_NAMES[SUPPORTED_LOCALES.EN_US],
    icon: locale.value === SUPPORTED_LOCALES.EN_US ? 'pi pi-check' : undefined,
    command: () => changeLocale(SUPPORTED_LOCALES.EN_US),
  },
  {
    label: LOCALE_NAMES[SUPPORTED_LOCALES.ID_ID],
    icon: locale.value === SUPPORTED_LOCALES.ID_ID ? 'pi pi-check' : undefined,
    command: () => changeLocale(SUPPORTED_LOCALES.ID_ID),
  },
])

/**
 * Change the application locale
 *
 * @param newLocale - The locale code to switch to
 */
function changeLocale(newLocale: string) {
  locale.value = newLocale
  saveLocale(newLocale)
}

/**
 * Toggle the language menu
 */
const menu = useTemplateRef('menu')
function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>
