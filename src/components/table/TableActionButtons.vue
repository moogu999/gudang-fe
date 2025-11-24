<template>
  <div class="flex items-center gap-1">
    <template v-if="canWrite">
      <!-- Edit button -->
      <Button
        icon="pi pi-pen-to-square"
        severity="contrast"
        @click="$emit('edit')"
        text
        rounded
        outlined
        :aria-label="t('common.actions.edit')"
        class="sm:!rounded-md"
      />

      <!-- Delete button -->
      <Button
        icon="pi pi-trash"
        severity="danger"
        @click="$emit('delete')"
        text
        rounded
        outlined
        :aria-label="t('common.actions.delete')"
        class="sm:!rounded-md"
      />
    </template>
    <template v-else>
      <!-- View button -->
      <Button
        icon="pi pi-eye"
        severity="contrast"
        @click="$emit('view')"
        text
        rounded
        outlined
        :aria-label="t('common.actions.view')"
        class="sm:!rounded-md"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

interface Props {
  canWrite: boolean
}

defineProps<Props>()

defineEmits<{
  edit: []
  delete: []
  view: []
}>()

const { t } = useI18n()
</script>
