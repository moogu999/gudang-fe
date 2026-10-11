<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-2">
        <h2 class="text-base font-semibold">{{ t('mustSellLists.reach.title') }}</h2>
        <div class="flex items-baseline gap-2">
          <span
            class="text-3xl font-semibold"
            :class="{ 'opacity-50': loading }"
            data-testid="reach-count"
          >
            {{ count === undefined ? '—' : formatNumber(count, locale) }}
          </span>
          <span class="text-sm text-stone-500">{{ t('mustSellLists.reach.customers') }}</span>
        </div>
        <small class="text-surface-500">{{ t('mustSellLists.reach.help') }}</small>
        <div>
          <Button
            type="button"
            :label="t('mustSellLists.reach.view')"
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
import { formatNumber } from '../mustSellListHelpers'

defineProps<{ count?: number; loading?: boolean; canView: boolean }>()
const emit = defineEmits<{ view: [] }>()

const { t, locale } = useI18n()
</script>
