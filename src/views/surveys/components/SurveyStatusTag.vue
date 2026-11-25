<template>
  <Tag :value="t(`surveys.status.${status}`)" :severity="statusSeverity(status)" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { SurveyDisplayStatus } from '@/types/survey.type'
import { statusSeverity } from '../../must-sell-lists/mustSellListHelpers'

defineProps<{ status: SurveyDisplayStatus }>()

const { t } = useI18n()
</script>
