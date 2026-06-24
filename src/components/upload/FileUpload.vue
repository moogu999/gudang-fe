<template>
  <div class="flex items-center gap-4">
    <!-- Avatar / preview -->
    <button
      v-if="previewSrc"
      type="button"
      class="hover:ring-primary-400 focus:ring-primary-400 h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-stone-100 ring-2 ring-stone-200 transition-all focus:outline-none"
      :title="viewLabel"
      @click="showDialog = true"
    >
      <img :src="previewSrc" class="h-full w-full object-cover" alt="Preview" />
    </button>
    <div
      v-else
      class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-stone-100"
    >
      <i class="pi pi-user text-2xl text-stone-400" />
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-2">
      <input ref="inputRef" type="file" :accept="accept" class="hidden" @change="onFileSelected" />
      <Button
        type="button"
        :label="uploadLabel"
        icon="pi pi-upload"
        severity="secondary"
        size="small"
        :loading="isUploading"
        @click="inputRef?.click()"
      />
      <Button
        v-if="previewSrc"
        type="button"
        :label="deleteLabel"
        icon="pi pi-trash"
        severity="danger"
        outlined
        size="small"
        :loading="isDeleting"
        @click="onDelete"
      />
    </div>
  </div>

  <!-- Full-size dialog -->
  <Dialog v-model:visible="showDialog" modal :style="{ maxWidth: '90vw' }">
    <div class="flex justify-center">
      <img
        v-if="previewSrc"
        :src="previewSrc"
        class="max-h-[75vh] max-w-full rounded object-contain"
        alt="Full preview"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { FilesService } from '@/services/files.service'

const props = withDefaults(
  defineProps<{
    ownerType: string
    category: string
    cardinality?: 'single' | 'multi'
    accept?: string
    maxSize?: number
    ownerId?: number | null
    modelValue?: string | null
    uploadLabel?: string
    deleteLabel?: string
    viewLabel?: string
  }>(),
  {
    cardinality: 'single',
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024,
    ownerId: null,
    modelValue: null,
    uploadLabel: 'Upload',
    deleteLabel: 'Delete',
    viewLabel: 'View',
  },
)

const emit = defineEmits<{
  uploaded: [url: string]
  removed: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const showDialog = ref(false)
const isUploading = ref(false)
const isDeleting = ref(false)
const pendingFile = ref<File | null>(null)
const pendingPreviewUrl = ref<string | null>(null)

// Tracks the server-side file id for the currently displayed uploaded file
const uploadedFileId = ref<number | null>(null)

function buildUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}${url}`
}

const previewSrc = computed<string | null>(() => {
  if (pendingPreviewUrl.value) return pendingPreviewUrl.value
  if (props.modelValue) return buildUrl(props.modelValue)
  return null
})

watch(
  () => props.modelValue,
  () => {
    // Reset pending state when parent provides a new server url
    clearPending()
  },
)

function clearPending() {
  if (pendingPreviewUrl.value) {
    URL.revokeObjectURL(pendingPreviewUrl.value)
    pendingPreviewUrl.value = null
  }
  pendingFile.value = null
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  // Reset so same file can be re-selected after clearing
  input.value = ''

  if (props.maxSize && file.size > props.maxSize) return

  clearPending()
  pendingFile.value = file
  pendingPreviewUrl.value = URL.createObjectURL(file)

  // Upload immediately if ownerId is available
  if (props.ownerId) {
    void doUpload(props.ownerId, file)
  }
}

async function doUpload(ownerId: number, file: File): Promise<void> {
  isUploading.value = true
  try {
    const record = await FilesService.upload(props.ownerType, ownerId, props.category, file)
    uploadedFileId.value = record.id
    clearPending()
    emit('uploaded', record.url)
  } finally {
    isUploading.value = false
  }
}

/** Called by the parent after creating a new entity to flush any pending file. */
async function flushPending(ownerId: number): Promise<void> {
  if (!pendingFile.value) return
  await doUpload(ownerId, pendingFile.value)
}

async function onDelete() {
  // If there's a pending (not-yet-uploaded) file, just clear it locally.
  if (pendingFile.value) {
    clearPending()
    return
  }

  // Remove the server-side file.
  if (uploadedFileId.value) {
    isDeleting.value = true
    try {
      await FilesService.remove(uploadedFileId.value)
      uploadedFileId.value = null
      emit('removed')
    } finally {
      isDeleting.value = false
    }
    return
  }

  // No tracked id — emit removed so the parent can handle it (e.g., via a separate delete route).
  emit('removed')
}

defineExpose({ flushPending })
</script>
