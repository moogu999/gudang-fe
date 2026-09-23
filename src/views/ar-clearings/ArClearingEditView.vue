<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('arClearings.actions.editArClearing') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <ArClearingForm
          v-if="arClearingId !== undefined"
          :key="arClearingId"
          :mode="DialogMode.EDIT"
          :ar-clearing-id="arClearingId"
          @submitted="afterUpdate"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('arClearings.messages.notFound') }}</Message>
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
import ArClearingForm from './ArClearingForm.vue'
import DialogMode from '@/constants/dialogMode'
import { usePostSaveNavigation } from '@/composables'

const { t } = useI18n()
const router = useRouter()
const { afterUpdate } = usePostSaveNavigation('/ar-clearings')
const route = useRoute()

const toastGroup = 'arClearingEdit'
const arClearingId = ref<number | undefined>()

// Watched, not read once on mount: the view can be reused across ids, which would otherwise
// leave a stale form on screen.
watch(
  () => route.params.id,
  (raw) => {
    const id = Number(raw)
    if (isNaN(id)) {
      router.push('/ar-clearings')
      return
    }
    arClearingId.value = id
  },
  { immediate: true },
)
</script>
