<template>
  <div class="flex items-center gap-2 sm:gap-1">
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
        :size="buttonSize"
        class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:!rounded-md"
      />

      <!-- Delete button -->
      <Button
        v-if="canDelete"
        icon="pi pi-trash"
        severity="danger"
        @click="$emit('delete')"
        text
        rounded
        outlined
        :aria-label="t('common.actions.delete')"
        :size="buttonSize"
        class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:!rounded-md"
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
        :size="buttonSize"
        class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:!rounded-md"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useResponsiveSize } from '@/composables'

interface Props {
  canWrite: boolean
  /** Hides Delete for a row that can't be deleted while still allowing edits. */
  canDelete?: boolean
}

withDefaults(defineProps<Props>(), { canDelete: true })

defineEmits<{
  edit: []
  delete: []
  view: []
}>()

const { t } = useI18n()
const { buttonSize } = useResponsiveSize()
</script>
