<template>
  <Toast group="headerMenu" />

  <Button
    icon="pi pi-bars"
    severity="secondary"
    text
    @click="toggleSidebar"
    aria-label="Toggle sidebar"
    class="hidden md:flex"
  />

  <div class="w-full flex-1">
    <form>
      <div class="relative">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText placeholder="Search" />
        </IconField>
      </div>
    </form>
  </div>

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
import { useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore, useSidebarStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services'

const router = useRouter()
const toast = useToast()

// Sidebar
const sidebarStore = useSidebarStore()
function toggleSidebar() {
  sidebarStore.toggle()
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
