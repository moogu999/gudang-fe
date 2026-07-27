<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="grConfirm" />

  <Form v-slot="$form" :initial-values="initialValues" :resolver="resolver" @submit="onFormSubmit">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('goodsReceipts.sections.receiptInfo') }}
        </h3>

        <!-- Receipt Number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('goodsReceipts.fields.no') }}</label>
          <div class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('goodsReceipts.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('goodsReceipts.codeMode.manual')"
              :severity="noMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'manual'"
            />
          </div>
          <div v-if="noMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="numberSeriesLoading ? '' : previewCode"
              :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full"
            />
            <small class="text-surface-500">{{ t('goodsReceipts.codeMode.assignedOnSave') }}</small>
          </div>
          <InputText v-else id="no" name="no" autocomplete="off" class="w-full" />
          <Message v-if="$form.no?.invalid" severity="error" size="small" variant="simple">{{
            $form.no.error.message
          }}</Message>
        </div>

        <!-- Receipt Date -->
        <div class="flex flex-col gap-1">
          <label for="receiptDate" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.receiptDate')
          }}</label>
          <DatePicker id="receiptDate" name="receiptDate" date-format="dd/mm/yy" class="w-full" />
          <Message
            v-if="$form.receiptDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.receiptDate.error.message }}</Message
          >
        </div>

        <!-- Warehouse -->
        <div class="flex flex-col gap-1">
          <label for="warehouseId" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.warehouse')
          }}</label>
          <InfiniteSelect
            id="warehouseId"
            name="warehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => WarehousesService.list(q)"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message
            v-if="$form.warehouseId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.warehouseId.error.message }}</Message
          >
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('goodsReceipts.sections.typeInfo') }}
        </h3>

        <!-- Arrival Type -->
        <div class="flex flex-col gap-1">
          <label for="arrivalType" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.arrivalType')
          }}</label>
          <Select
            id="arrivalType"
            name="arrivalType"
            :options="arrivalTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
          <Message
            v-if="$form.arrivalType?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.arrivalType.error.message }}</Message
          >
        </div>

        <!-- Stock Type -->
        <div class="flex flex-col gap-1">
          <label for="stockType" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.stockType')
          }}</label>
          <Select
            id="stockType"
            name="stockType"
            :options="stockTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
          <Message v-if="$form.stockType?.invalid" severity="error" size="small" variant="simple">{{
            $form.stockType.error.message
          }}</Message>
        </div>

        <!-- Remark / Notes -->
        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('goodsReceipts.fields.remark')
          }}</label>
          <Textarea id="remark" name="remark" rows="3" class="w-full" />
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Details Table -->
    <GoodsReceiptDetailsTable v-model="details" :toast-group="toastGroup" />

    <Divider class="my-6" />

    <!-- Summary + Actions -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div></div>
      <div class="rounded-lg border border-stone-200 p-4">
        <h4 class="mb-3 text-sm font-semibold sm:text-base">
          {{ t('goodsReceipts.summary.title') }}
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>{{ t('goodsReceipts.summary.totalQty') }}</span>
            <span>{{ formatQty(totals.totalQty) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('goodsReceipts.summary.subtotal') }}</span>
            <span>{{ formatNumber(totals.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-orange-600">
            <span>{{ t('goodsReceipts.summary.tax') }}</span>
            <span>{{ formatNumber(totals.tax) }}</span>
          </div>
          <Divider />
          <div class="flex justify-between text-lg">
            <span class="font-bold">{{ t('goodsReceipts.summary.total') }}</span>
            <span class="font-bold text-green-600">{{ formatNumber(totals.total) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button type="submit" :label="t('goodsReceipts.actions.confirm')" :loading="isSaving" />
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ConfirmDialog from 'primevue/confirmdialog'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import GoodsReceiptDetailsTable from './GoodsReceiptDetailsTable.vue'
import {
  WarehousesService,
  GoodsReceiptsService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type {
  GoodsReceiptDetailRow,
  CreateGoodsReceiptRequest,
  ArrivalType,
  StockType,
} from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('goods_receipts')

const toastGroup = 'goodsReceiptForm'

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

const isSaving = ref(false)
const details = ref<GoodsReceiptDetailRow[]>([])

const arrivalTypeOptions = computed(() => [
  { value: 'regular', label: t('goodsReceipts.arrivalTypes.regular') },
  { value: 'consignment', label: t('goodsReceipts.arrivalTypes.consignment') },
  { value: 'bonus', label: t('goodsReceipts.arrivalTypes.bonus') },
  { value: 'transfer', label: t('goodsReceipts.arrivalTypes.transfer') },
  { value: 'return_in', label: t('goodsReceipts.arrivalTypes.returnIn') },
  { value: 'other', label: t('goodsReceipts.arrivalTypes.other') },
])

const stockTypeOptions = computed(() => [
  { value: 'good', label: t('goodsReceipts.stockTypes.good') },
  { value: 'bad', label: t('goodsReceipts.stockTypes.bad') },
])

const initialValues = reactive({
  no: '',
  receiptDate: undefined as Date | undefined,
  warehouseId: undefined as number | undefined,
  arrivalType: 'regular' as ArrivalType,
  stockType: 'good' as StockType,
  remark: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('goodsReceipts.validation.noRequired')),
      receiptDate: z.date({ message: t('goodsReceipts.validation.receiptDateRequired') }),
      warehouseId: z.number({ message: t('goodsReceipts.validation.warehouseRequired') }),
      arrivalType: z.string().min(1, t('goodsReceipts.validation.arrivalTypeRequired')),
      stockType: z.string().min(1, t('goodsReceipts.validation.stockTypeRequired')),
      remark: z.string().optional(),
    }),
  ),
)

const totals = computed(() => {
  const validRows = details.value.filter((r) => !r._isPlaceholder && r.quantity && r.price)
  const totalQty = validRows.reduce((sum, r) => sum + (r.quantity ?? 0), 0)
  const subtotal = validRows.reduce((sum, r) => sum + (r.quantity ?? 0) * (r.price ?? 0), 0)
  const tax = Math.round(subtotal * 0.11 * 100) / 100
  const total = subtotal + tax
  return { totalQty, subtotal, tax, total }
})

function formatQty(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function validateDetails(): boolean {
  const validRows = details.value.filter((r) => !r._isPlaceholder)
  if (validRows.length === 0) {
    toast.add(
      commonErrorToast(new Error(t('goodsReceipts.validation.detailsRequired')), toastGroup),
    )
    return false
  }
  for (const [index, row] of validRows.entries()) {
    if (!row.productId) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailProductRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
    if (!row.quantity || row.quantity <= 0) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailQtyRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
    if (row.price === undefined || row.price === null || row.price < 0) {
      toast.add(
        commonErrorToast(
          new Error(t('goodsReceipts.validation.detailPriceRequired', { row: index + 1 })),
          toastGroup,
        ),
      )
      return false
    }
  }
  return true
}

// Saved pending form data for use in confirm callback
const pendingRequest = ref<CreateGoodsReceiptRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    await GoodsReceiptsService.create(pendingRequest.value)
    toast.add(commonSuccessToast(t('goodsReceipts.messages.created'), toastGroup))
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  if (!validateDetails()) return

  const validRows = details.value.filter((r) => !r._isPlaceholder)

  let no: string | null = null
  if (noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  pendingRequest.value = {
    no,
    receiptDate: (event.states.receiptDate.value as Date).toISOString().split('T')[0],
    warehouseId: event.states.warehouseId.value as number,
    arrivalType: event.states.arrivalType.value as ArrivalType,
    stockType: event.states.stockType.value as StockType,
    remark: (event.states.remark.value as string) || null,
    details: validRows.map((row) => ({
      productId: row.productId!,
      quantity: String(row.quantity!),
      price: String(row.price ?? 0),
    })),
    createdBy: authStore.userId!,
  }

  confirm.require({
    group: 'grConfirm',
    header: t('goodsReceipts.confirm.header'),
    message: t('goodsReceipts.confirm.message'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('goodsReceipts.actions.confirm') },
    accept: doSubmit,
  })
}
</script>
