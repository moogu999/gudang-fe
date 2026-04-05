<template>
  <div class="max-h-80 overflow-auto">
    <DataTable :value="errors" size="small" scrollable scroll-height="320px">
      <Column field="row" :header="t('csv.errorRow')" style="width: 5rem" />
      <Column field="column" :header="t('csv.errorColumn')" style="width: 10rem" />
      <Column field="value" :header="t('csv.errorValue')" style="width: 10rem" />
      <Column field="message" :header="t('csv.errorMessage')" />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { CsvUploadError } from '@/types'

defineProps<{
  errors: CsvUploadError[]
}>()

const { t } = useI18n()
</script>
