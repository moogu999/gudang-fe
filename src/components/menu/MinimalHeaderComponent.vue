<template>
  <Toast group="minimalHeaderMenu" />

  <div class="flex w-full items-center justify-between">
    <!-- App Title / Home Button -->
    <h1 class="cursor-pointer font-semibold" @click="goToHome">
      {{ appTitle }}
    </h1>

    <!-- Right side: Avatar or Sign In button -->
    <div v-if="isSignedIn" class="flex items-center gap-2">
      <Avatar
        icon="pi pi-user"
        size="normal"
        aria-controls="account_menu"
        @click="toggle"
        class="cursor-pointer"
      />
      <Menu ref="menu" id="account_menu" :model="avatarMenu" :popup="true" />
    </div>

    <Button v-else label="Sign In" @click="goToSignIn" />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Toast from 'primevue/toast'
import { useTemplateRef, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const appTitle = 'gudang-fe'

// Use actual auth state from store
const isSignedIn = computed(() => authStore.isAuthenticated)

// Sign out handler
async function handleSignOut() {
  try {
    await authStore.signOut()
    toast.add(commonSuccessToast('Signed out successfully', 'minimalHeaderMenu'))
    router.push({ name: 'SignIn' })
  } catch (error) {
    toast.add(commonErrorToast(error, 'minimalHeaderMenu'))
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

// Navigation
function goToHome() {
  if (isSignedIn.value) {
    router.push('/')
  } else {
    router.push('/sign-in')
  }
}

function goToSignIn() {
  router.push('/sign-in')
}
</script>
