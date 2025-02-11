<template>
  <ConfirmDialog :group="group">
    <template #container="{ message, acceptCallback, rejectCallback }">
      <div class="flex flex-col items-center rounded p-8">
        <span class="mb-2 block text-2xl font-bold">{{ message.header }}</span>
        <p class="mb-0">{{ message.message }}</p>
        <div class="mt-6 flex items-center gap-2">
          <Button label="No" outlined @click="rejectCallback" class="w-32"></Button>
          <Button
            :label="!isLoading ? 'Yes' : ''"
            :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
            :disabled="isLoading"
            @click="accept(acceptCallback)"
            class="w-32"
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
