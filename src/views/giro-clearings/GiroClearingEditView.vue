<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('giroClearings.actions.editGiroClearing') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <GiroClearingForm
          v-if="giroClearingId !== undefined"
          :key="giroClearingId"
          :mode="DialogMode.EDIT"
          :giro-clearing-id="giroClearingId"
          @submitted="afterUpdate"
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
import { usePostSaveNavigation } from '@/composables'

const { t } = useI18n()
const router = useRouter()
const { afterUpdate } = usePostSaveNavigation('/giro-clearings')
const route = useRoute()

const toastGroup = 'giroClearingEdit'
const giroClearingId = ref<number | undefined>()

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
