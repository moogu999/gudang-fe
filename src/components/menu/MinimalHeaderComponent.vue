<template>
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
import { useTemplateRef, ref } from 'vue'
import { useRouter } from 'vue-router'
import { avatarMenu } from './menu'

const router = useRouter()
const appTitle = 'gudang-fe'

// Hardcoded for now - TODO: Replace with actual auth state
const isSignedIn = ref(true)

// Avatar menu
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
