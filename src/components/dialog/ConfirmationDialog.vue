<template>
  <ConfirmDialog :group="group">
    <template #container="{ message, acceptCallback, rejectCallback }">
      <div class="flex flex-col items-center rounded p-4 sm:p-6 md:p-8">
        <span class="mb-2 block text-lg font-bold sm:text-xl md:text-2xl">{{ message.header }}</span>
        <p class="mb-0 text-sm sm:text-base">{{ message.message }}</p>
        <div class="mt-4 flex w-full flex-col items-stretch gap-2 sm:mt-6 sm:w-auto sm:flex-row sm:items-center">
          <Button
            :label="message.rejectProps?.label"
            :outlined="message.rejectProps?.outlined"
            :severity="message.rejectProps?.severity"
            @click="rejectCallback"
            :size="buttonSize"
            class="min-h-[44px] sm:min-h-0 sm:w-32"
          ></Button>
          <Button
            :label="!isLoading ? message.acceptProps?.label : ''"
            :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
            :disabled="isLoading"
            @click="accept(acceptCallback)"
            :size="buttonSize"
            class="min-h-[44px] sm:min-h-0 sm:w-32"
          ></Button>
        </div>
      </div>
    </template>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import { ref } from 'vue'
import { useResponsiveSize } from '@/composables'

const { buttonSize } = useResponsiveSize()

const props = defineProps({
  group: {
    type: String,
    required: true,
  },
  acceptHandler: {
    type: Function,
    required: true,
  },
})

const isLoading = ref(false)

async function accept(callback: () => void) {
  isLoading.value = true

  try {
    await props.acceptHandler()
    callback()
  } finally {
    isLoading.value = false
  }
}
</script>
