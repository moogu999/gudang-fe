<template>
  <div class="flex flex-wrap items-end gap-3">
    <!-- Reference Type -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('auditTrails.filters.type') }}</label>
      <Select
        v-model="selectedType"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('common.labels.selectOption')"
        show-clear
        class="w-52"
        @change="onTypeChange"
      />
    </div>

    <!-- Reference (InfiniteSelect, cascades from type) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('auditTrails.filters.reference') }}</label>
      <InfiniteSelect
        v-if="selectedType && currentTypeEntry"
        :key="selectedType"
        v-model="selectedReferenceId"
        :option-label="currentTypeEntry.codeField"
        option-value="id"
        :fetch-fn="currentTypeEntry.fetchFn"
        :initial-option="initialReferenceOption"
        sort-by="code"
        sort-operator="asc"
        class="w-52"
        @update:model-value="onReferenceChange"
      />
      <Select
        v-else
        disabled
        :placeholder="t('auditTrails.filters.reference')"
        :options="[]"
        class="w-52"
      />
    </div>

    <!-- Date Range -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('auditTrails.filters.dateRange') }}</label>
      <DatePicker
        v-model="selectedDateRange"
        selection-mode="range"
        :placeholder="t('auditTrails.filters.dateRange')"
        show-clear
        show-icon
        date-format="yy-mm-dd"
        class="w-60"
        @update:model-value="onDateRangeChange"
      />
    </div>

    <!-- Clear button -->
    <Button severity="secondary" :label="t('table.clearFilters')" @click="clearAll" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { AUDIT_REFERENCE_TYPES } from '@/constants/auditReferenceTypes'
import type { AuditReferenceType } from '@/types/auditTrail.type'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    initialFilters?: {
      referenceType?: AuditReferenceType
      referenceId?: number
    }
  }>(),
  { initialFilters: undefined },
)

const emit = defineEmits<{
  change: [
    filters: {
      referenceType?: AuditReferenceType
      referenceId?: number
      dateRange?: [string, string]
    },
  ]
}>()

const selectedType = ref<AuditReferenceType | undefined>(undefined)
const selectedReferenceId = ref<number | undefined>(undefined)
const selectedDateRange = ref<Date[] | null>(null)

// When a referenceId is pre-seeded from a query param, we only have the ID.
// Pass a minimal initial-option so InfiniteSelect shows "#ID" until the user interacts.
const initialReferenceOption = computed(() => {
  if (!props.initialFilters?.referenceId || selectedReferenceId.value !== props.initialFilters.referenceId) {
    return undefined
  }
  const codeField = currentTypeEntry.value?.codeField ?? 'name'
  return { id: props.initialFilters.referenceId, [codeField]: `#${props.initialFilters.referenceId}` }
})

const typeOptions = computed(() =>
  Object.entries(AUDIT_REFERENCE_TYPES).map(([value, entry]) => ({
    value,
    label: t(entry.labelKey),
  })),
)

const currentTypeEntry = computed(() =>
  selectedType.value ? AUDIT_REFERENCE_TYPES[selectedType.value] : undefined,
)

onMounted(() => {
  if (props.initialFilters?.referenceType) {
    selectedType.value = props.initialFilters.referenceType
    selectedReferenceId.value = props.initialFilters.referenceId
  }
})

function onTypeChange() {
  selectedReferenceId.value = undefined
  emitChange()
}

function onReferenceChange() {
  emitChange()
}

function onDateRangeChange() {
  emitChange()
}

function clearAll() {
  selectedType.value = undefined
  selectedReferenceId.value = undefined
  selectedDateRange.value = null
  emitChange()
}

function emitChange() {
  const filters: {
    referenceType?: AuditReferenceType
    referenceId?: number
    dateRange?: [string, string]
  } = {}

  if (selectedType.value) {
    filters.referenceType = selectedType.value
  }

  if (selectedReferenceId.value != null) {
    filters.referenceId = selectedReferenceId.value
  }

  if (
    selectedDateRange.value &&
    Array.isArray(selectedDateRange.value) &&
    selectedDateRange.value.length === 2 &&
    selectedDateRange.value[0] &&
    selectedDateRange.value[1]
  ) {
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    filters.dateRange = [fmt(selectedDateRange.value[0]), fmt(selectedDateRange.value[1])]
  }

  emit('change', filters)
}
</script>
