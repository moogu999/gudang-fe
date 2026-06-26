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
    <AutoComplete
      v-model="searchSelection"
      :suggestions="searchResults"
      option-label="label"
      :placeholder="t('navigation.searchMenu')"
      :complete-on-focus="true"
      :delay="100"
      scroll-height="20rem"
      class="w-full"
      input-class="w-full !pl-10"
      @complete="onSearchComplete"
      @option-select="onMenuSelect"
    >
      <template #option="{ option }">
        <div class="flex items-center gap-3">
          <span :class="[option.icon, 'text-stone-500']" />
          <div class="flex flex-col">
            <span>{{ option.label }}</span>
            <small v-if="option.section" class="text-stone-500">{{ option.section }}</small>
          </div>
        </div>
      </template>
      <template #empty>
        <div class="px-3 py-2 text-stone-500">{{ t('navigation.searchNoResults') }}</div>
      </template>
    </AutoComplete>
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
      <AutoComplete
        v-model="searchSelection"
        :suggestions="searchResults"
        option-label="label"
        :placeholder="t('navigation.searchMenu')"
        :complete-on-focus="true"
        :delay="100"
        scroll-height="60vh"
        class="w-full"
        input-class="w-full !pl-10"
        autofocus
        @complete="onSearchComplete"
        @option-select="onMenuSelect"
      >
        <template #option="{ option }">
          <div class="flex items-center gap-3">
            <span :class="[option.icon, 'text-stone-500']" />
            <div class="flex flex-col">
              <span>{{ option.label }}</span>
              <small v-if="option.section" class="text-stone-500">{{ option.section }}</small>
            </div>
          </div>
        </template>
        <template #empty>
          <div class="px-3 py-2 text-stone-500">{{ t('navigation.searchNoResults') }}</div>
        </template>
      </AutoComplete>
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
import AutoComplete, { type AutoCompleteOptionSelectEvent } from 'primevue/autocomplete'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Toast from 'primevue/toast'
import Drawer from 'primevue/drawer'
import { useTemplateRef, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useSidebarStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services'
import LanguageSwitcherComponent from './LanguageSwitcherComponent.vue'
import { useResponsiveSize, useMenuSearch, type MenuSearchResult } from '@/composables'

const { t } = useI18n()
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

function onSearchComplete(event: { query: string }) {
  searchResults.value = search(event.query)
}

function onMenuSelect(event: AutoCompleteOptionSelectEvent) {
  const item = event.value as MenuSearchResult
  router.push(item.route)
  // Reset input and close the mobile drawer after navigating.
  searchSelection.value = null
  isSearchDrawerOpen.value = false
}

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
