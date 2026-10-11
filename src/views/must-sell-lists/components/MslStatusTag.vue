<template>
  <Tag :value="t(`mustSellLists.status.${status}`)" :severity="statusSeverity(status)" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { MslDisplayStatus } from '@/types/mustSellList.type'
import { statusSeverity } from '../mustSellListHelpers'

defineProps<{ status: MslDisplayStatus }>()

const { t } = useI18n()
</script>
