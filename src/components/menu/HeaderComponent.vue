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
  <div class="hidden w-full flex-1 md:block">
    <form>
      <div class="relative">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText :placeholder="t('table.searchPlaceholder')" />
        </IconField>
      </div>
    </form>
  </div>

  <!-- Mobile search drawer -->
  <Drawer v-model:visible="isSearchDrawerOpen" position="top" :pt="{ root: 'h-auto' }">
    <template #header>
      <h3>{{ t('table.search') }}</h3>
    </template>
    <IconField class="w-full">
      <InputIcon class="pi pi-search" />
      <InputText
        :placeholder="t('table.searchPlaceholder')"
        class="w-full"
        autofocus
      />
    </IconField>
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
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
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
import { useResponsiveSize } from '@/composables'

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
