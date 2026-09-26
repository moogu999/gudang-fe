<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('giroClearings.viewGiroClearing') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <GiroClearingForm
          v-if="giroClearingId !== undefined"
          :key="giroClearingId"
          :mode="DialogMode.VIEW"
          :giro-clearing-id="giroClearingId"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('giroClearings.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import GiroClearingForm from './GiroClearingForm.vue'
import DialogMode from '@/constants/dialogMode'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const toastGroup = 'giroClearingDetail'
const giroClearingId = ref<number | undefined>()

// Watched, not read once on mount: going from one batch to another reuses this component
// instance.
watch(
  () => route.params.id,
  (raw) => {
    const id = Number(raw)
    if (isNaN(id)) {
      router.push('/giro?tab=clearings')
      return
    }
    giroClearingId.value = id
  },
  { immediate: true },
)
</script>
