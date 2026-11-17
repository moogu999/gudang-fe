<template>
  <div class="flex flex-col gap-2" data-testid="exempt-reasons">
    <h3 class="text-sm font-semibold">{{ t('visitRules.exempt.title') }}</h3>
    <p class="text-sm text-stone-500">
      {{ t('visitRules.exempt.hint', { rules: ruleNames }) }}
    </p>
    <MultiSelect
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="id"
      display="chip"
      filter
      :loading="loading"
      :disabled="readonly"
      :placeholder="t('visitRules.exempt.placeholder')"
      class="w-full md:w-2/3"
      @update:model-value="(v: number[]) => emit('update:modelValue', v)"
    />
    <small v-if="modelValue.length === 0" class="text-stone-400">
      {{ t('visitRules.exempt.empty') }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MultiSelect from 'primevue/multiselect'
import { useToast } from 'primevue/usetoast'
import { ReasonsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { ExemptReason, VisitRuleDefinition } from '@/types/visitRule.type'
import { exemptibleKeys } from '../visitRuleHelpers'

const props = defineProps<{
  modelValue: number[]
  /** The reasons already saved, including ones deactivated since. */
  saved: ExemptReason[]
  rules: VisitRuleDefinition[]
  readonly?: boolean
  toastGroup: string
}>()
const emit = defineEmits<{ 'update:modelValue': [ids: number[]] }>()

const { t } = useI18n()
const toast = useToast()

const active = ref<ExemptReason[]>([])
const loading = ref(false)

// Only active "didn't order" reasons can be added; saved ones that were deactivated stay removable.
const options = computed(() => {
  const byId = new Map<number, ExemptReason>()
  for (const r of props.saved) byId.set(r.id, r)
  for (const r of active.value) byId.set(r.id, r)
  return [...byId.values()].map((r) => ({
    id: r.id,
    label: `${r.code} ${r.name}${r.isActive ? '' : ` (${t('visitRules.exempt.inactive')})`}`,
  }))
})

const ruleNames = computed(() =>
  exemptibleKeys(props.rules)
    .map((k) => t(`visitRules.rules.${k}.name`))
    .join(', '),
)

// Readers only see the saved reasons and may lack REASON_READ, so options load only when editable.
let loaded = false
async function loadActive() {
  if (loaded || props.readonly) return
  loaded = true
  loading.value = true
  try {
    const res = await ReasonsService.list({ type: 'customer_no_order', isActive: true })
    active.value = res.data.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.isActive,
    }))
  } catch (e) {
    loaded = false
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

watch(() => props.readonly, loadActive, { immediate: true })
</script>
