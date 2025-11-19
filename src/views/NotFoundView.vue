<template>
  <div class="flex flex-col items-center justify-center gap-6 py-12">
    <h1 class="text-6xl font-bold text-stone-800">404</h1>
    <p class="text-xl text-stone-600">Page not found</p>
    <p class="text-center text-stone-500">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Button
      label="Go to Home"
      icon="pi pi-home"
      @click="goToHome"
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

const router = useRouter()

function goToHome() {
  router.push('/')
}
</script>
