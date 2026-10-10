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
        v-if="selectedType && currentTypeEntry?.picker"
        :key="selectedType"
        v-model="selectedReferenceId"
        :option-label="currentTypeEntry.picker.codeField"
        option-value="id"
        :fetch-fn="currentTypeEntry.picker.fetchFn"
        :initial-option="initialReferenceOption"
        sort-by="code"
        sort-operator="asc"
        class="w-52"
        @update:model-value="onReferenceChange"
      />
      <!-- No list to pick from: the reference id is typed in. -->
      <InputNumber
        v-else-if="selectedType && currentTypeEntry"
        v-model="selectedReferenceId"
        :use-grouping="false"
        :min="1"
        :placeholder="t('auditTrails.filters.referenceId')"
        input-class="w-52"
        data-testid="audit-reference-id"
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

    <!-- Action -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">{{ t('auditTrails.filters.action') }}</label>
      <Select
        v-model="selectedAction"
        :options="actionOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('common.labels.selectOption')"
        show-clear
        filter
        class="w-52"
        data-testid="audit-action"
        @change="emitChange"
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
        class="w-72"
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
import InputNumber from 'primevue/inputnumber'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { AUDIT_REFERENCE_TYPES } from '@/constants/auditReferenceTypes'
import { AUDIT_ACTIONS, type AuditReferenceType } from '@/types/auditTrail.type'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    initialFilters?: {
      referenceType?: AuditReferenceType
      referenceId?: number
      action?: string
    }
  }>(),
  { initialFilters: undefined },
)

const emit = defineEmits<{
  change: [
    filters: {
      referenceType?: AuditReferenceType
      referenceId?: number
      action?: string
      dateRange?: [string, string]
    },
  ]
}>()

const selectedType = ref<AuditReferenceType | undefined>(undefined)
const selectedReferenceId = ref<number | undefined>(undefined)
const selectedDateRange = ref<Date[] | null>(null)
const selectedAction = ref<string | undefined>(undefined)

const actionOptions = computed(() =>
  AUDIT_ACTIONS.map((value) => ({ value, label: t(`auditTrails.actions.${value}`) })),
)

// When a referenceId is pre-seeded from a query param, we only have the ID.
// Pass a minimal initial-option so InfiniteSelect shows "#ID" until the user interacts.
const initialReferenceOption = computed(() => {
  if (
    !props.initialFilters?.referenceId ||
    selectedReferenceId.value !== props.initialFilters.referenceId
  ) {
    return undefined
  }
  const codeField = currentTypeEntry.value?.picker?.codeField ?? 'name'
  return {
    id: props.initialFilters.referenceId,
    [codeField]: `#${props.initialFilters.referenceId}`,
  }
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
  if (props.initialFilters?.action) selectedAction.value = props.initialFilters.action
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
  selectedAction.value = undefined
  emitChange()
}

function emitChange() {
  const filters: {
    referenceType?: AuditReferenceType
    referenceId?: number
    action?: string
    dateRange?: [string, string]
  } = {}

  if (selectedType.value) {
    filters.referenceType = selectedType.value
  }

  if (selectedReferenceId.value != null) {
    filters.referenceId = selectedReferenceId.value
  }

  if (selectedAction.value) {
    filters.action = selectedAction.value
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
