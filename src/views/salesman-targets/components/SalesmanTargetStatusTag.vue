<template>
  <Tag :value="t(`salesmanTargets.status.${status}`)" :severity="statusSeverity(status)" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { TargetStatus } from '@/types/salesmanTarget.type'
import { statusSeverity } from '../salesmanTargetHelpers'

defineProps<{ status: TargetStatus }>()

const { t } = useI18n()
</script>
