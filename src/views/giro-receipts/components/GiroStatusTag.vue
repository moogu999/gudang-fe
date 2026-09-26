<template>
  <Tag :severity="severity" :value="t(`giroReceipts.giroStatus.${status}`)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { GiroStatus } from '@/types/giroReceipt.type'

// Shared by the receipt detail, the register and the clearing detail. Document-level status
// pills stay local to each module, per house style.
const props = defineProps<{ status: GiroStatus }>()

const { t } = useI18n()

const severity = computed(() => {
  switch (props.status) {
    case 'held':
      return 'secondary'
    case 'clearing':
      return 'info'
    case 'cleared':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'voided':
      return 'contrast'
    default:
      return 'secondary'
  }
})
</script>
