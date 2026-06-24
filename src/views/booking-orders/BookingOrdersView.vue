<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="submitAcceptHandler" />

    <!-- Partial fulfillment confirmation dialog -->
    <Dialog
      v-model:visible="showPartialDialog"
      modal
      :header="t('bookingOrders.messages.partialWarningTitle')"
      :style="{ width: '90vw', maxWidth: '680px' }"
    >
      <p class="mb-4 text-sm text-amber-700">
        {{ t('bookingOrders.messages.partialWarningNote') }}
      </p>

      <div v-for="item in partialWarningData" :key="item.soId" class="mb-4">
        <div class="mb-1 text-sm font-semibold">{{ item.soNo }} — {{ item.customerName }}</div>
        <DataTable :value="item.shortfallItems" class="text-xs" size="small">
          <Column :header="t('bookingOrders.partial.product')">
            <template #body="{ data }">
              <span class="font-medium">{{ data.productCode }}</span>
              <span class="ml-1 text-stone-500">{{ data.productName }}</span>
            </template>
          </Column>
          <Column :header="t('bookingOrders.partial.ordered')">
            <template #body="{ data }">{{ formatQty(data.required) }}</template>
          </Column>
          <Column :header="t('bookingOrders.partial.fulfilled')">
            <template #body="{ data }">{{ formatQty(data.available) }}</template>
          </Column>
          <Column :header="t('bookingOrders.partial.shortfall')">
            <template #body="{ data }">
              <span class="font-medium text-red-600">{{ formatQty(shortfall(data)) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <template #footer>
        <Button
          :label="t('common.actions.cancel')"
          severity="secondary"
          outlined
          @click="showPartialDialog = false"
        />
        <Button
          :label="t('bookingOrders.actions.submit')"
          :loading="partialSubmitting"
          @click="onPartialConfirm"
        />
      </template>
    </Dialog>

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('bookingOrders.title') }}
    </h1>

    <Toolbar class="mb-5">
      <template #start>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="includeBooked" input-id="showBooked" @change="onToggleBooked" />
          <label for="showBooked" class="cursor-pointer text-sm">
            {{ t('bookingOrders.showBooked') }}
          </label>
        </div>
      </template>
      <template #end>
        <Button
          :label="t('bookingOrders.actions.submit')"
          icon="pi pi-check"
          :disabled="!canSubmit"
          @click="onSubmitClick"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <DataTable
          :value="items"
          :selection="selected"
          selection-mode="multiple"
          data-key="id"
          :lazy="true"
          :paginator="true"
          :rows="pageSize"
          :total-records="total"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          :loading="isLoading"
          :row-class="
            (data: BookableSalesOrder) =>
              data.booked ? 'opacity-60 !cursor-default !pointer-events-none' : ''
          "
          :is-row-selectable="isRowSelectable"
          @update:selection="onUpdateSelection"
          @page="onPage"
          class="text-sm"
        >
          <Column selection-mode="multiple" style="width: 3rem" />
          <Column :header="t('bookingOrders.fields.no')">
            <template #body="{ data }">
              <div class="flex flex-col gap-0.5">
                <RouterLink
                  :to="{ name: 'SalesOrderDetail', params: { id: data.id } }"
                  class="text-primary !pointer-events-auto font-medium hover:underline"
                  >{{ data.no }}</RouterLink
                >
                <span class="text-xs text-stone-500">{{ data.customerName }}</span>
                <span v-if="data.salesmanCode || data.salesmanName" class="text-xs text-stone-400">
                  {{ [data.salesmanCode, data.salesmanName].filter(Boolean).join(' - ') }}
                </span>
              </div>
            </template>
          </Column>
          <Column :header="t('bookingOrders.fields.value')">
            <template #body="{ data }">
              {{ formatCurrency(parseFloat(data.totalAmount)) }}
            </template>
          </Column>
          <Column :header="t('bookingOrders.fields.deliveryDeadline')">
            <template #body="{ data }">
              {{ data.deliveryDate ? dayjs(data.deliveryDate).format(DateFormat.DATE) : '-' }}
            </template>
          </Column>
          <Column :header="t('bookingOrders.fields.fulfillment')">
            <template #body="{ data }">
              <Tag
                v-if="fulfillmentMap.has(data.id)"
                :severity="severityFor(fulfillmentMap.get(data.id)!.status)"
                :value="t(`bookingOrders.status.${fulfillmentMap.get(data.id)!.status}`)"
              />
              <Tag v-else severity="secondary" :value="t('bookingOrders.status.pending')" />
              <template
                v-if="
                  fulfillmentMap.has(data.id) && fulfillmentMap.get(data.id)!.bonusItems?.length
                "
              >
                <details class="mt-1">
                  <summary class="cursor-pointer text-xs font-medium text-green-700">
                    {{ t('bookingOrders.bonus.title') }}
                    ({{ fulfillmentMap.get(data.id)!.bonusItems.length }})
                  </summary>
                  <div class="mt-1 space-y-0.5">
                    <div
                      v-for="bonus in fulfillmentMap.get(data.id)!.bonusItems"
                      :key="bonus.promotionId"
                      class="text-xs text-green-700"
                    >
                      <span class="font-medium">{{ bonus.promotionCode }}</span
                      >: {{ bonus.productCode }} — {{ bonus.productName }}
                      <span class="text-stone-500">
                        ({{ t('bookingOrders.bonus.available') }}: {{ formatQty(bonus.available) }})
                      </span>
                    </div>
                  </div>
                </details>
              </template>
            </template>
          </Column>
          <Column :header="t('bookingOrders.fields.doNo')">
            <template #body="{ data }">
              <RouterLink
                v-if="data.deliveryOrderId"
                :to="{ name: 'DeliveryOrderDetail', params: { id: data.deliveryOrderId } }"
                class="text-primary !pointer-events-auto font-medium hover:underline"
                >{{ data.deliveryOrderNo }}</RouterLink
              >
              <span v-else>-</span>
            </template>
          </Column>
          <Column v-if="canCancelDO" :header="t('common.labels.actions')">
            <template #body="{ data }">
              <Button
                v-if="data.booked && data.deliveryOrderId"
                :label="t('bookingOrders.actions.cancelDO')"
                severity="danger"
                size="small"
                outlined
                class="!pointer-events-auto"
                @click="onCancelDOClick(data)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ToggleSwitch from 'primevue/toggleswitch'
