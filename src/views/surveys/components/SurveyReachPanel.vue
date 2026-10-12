<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-2">
        <h2 class="text-base font-semibold">{{ t('surveys.reach.title') }}</h2>
        <div
          class="flex flex-wrap items-baseline gap-x-6 gap-y-2"
          :class="{ 'opacity-50': loading }"
        >
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-semibold" data-testid="reach-customers">
              {{ customers === undefined ? '—' : formatNumber(customers, locale) }}
            </span>
            <span class="text-sm text-stone-500">{{ t('surveys.reach.customers') }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-semibold" data-testid="reach-salesmen">
              {{ salesmen === undefined ? '—' : formatNumber(salesmen, locale) }}
            </span>
            <span class="text-sm text-stone-500">{{ t('surveys.reach.salesmen') }}</span>
          </div>
        </div>
        <small class="text-surface-500">{{ t('surveys.reach.help') }}</small>
        <div>
          <Button
            type="button"
            :label="t('surveys.reach.view')"
            icon="pi pi-users"
            severity="secondary"
            outlined
            size="small"
            :disabled="!canView"
            data-testid="reach-view"
            @click="emit('view')"
          />
        </div>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { formatNumber } from '../surveyHelpers'

defineProps<{
  customers?: number
  salesmen?: number
  loading?: boolean
  canView: boolean
}>()
const emit = defineEmits<{ view: [] }>()

const { t, locale } = useI18n()
</script>
