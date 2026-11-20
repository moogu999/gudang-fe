<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('canvassLoadings.editLoading') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <CanvassLoadingForm
          v-if="loadingId !== undefined"
          :mode="DialogMode.EDIT"
          :loading-id="loadingId"
          @submitted="afterSave"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('canvassLoadings.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CanvassLoadingForm from './CanvassLoadingForm.vue'
import DialogMode from '@/constants/dialogMode'
import type { CanvassLoading } from '@/types/canvassLoading.type'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const loadingId = ref<number | undefined>()

// A draft or rejected loading stays editable, so a save keeps the user here; once it
// was sent or cancelled the read-only detail page takes over.
function afterSave(saved: CanvassLoading) {
  if (saved.status === 'draft' || saved.status === 'rejected') return
  setTimeout(() => router.push(`/canvass-loadings/${saved.id}`), 1000)
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/canvass-loadings')
    return
  }
  loadingId.value = id
})
</script>