import type { DataTablePageEvent } from 'primevue/datatable'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import {
  BookingOrdersService,
  DeliveryOrdersService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type {
  BookableSalesOrder,
  FulfillmentStatus,
  SalesOrderFulfillment,
  FulfillmentItem,
} from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()
const { hasPermission } = usePermissions()

const overlayGroup = 'bookingOrders'

const items = ref<BookableSalesOrder[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)
const includeBooked = ref(false)
const selected = ref<BookableSalesOrder[]>([])
const fulfillmentMap = ref<Map<number, SalesOrderFulfillment>>(new Map())

const showPartialDialog = ref(false)
const partialSubmitting = ref(false)

interface PartialWarningSO {
  soId: number
  soNo: string
  customerName: string
  shortfallItems: FulfillmentItem[]
}
const partialWarningData = ref<PartialWarningSO[]>([])

const canSubmit = computed(
  () =>
    selected.value.length > 0 &&
    selected.value.every((row) => {
      const s = fulfillmentMap.value.get(row.id)?.status
      return s === 'full' || s === 'partial'
    }),
)
const canCancelDO = computed(() => hasPermission(PERMISSIONS.DELIVERY_ORDER_CANCEL))

const submitAcceptHandler = ref(async () => {})

function isRowSelectable(event: { data: BookableSalesOrder }) {
  return !event.data.booked
}

function severityFor(status: FulfillmentStatus) {
  if (status === 'full') return 'success'
  if (status === 'partial') return 'warn'
  return 'danger'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatQty(value: string): string {
  const n = parseFloat(value)
  if (isNaN(n)) return '-'
  return n % 1 === 0 ? n.toFixed(0) : n.toString()
}

function shortfall(item: FulfillmentItem): string {
  const req = parseFloat(item.required)
  const avail = parseFloat(item.available)
  return String(req - avail)
}

async function fetchData(page: number) {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pageSize.value),
      includeBooked: String(includeBooked.value),
    })
    const res = await BookingOrdersService.list(params.toString())
    items.value = res.data
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    isLoading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page
  pageSize.value = event.rows
  fetchData(event.page)
}

