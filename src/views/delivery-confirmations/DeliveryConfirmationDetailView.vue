<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('deliveryConfirmations.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <!-- Header summary card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.no') }}
              </span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.status') }}
              </span>
              <Tag
                class="w-fit"
                :severity="detail.status === 'confirmed' ? 'success' : 'secondary'"
                :value="t(`deliveryConfirmations.status.${detail.status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.confirmationDate') }}
              </span>
              <span>{{ dayjs(detail.confirmationDate).format(DateFormat.DATE) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.deliveryNoteNo') }}
              </span>
              <RouterLink
                :to="{ name: 'DeliveryNoteDetail', params: { id: detail.deliveryNoteId } }"
                class="text-primary font-medium hover:underline"
              >
                {{ detail.deliveryNoteNo }}
              </RouterLink>
            </div>
            <div v-if="detail.driverName" class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.driver') }}
              </span>
              <span>{{ detail.driverName }}</span>
            </div>
            <div v-if="detail.vehiclePlate" class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.vehicle') }}
              </span>
              <span>{{ detail.vehiclePlate }}</span>
            </div>
            <div v-if="detail.notes" class="col-span-2 flex flex-col gap-1 lg:col-span-4">
              <span class="text-xs font-semibold text-stone-500 uppercase">
                {{ t('deliveryConfirmations.fields.notes') }}
              </span>
              <span class="whitespace-pre-line">{{ detail.notes }}</span>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Stats row -->
      <div class="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex flex-col items-center rounded-lg border p-3"
        >
          <span class="text-xs text-stone-500">{{ stat.label }}</span>
          <span class="text-xl font-bold" :class="stat.color">{{ stat.value }}</span>
        </div>
      </div>

      <!-- DO list -->
      <div class="space-y-3">
        <ResponsiveCard v-for="doItem in detail.deliveryOrders" :key="doItem.id">
          <template #content>
            <!-- DO header row -->
            <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ doItem.deliveryOrderNo }}</span>
                  <Tag
                    :severity="doStatusSeverity(doItem.status)"
                    :value="t(`deliveryConfirmations.doStatus.${doItem.status}`)"
                    class="text-xs"
                  />
                </div>
                <span class="text-sm text-stone-500">{{ doItem.customerName }}</span>
              </div>
              <Button
                v-if="doItem.status === 'pending' && canWrite"
                :label="t('deliveryConfirmations.actions.confirm')"
                icon="pi pi-check"
                size="small"
                @click="openConfirmDialog(doItem)"
              />
            </div>

            <!-- Invoice strip (when confirmed) -->
            <div
              v-if="doItem.status !== 'pending' && doItem.invoiceNo"
              class="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
              :class="invoiceStripClass(doItem.invoiceStatus)"
            >
              <i class="pi pi-file" />
              <span class="font-medium">{{ doItem.invoiceNo }}</span>
              <Tag
                :severity="invoiceStatusSeverity(doItem.invoiceStatus)"
                :value="doItem.invoiceStatus ? t(`invoices.status.${doItem.invoiceStatus}`) : '-'"
                class="text-xs"
              />
              <span v-if="doItem.invoiceTotal" class="ml-auto font-semibold">
                {{ formatDecimal(doItem.invoiceTotal) }}
              </span>
            </div>

            <!-- Items table -->
            <DataTable :value="doItem.items" class="text-sm" size="small">
              <Column :header="t('deliveryConfirmations.detail.product')">
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.productCode }}</span>
                    <span class="text-xs text-stone-500">{{ data.productName }}</span>
                  </div>
                </template>
              </Column>
              <Column :header="t('deliveryConfirmations.detail.orderedQty')">
                <template #body="{ data }">{{ formatDecimal(data.orderedQty) }}</template>
              </Column>
              <Column
                v-if="doItem.status !== 'pending'"
                :header="t('deliveryConfirmations.detail.receivedQty')"
              >
                <template #body="{ data }">
                  <span
                    :class="
                      parseFloat(data.receivedQty) < parseFloat(data.orderedQty)
                        ? 'font-semibold text-amber-600'
                        : 'text-green-600'
                    "
                  >
                    {{ formatDecimal(data.receivedQty) }}
                  </span>
                </template>
              </Column>
              <template #empty>
                <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
              </template>
            </DataTable>
          </template>
        </ResponsiveCard>
      </div>
    </template>

    <Message v-else-if="!isLoading" severity="error">
      {{ t('deliveryConfirmations.messages.notFound') }}
    </Message>

    <!-- Confirm DO dialog -->
    <Dialog
      v-model:visible="confirmDialogVisible"
      :header="t('deliveryConfirmations.confirmDialog.title')"
      modal
      :closable="!confirming"
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      style="width: 50vw"
    >
      <template v-if="confirmingDO">
        <!-- Outcome toggle -->
        <div class="mb-4">
          <label class="mb-2 block text-sm font-semibold">
            {{ t('deliveryConfirmations.confirmDialog.outcome') }}
          </label>
          <div class="flex gap-2">
            <Button
              type="button"
              :label="t('deliveryConfirmations.confirmDialog.outcomeDelivered')"
              :severity="dialogOutcome === 'delivered' ? 'success' : 'secondary'"
              size="small"
              @click="dialogOutcome = 'delivered'"
            />
            <Button
              type="button"
              :label="t('deliveryConfirmations.confirmDialog.outcomeFailed')"
              :severity="dialogOutcome === 'failed' ? 'danger' : 'secondary'"
              size="small"
              @click="dialogOutcome = 'failed'"
            />
          </div>
        </div>

        <!-- Delivered panel: per-line received qty -->
        <div v-if="dialogOutcome === 'delivered'" class="mb-4">
          <DataTable :value="dialogLines" class="text-sm" size="small">
            <Column :header="t('deliveryConfirmations.detail.product')">
              <template #body="{ data }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ data.productCode }}</span>
                  <span class="text-xs text-stone-500">{{ data.productName }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('deliveryConfirmations.detail.orderedQty')">
              <template #body="{ data }">{{ formatDecimal(data.orderedQty) }}</template>
            </Column>
            <Column :header="t('deliveryConfirmations.detail.receivedQty')">
              <template #body="{ data }">
                <InputNumber
                  v-model="data.receivedQtyNum"
                  :min="0"
                  :max="parseFloat(data.orderedQty)"
                  :min-fraction-digits="0"
                  :max-fraction-digits="4"
                  class="w-24"
                  input-class="w-full"
                />
              </template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>
          </DataTable>

          <!-- Reason (required when any line is short) -->
          <div v-if="hasShortLines" class="mt-3 flex flex-col gap-1">
            <label class="text-sm font-semibold">
              {{ t('deliveryConfirmations.confirmDialog.reason') }}
              <span class="ml-1 text-red-500">*</span>
            </label>
            <Select
              v-model="dialogReasonCode"
              :options="partialReasonOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('deliveryConfirmations.confirmDialog.reasonPlaceholder')"
              class="w-full"
            />
            <InputText
              v-model="dialogReasonNote"
              :placeholder="t('deliveryConfirmations.confirmDialog.reasonNotePlaceholder')"
              class="mt-1 w-full"
            />
          </div>
        </div>

        <!-- Failed panel -->
        <div v-else class="mb-4">
          <Message severity="warn" :closable="false" class="mb-3 text-sm">
            {{ t('deliveryConfirmations.confirmDialog.failedWarning') }}
          </Message>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">
              {{ t('deliveryConfirmations.confirmDialog.reason') }}
              <span class="ml-1 text-red-500">*</span>
            </label>
            <Select
              v-model="dialogReasonCode"
              :options="failedReasonOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('deliveryConfirmations.confirmDialog.reasonPlaceholder')"
              class="w-full"
            />
            <InputText
              v-model="dialogReasonNote"
              :placeholder="t('deliveryConfirmations.confirmDialog.reasonNotePlaceholder')"
              class="mt-1 w-full"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          outlined
          :disabled="confirming"
          @click="confirmDialogVisible = false"
        />
        <Button
          :label="t('deliveryConfirmations.actions.confirm')"
          icon="pi pi-check"
          :loading="confirming"
          @click="submitConfirm"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { DeliveryConfirmationsService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type {
  DeliveryConfirmationDetail,
  DeliveryConfirmationDODetail,
  DeliveryConfirmationOutcome,
} from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'deliveryConfirmationDetail'
const detail = ref<DeliveryConfirmationDetail | null>(null)
const isLoading = ref(false)
const canWrite = computed(() => hasPermission(PERMISSIONS.DELIVERY_CONFIRMATION_WRITE))

// Dialog state
const confirmDialogVisible = ref(false)
const confirming = ref(false)
const confirmingDO = ref<DeliveryConfirmationDODetail | null>(null)
const dialogOutcome = ref<'delivered' | 'failed'>('delivered')
const dialogReasonCode = ref<string | null>(null)
const dialogReasonNote = ref('')

interface DialogLine {
  productId: number
  productCode: string
  productName: string
  orderedQty: string
  receivedQtyNum: number
}

const dialogLines = ref<DialogLine[]>([])

const hasShortLines = computed(() =>
  dialogLines.value.some((l) => l.receivedQtyNum < parseFloat(l.orderedQty)),
)

const partialReasonOptions = computed(() => [
  { value: 'out_of_stock', label: t('deliveryConfirmations.reasons.outOfStock') },
  { value: 'damaged', label: t('deliveryConfirmations.reasons.damaged') },
  { value: 'customer_rejected', label: t('deliveryConfirmations.reasons.customerRejected') },
  { value: 'other', label: t('deliveryConfirmations.reasons.other') },
])

const failedReasonOptions = computed(() => [
  { value: 'customer_not_found', label: t('deliveryConfirmations.reasons.customerNotFound') },
  { value: 'customer_rejected', label: t('deliveryConfirmations.reasons.customerRejected') },
  { value: 'address_wrong', label: t('deliveryConfirmations.reasons.addressWrong') },
  { value: 'other', label: t('deliveryConfirmations.reasons.other') },
])

const stats = computed(() => {
  if (!detail.value) return []
  const dos = detail.value.deliveryOrders
  const pending = dos.filter((d) => d.status === 'pending').length
  const delivered = dos.filter((d) => d.status === 'delivered').length
  const partial = dos.filter((d) => d.status === 'partial').length
  const failed = dos.filter((d) => d.status === 'failed').length

  return [
    { label: t('deliveryConfirmations.stats.total'), value: dos.length, color: '' },
    { label: t('deliveryConfirmations.stats.pending'), value: pending, color: 'text-stone-500' },
    {
      label: t('deliveryConfirmations.stats.delivered'),
      value: delivered,
      color: 'text-green-600',
    },
    { label: t('deliveryConfirmations.stats.partial'), value: partial, color: 'text-amber-600' },
    { label: t('deliveryConfirmations.stats.failed'), value: failed, color: 'text-red-600' },
  ]
})

function doStatusSeverity(status: string) {
  switch (status) {
    case 'delivered':
      return 'success'
    case 'partial':
      return 'warn'
    case 'failed':
      return 'danger'
    default:
      return 'secondary'
  }
}

function invoiceStatusSeverity(status: string | null) {
  switch (status) {
    case 'applied':
      return 'success'
    case 'cancelled':
      return 'danger'
    default:
      return 'warn'
  }
}

function invoiceStripClass(status: string | null) {
  switch (status) {
    case 'applied':
      return 'border-green-200 bg-green-50'
    case 'cancelled':
      return 'border-red-200 bg-red-50'
    default:
      return 'border-amber-200 bg-amber-50'
  }
}

function formatDecimal(val: string): string {
  const num = parseFloat(val)
  if (isNaN(num)) return val
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function openConfirmDialog(doItem: DeliveryConfirmationDODetail) {
  confirmingDO.value = doItem
  dialogOutcome.value = 'delivered'
  dialogReasonCode.value = null
  dialogReasonNote.value = ''
  dialogLines.value = doItem.items.map((item) => ({
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    orderedQty: item.orderedQty,
    receivedQtyNum: parseFloat(item.orderedQty),
  }))
  confirmDialogVisible.value = true
}

async function submitConfirm() {
  if (!confirmingDO.value || !detail.value) return

  const needsReason =
    dialogOutcome.value === 'failed' || (dialogOutcome.value === 'delivered' && hasShortLines.value)

  if (needsReason && !dialogReasonCode.value) {
    toast.add({
      severity: 'warn',
      summary: t('deliveryConfirmations.messages.reasonRequired'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  const outcome: DeliveryConfirmationOutcome =
    dialogOutcome.value === 'failed' ? 'failed' : hasShortLines.value ? 'partial' : 'delivered'

  confirming.value = true
  try {
    await DeliveryConfirmationsService.confirmDeliveryOrder(
      detail.value.id,
      confirmingDO.value.deliveryOrderId,
      {
        outcome,
        items: dialogLines.value.map((l) => ({
          productId: l.productId,
          receivedQty: l.receivedQtyNum.toString(),
        })),
        reasonCode: dialogReasonCode.value ?? undefined,
        reasonNote: dialogReasonNote.value.trim() || undefined,
      },
    )
    toast.add(commonSuccessToast(t('deliveryConfirmations.messages.confirmSuccess'), toastGroup))
    confirmDialogVisible.value = false
    await fetchDetail(detail.value.id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    confirming.value = false
  }
}

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await DeliveryConfirmationsService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/delivery-confirmations')
    return
  }
  fetchDetail(id)
})
</script>
