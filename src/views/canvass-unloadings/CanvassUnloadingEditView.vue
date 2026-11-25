<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('canvassUnloadings.editUnloading') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <CanvassUnloadingForm
          v-if="unloadingId !== undefined"
          :mode="DialogMode.EDIT"
          :unloading-id="unloadingId"
          @submitted="afterUpdate"
          @cancel="router.back()"
        />
        <Message v-else severity="error">{{ t('canvassUnloadings.messages.notFound') }}</Message>
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
import CanvassUnloadingForm from './CanvassUnloadingForm.vue'
import DialogMode from '@/constants/dialogMode'
import { usePostSaveNavigation } from '@/composables'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { afterUpdate } = usePostSaveNavigation('/canvass-unloadings')

const unloadingId = ref<number | undefined>()

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/canvass-unloadings')
    return
  }
  unloadingId.value = id
})
</script>