function onToggleBooked() {
  currentPage.value = 0
  selected.value = []
  fulfillmentMap.value = new Map()
  fetchData(0)
}

let evaluateTimer: ReturnType<typeof setTimeout> | null = null

function onSelectionChange() {
  if (evaluateTimer) clearTimeout(evaluateTimer)
  if (selected.value.length === 0) {
    fulfillmentMap.value = new Map()
    return
  }
  evaluateTimer = setTimeout(async () => {
    const ids = selected.value.map((r) => r.id)
    try {
      const results = await BookingOrdersService.evaluate(ids)
      const next = new Map<number, SalesOrderFulfillment>()
      for (const r of results) {
        next.set(r.salesOrderId, r)
      }
      fulfillmentMap.value = next
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }, 300)
}

function onUpdateSelection(value: BookableSalesOrder[]) {
  selected.value = value.filter((r) => !r.booked)
}

watch(selected, onSelectionChange)

async function executeSubmit() {
  const ids = selected.value.map((r) => r.id)
  await BookingOrdersService.submit(ids)
  toast.add(commonSuccessToast(t('bookingOrders.messages.submitSuccess'), overlayGroup))
  selected.value = []
  fulfillmentMap.value = new Map()
  await fetchData(currentPage.value)
}

function onSubmitClick() {
  const hasPartial = selected.value.some(
    (r) => fulfillmentMap.value.get(r.id)?.status === 'partial',
  )

  if (hasPartial) {
    partialWarningData.value = selected.value
      .filter((r) => fulfillmentMap.value.get(r.id)?.status === 'partial')
      .map((so) => {
        const fulfillment = fulfillmentMap.value.get(so.id)!
        const shortfallItems = fulfillment.items.filter(
          (item) => parseFloat(item.available) < parseFloat(item.required),
        )
        return {
          soId: so.id,
          soNo: so.no,
          customerName: so.customerName,
          shortfallItems,
        }
      })
    showPartialDialog.value = true
    return
  }

  submitAcceptHandler.value = async () => {
    try {
      await executeSubmit()
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }

  confirm.require({
    group: overlayGroup,
    header: t('bookingOrders.actions.submit'),
    message: t('bookingOrders.messages.confirmSubmit'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('bookingOrders.actions.submit') },
  })
}

async function onPartialConfirm() {
  partialSubmitting.value = true
  try {
    await executeSubmit()
    showPartialDialog.value = false
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    partialSubmitting.value = false
  }
}

function onCancelDOClick(item: BookableSalesOrder) {
  submitAcceptHandler.value = async () => {
    try {
      await DeliveryOrdersService.cancel(item.deliveryOrderId!)
      toast.add(commonSuccessToast(t('bookingOrders.messages.cancelDOSuccess'), overlayGroup))
      selected.value = []
      fulfillmentMap.value = new Map()
      await fetchData(currentPage.value)
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }

  confirm.require({
    group: overlayGroup,
    header: t('bookingOrders.actions.cancelDO'),
    message: t('bookingOrders.messages.confirmCancelDO'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('bookingOrders.actions.cancelDO'), severity: 'danger' },
  })
}

fetchData(0)
</script>
