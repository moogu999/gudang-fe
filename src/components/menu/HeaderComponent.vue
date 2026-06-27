<template>
  <Toast group="headerMenu" />

  <Button
    icon="pi pi-bars"
    severity="secondary"
    text
    @click="toggleSidebar"
    aria-label="Toggle sidebar"
    class="!hidden sm:min-h-0 md:!inline-flex"
  />

  <Button
    icon="pi pi-bars"
    severity="secondary"
    text
    @click="toggleDrawer"
    aria-label="Open menu"
    :size="buttonSize"
    class="!inline-flex min-h-[44px] min-w-[44px] md:!hidden"
  />

  <!-- Spacer to push mobile elements to the right -->
  <div class="flex-1 md:hidden"></div>

  <!-- Mobile search button -->
  <Button
    icon="pi pi-search"
    severity="secondary"
    text
    @click="openMobileSearchDrawer"
    :aria-label="t('table.search')"
    :size="buttonSize"
    class="min-h-[44px] min-w-[44px] md:!hidden"
  />

  <!-- Desktop search -->
  <div class="relative hidden w-full max-w-sm md:block">
    <i
      class="pi pi-search pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-stone-400"
    />
    <MenuSearchAutocomplete
      v-model="searchSelection"
      :suggestions="searchResults"
      scroll-height="20rem"
      @complete="onSearchComplete"
      @option-select="onMenuSelect"
    />
  </div>

  <!-- Spacer to keep language switcher and avatar right-aligned on desktop -->
  <div class="hidden flex-1 md:block"></div>

  <!-- Mobile search drawer -->
  <Drawer v-model:visible="isSearchDrawerOpen" position="top" :pt="{ root: 'h-auto' }">
    <template #header>
      <h3>{{ t('table.search') }}</h3>
    </template>
    <div class="relative w-full">
      <i
        class="pi pi-search pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-stone-400"
      />
      <MenuSearchAutocomplete
        v-model="searchSelection"
        :suggestions="searchResults"
        scroll-height="60vh"
        autofocus
        @complete="onSearchComplete"
        @option-select="onMenuSelect"
      />
    </div>
  </Drawer>

  <LanguageSwitcherComponent />

  <Avatar
    icon="pi pi-user"
    class="mr-2"
    size="normal"
    aria-controls="account_menu"
    @click="toggle"
  />
  <Menu ref="menu" id="account_menu" :model="avatarMenu" :popup="true" />
</template>

<script setup lang="ts">
import { type AutoCompleteOptionSelectEvent } from 'primevue/autocomplete'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Toast from 'primevue/toast'
import Drawer from 'primevue/drawer'
import { useTemplateRef, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useSidebarStore } from '@/stores'
import { commonErrorToast, commonSuccessToast, commonWarnToast } from '@/services'
import LanguageSwitcherComponent from './LanguageSwitcherComponent.vue'
import MenuSearchAutocomplete from './MenuSearchAutocomplete.vue'
import { useResponsiveSize, useMenuSearch, type MenuSearchResult } from '@/composables'

const { t, locale } = useI18n()
const { buttonSize } = useResponsiveSize()

const router = useRouter()
const toast = useToast()

// Sidebar
const sidebarStore = useSidebarStore()
function toggleSidebar() {
  sidebarStore.toggle()
}

function toggleDrawer() {
  sidebarStore.toggleDrawer()
}

// Mobile search drawer
const isSearchDrawerOpen = ref(false)
function openMobileSearchDrawer() {
  isSearchDrawerOpen.value = true
}

// Menu search — find and navigate to accessible menus/submenus
const { search } = useMenuSearch()
const searchResults = ref<MenuSearchResult[]>([])
// AutoComplete drives this via v-model: a string while typing, the selected item once
// an option is chosen.
const searchSelection = ref<string | MenuSearchResult | null>(null)
// Last query, kept so we can refresh results (e.g. their labels) when the locale changes.
const lastSearchQuery = ref('')

function onSearchComplete(event: { query: string }) {
  lastSearchQuery.value = event.query
  searchResults.value = search(event.query)
}

async function onMenuSelect(event: AutoCompleteOptionSelectEvent) {
  const item = event.value as MenuSearchResult
  // Reset input and close the mobile drawer after navigating.
  searchSelection.value = null
  isSearchDrawerOpen.value = false

  await router.push(item.route)

  // The router guard silently redirects users who lack the required permission to
  // Home. If we didn't land on the selected route, surface it instead of leaving
  // the user wondering why nothing happened.
  if (router.currentRoute.value.path !== item.route) {
    toast.add(commonWarnToast(t('navigation.searchAccessDenied'), 'headerMenu'))
  }
}

// When the language changes while the dropdown is open, re-run the last search so
// the displayed labels follow the new locale instead of going stale.
watch(locale, () => {
  if (searchResults.value.length > 0) {
    searchResults.value = search(lastSearchQuery.value)
  }
})

// Auth
const authStore = useAuthStore()
async function handleSignOut() {
  try {
    await authStore.signOut()
    toast.add(commonSuccessToast('Signed out successfully', 'headerMenu'))
    router.push({ name: 'SignIn' })
  } catch (error) {
    toast.add(commonErrorToast(error, 'headerMenu'))
  }
}

// Avatar menu
const avatarMenu = [
  {
    label: 'Sign Out',
    icon: 'pi pi-sign-out',
    command: handleSignOut,
  },
]

const menu = useTemplateRef('menu')
function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>
