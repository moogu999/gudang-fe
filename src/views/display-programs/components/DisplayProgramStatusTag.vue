<template>
  <Tag :value="t(`displayPrograms.status.${status}`)" :severity="statusSeverity(status)" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { DisplayProgramDisplayStatus } from '@/types/displayProgram.type'
import { statusSeverity } from '../displayProgramHelpers'

defineProps<{ status: DisplayProgramDisplayStatus }>()

const { t } = useI18n()
</script>
