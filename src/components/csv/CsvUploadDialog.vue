<template>
  <Dialog
    :header="t('csv.import')"
    :visible="visible"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '50vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="
      (v) => {
        if (!v) emit('close')
      }
    "
  >
    <div class="flex flex-col gap-4">
      <!-- Instructions -->
      <p class="text-sm text-gray-600">{{ t('csv.instructions') }}</p>
      <p class="text-xs text-gray-500">
        {{ t('csv.maxRows', { max: 1000 }) }} &mdash;
        {{ t('csv.maxSize', { max: '2 MB' }) }}
      </p>

      <!-- Step 1: Download template -->
      <div>
        <a ref="downloadAnchorRef" class="hidden" />
        <Button
          :label="t('csv.downloadTemplate')"
          icon="pi pi-download"
          severity="secondary"
          size="small"
          @click="downloadTemplate"
        />
      </div>

      <!-- Step 2: File picker -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold">{{ t('csv.uploadFile') }}</label>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FileUpload
            mode="basic"
            accept=".csv"
            :max-file-size="2097152"
            :choose-label="selectedFile ? selectedFile.name : t('csv.uploadFile')"
            :auto="false"
            @select="onFileSelect"
          />
          <Button
            :label="uploading ? t('csv.uploading') : t('csv.uploadFile')"
            icon="pi pi-upload"
            :loading="uploading"
            :disabled="!selectedFile || uploading"
            @click="handleUpload"
          />
        </div>
      </div>

      <!-- Error list -->
      <div v-if="uploadErrors.length > 0">
        <p class="mb-2 text-sm font-semibold text-red-600">
          {{ t('csv.errorTitle', { count: uploadErrors.length }) }}
        </p>
        <CsvErrorList :errors="uploadErrors" />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import ApiService from '@/services/api'
import CsvErrorList from './CsvErrorList.vue'
import type { CsvUploadError, CsvUploadResponse } from '@/types'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'

const props = defineProps<{
  visible: boolean
  entityName: string
  templateUrl: string
  uploadUrl: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const { t } = useI18n()
const toast = useToast()

const overlayGroup = 'csvUploadDialog'
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadErrors = ref<CsvUploadError[]>([])
const downloadAnchorRef = ref<HTMLAnchorElement | null>(null)

function onFileSelect(event: FileUploadSelectEvent) {
  selectedFile.value = event.files[0] ?? null
  uploadErrors.value = []
}

function downloadTemplate() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const url = `${baseUrl}${props.templateUrl}`
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function handleUpload() {
  if (!selectedFile.value) return

  uploading.value = true
  uploadErrors.value = []

  try {
    const response = await ApiService.upload<CsvUploadResponse>(props.uploadUrl, selectedFile.value)

    if (response.success) {
      toast.add(
        commonSuccessToast(t('csv.success', { count: response.successCount }), overlayGroup),
      )
      selectedFile.value = null
      emit('success')
      emit('close')
    } else {
      uploadErrors.value = response.errors
    }
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    uploading.value = false
  }
}
</script>
