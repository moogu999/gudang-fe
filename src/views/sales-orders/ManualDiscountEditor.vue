<template>
  <div>
    <p class="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
      {{ t('salesOrders.manualDiscount.title') }}
    </p>

    <!-- Applied discounts list -->
    <table v-if="modelValue.length" class="mb-3 w-full text-xs">
      <colgroup>
        <col style="width: 30%" />
        <col style="width: 14%" />
        <col style="width: 14%" />
        <col style="width: 13%" />
        <col style="width: 13%" />
        <col style="width: 13%" />
        <col v-if="!disabled" style="width: 4%" />
      </colgroup>
      <thead>
        <tr class="border-b border-stone-200 text-stone-400">
          <th class="pb-1 text-left">{{ t('salesOrders.manualDiscount.reason') }}</th>
          <th class="pb-1 text-left">{{ t('salesOrders.manualDiscount.type') }}</th>
          <th class="pb-1 text-right">{{ t('salesOrders.manualDiscount.value') }}</th>
          <th class="pb-1 text-right">{{ t('salesOrders.manualDiscount.amount') }}</th>
          <th class="pb-1 text-right">{{ t('salesOrders.manualDiscount.taxBase') }}</th>
          <th class="pb-1 text-right">{{ t('salesOrders.manualDiscount.tax') }}</th>
          <th v-if="!disabled" class="pb-1" style="width: 2rem" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(disc, idx) in modelValue" :key="idx" class="border-b border-stone-100">
          <td class="py-0.5 text-stone-500">{{ disc.reason }}</td>
          <td class="py-0.5 capitalize">
            {{
              disc.discountType === 'flat'
                ? t('salesOrders.manualDiscount.flat')
                : t('salesOrders.manualDiscount.percentage')
            }}
          </td>
          <td class="py-0.5 text-right">
            {{ disc.discountType === 'percentage' ? `${disc.value}%` : formatValue(disc.value) }}
          </td>
          <td class="py-0.5 text-right text-red-600">-{{ formatValue(previewAmount(disc)) }}</td>
          <td class="py-0.5 text-right text-red-600">{{ formatValue(disc.taxBaseAmount) }}</td>
          <td class="py-0.5 text-right text-red-600">{{ formatValue(disc.taxAmount) }}</td>
          <td v-if="!disabled" class="py-0.5 text-right">
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              @click="removeDiscount(idx)"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Add form (edit mode only) -->
    <div v-if="!disabled" class="space-y-2 rounded border border-stone-200 bg-stone-50 p-3">
      <!-- Row 1: Type + Value -->
      <div class="flex items-end gap-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-stone-500">{{
            t('salesOrders.manualDiscount.type')
          }}</label>
          <Select
            v-model="addType"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            class="w-36"
            size="small"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-stone-500">{{
            t('salesOrders.manualDiscount.value')
          }}</label>
          <InputNumber
            v-model="addValue"
            :locale="locale"
            :min="0"
            :min-fraction-digits="0"
            :max-fraction-digits="2"
            class="w-36"
            size="small"
            :placeholder="addType === 'percentage' ? '%' : '0.00'"
          />
        </div>
      </div>

      <!-- Row 2: Reason + Add button -->
      <div class="flex items-end gap-2">
        <div class="flex flex-1 flex-col gap-1">
          <label class="text-xs font-medium text-stone-500">
            {{ t('salesOrders.manualDiscount.reason') }}
            <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="addReason"
            class="w-full"
            size="small"
            :placeholder="t('salesOrders.manualDiscount.reasonPlaceholder')"
          />
        </div>
        <Button
          :label="t('salesOrders.manualDiscount.add')"
          icon="pi pi-plus"
          size="small"
          :disabled="!canAdd"
          @click="addDiscount"
        />
      </div>

      <Message v-if="showValidation && !canAdd" severity="error" size="small" variant="simple">
        {{
          !addReason.trim()
            ? t('salesOrders.validation.manualDiscountReasonRequired')
            : t('salesOrders.validation.manualDiscountValueInvalid')
        }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import type { ManualDiscount } from '@/types'

const { t, locale } = useI18n()

interface Props {
  modelValue: ManualDiscount[]
  disabled?: boolean
  gross?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  gross: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: ManualDiscount[]]
}>()

const addType = ref<'flat' | 'percentage'>('flat')
const addValue = ref<number | null>(null)
const addReason = ref('')
const showValidation = ref(false)

const typeOptions = computed(() => [
  { label: t('salesOrders.manualDiscount.flat'), value: 'flat' },
  { label: t('salesOrders.manualDiscount.percentage'), value: 'percentage' },
])

const canAdd = computed(
  () => addReason.value.trim().length > 0 && addValue.value !== null && addValue.value > 0,
)

const numberFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
)

function formatValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(n) ? '' : numberFormatter.value.format(n)
}

function previewAmount(disc: ManualDiscount): number {
  const v = parseFloat(disc.value)
  if (isNaN(v)) return 0
  if (disc.discountType === 'flat') return v
  return Math.round((((props.gross ?? 0) * v) / 100) * 100) / 100
}

function addDiscount() {
  showValidation.value = true
  if (!canAdd.value) return

  const v = addValue.value!
  const grossAmount =
    addType.value === 'flat' ? v : Math.round((((props.gross ?? 0) * v) / 100) * 100) / 100

  const newDiscount: ManualDiscount = {
    discountType: addType.value,
    value: String(v),
    amount: String(grossAmount),
    reason: addReason.value.trim(),
    // Not known until the backend computes it on resolve/save — left blank until then.
    taxBaseAmount: '',
    taxAmount: '',
  }

  emit('update:modelValue', [...props.modelValue, newDiscount])
  addValue.value = null
  addReason.value = ''
  showValidation.value = false
}

function removeDiscount(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}
</script>
