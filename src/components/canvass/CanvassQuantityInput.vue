<template>
  <InputText
    v-if="isTiered"
    :model-value="raw"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full font-mono"
    data-testid="tier-input"
    @input="onTierInput"
  />
  <InputNumber
    v-else
    :model-value="modelValue"
    :locale="locale"
    :min="0"
    :min-fraction-digits="0"
    :max-fraction-digits="4"
    :disabled="disabled"
    class="w-full"
    @update:model-value="(v: number | null) => emit('update:modelValue', v ?? 0)"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import type { UomConversionLevel } from '@/types'
import { computeBaseQty, decomposeBaseQty } from '@/utils/uomHelper'

/**
 * Quantity entry in a product's UOM tiers ("2/5" for CTN/PCS), stored as the base
 * quantity. A product with a single level gets a plain number input.
 */
const props = defineProps<{
  modelValue: number
  levels?: UomConversionLevel[]
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const { locale } = useI18n()

const isTiered = computed(() => (props.levels?.length ?? 0) > 1)
const placeholder = computed(() => props.levels?.map((l) => l.uom?.symbol ?? '?').join('/') ?? '')

function tiersToString(base: number): string {
  return isTiered.value ? decomposeBaseQty(base, props.levels!).join('/') : ''
}

function parseTiers(raw: string): number[] {
  const parts = raw.split('/')
  return Array.from({ length: props.levels!.length }, (_, i) => {
    const n = parseInt((parts[i] ?? '').trim(), 10)
    return isNaN(n) || n < 0 ? 0 : n
  })
}

// Keep what the user typed ("2/") instead of re-rendering it from the number mid-edit.
const raw = ref(tiersToString(props.modelValue))

watch(
  () => [props.modelValue, props.levels] as const,
  () => {
    if (!isTiered.value) return
    if (computeBaseQty(parseTiers(raw.value), props.levels!) !== props.modelValue) {
      raw.value = tiersToString(props.modelValue)
    }
  },
)

function onTierInput(e: Event) {
  raw.value = (e.target as HTMLInputElement).value
  emit('update:modelValue', computeBaseQty(parseTiers(raw.value), props.levels!))
}
</script>
