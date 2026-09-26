<template>
  <div class="rounded-lg border border-stone-200 p-4">
    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('arClearings.sections.summary') }}
    </h4>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-1 rounded-md bg-stone-50 p-3">
        <span class="text-xs text-stone-500">{{ t('arClearings.summary.available') }}</span>
        <span class="text-lg font-semibold" data-testid="available">{{
          formatNumber(availableValue)
        }}</span>
      </div>

      <div class="flex flex-col gap-1 rounded-md bg-green-50 p-3">
        <span class="text-xs text-stone-500">{{ t('arClearings.summary.allocated') }}</span>
        <span class="text-lg font-semibold text-green-700" data-testid="allocated">{{
          formatNumber(allocatedValue)
        }}</span>
      </div>

      <div
        class="flex flex-col gap-1 rounded-md p-3"
        :class="
          unallocatedValue === 0
            ? 'bg-green-50'
            : unallocatedValue < 0
              ? 'bg-red-50'
              : 'bg-amber-50'
        "
      >
        <span class="text-xs text-stone-500">{{ t('arClearings.summary.unallocated') }}</span>
        <span
          class="text-lg font-semibold"
          :class="
            unallocatedValue === 0
              ? 'text-green-700'
              : unallocatedValue < 0
                ? 'text-red-600'
                : 'text-amber-600'
          "
          data-testid="unallocated"
          >{{ formatNumber(unallocatedValue) }}</span
        >
      </div>
    </div>

    <!-- Leaving cash unapplied is fine — reassure rather than warn. -->
    <Message
      v-if="unallocatedValue > 0"
      severity="info"
      variant="simple"
      size="small"
      class="mt-3"
      data-testid="remainder-hint"
    >
      {{ t('arClearings.summary.remainderHint') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Message from 'primevue/message'
import { round2 } from '../arClearingLines'

const { t } = useI18n()

interface Props {
  /** Live figures from the ticked sources and the allocation column. Ignored in readonly mode. */
  available: number
  allocated: number
  unallocated: number
  /** VIEW mode: render the server's saved figures verbatim, never a recomputation. */
  readonly?: boolean
  savedAvailable?: number
  savedAllocated?: number
  savedUnallocated?: number
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  savedAvailable: undefined,
  savedAllocated: undefined,
  savedUnallocated: undefined,
})

const useSaved = computed(() => props.readonly && props.savedAvailable !== undefined)

const availableValue = computed(() =>
  round2(useSaved.value ? (props.savedAvailable ?? 0) : props.available),
)
const allocatedValue = computed(() =>
  round2(useSaved.value ? (props.savedAllocated ?? 0) : props.allocated),
)
const unallocatedValue = computed(() =>
  round2(useSaved.value ? (props.savedUnallocated ?? 0) : props.unallocated),
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
