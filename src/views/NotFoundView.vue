<template>
  <div class="flex flex-col items-center justify-center gap-6 py-12">
    <h1 class="text-6xl font-bold text-stone-800">404</h1>
    <p class="text-xl text-stone-600">{{ t('notFound.title') }}</p>
    <p class="text-center text-stone-500">
      {{ t('notFound.description') }}
    </p>
    <Button
      :label="t('notFound.goToHome')"
      icon="pi pi-home"
      @click="goToHome"
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

function goToHome() {
  router.push('/')
}
</script>
