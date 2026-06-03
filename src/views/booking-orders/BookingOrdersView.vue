<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="submitAcceptHandler" />

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
                <span class="font-medium">{{ data.no }}</span>
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
                v-if="statusMap.has(data.id)"
                :severity="severityFor(statusMap.get(data.id)!)"
                :value="t(`bookingOrders.status.${statusMap.get(data.id)}`)"
              />
              <Tag v-else severity="secondary" :value="t('bookingOrders.status.pending')" />
            </template>
          </Column>
          <Column :header="t('bookingOrders.fields.doNo')">
            <template #body="{ data }">
              {{ data.deliveryOrderNo ?? '-' }}
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
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import type { DataTablePageEvent } from 'primevue/datatable'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import Toolbar from 'primevue/toolbar'
import { BookingOrdersService, commonSuccessToast, commonErrorToast } from '@/services'
import type { BookableSalesOrder, FulfillmentStatus } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

const overlayGroup = 'bookingOrders'

const items = ref<BookableSalesOrder[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)
const includeBooked = ref(false)
const selected = ref<BookableSalesOrder[]>([])
const statusMap = ref<Map<number, FulfillmentStatus>>(new Map())

const canSubmit = computed(
  () =>
    selected.value.length > 0 &&
    selected.value.every((row) => statusMap.value.get(row.id) === 'full'),
)

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
  statusMap.value = new Map()
  fetchData(0)
}

let evaluateTimer: ReturnType<typeof setTimeout> | null = null

function onSelectionChange() {
  if (evaluateTimer) clearTimeout(evaluateTimer)
  if (selected.value.length === 0) {
    statusMap.value = new Map()
    return
  }
  evaluateTimer = setTimeout(async () => {
    const ids = selected.value.map((r) => r.id)
    try {
      const results = await BookingOrdersService.evaluate(ids)
      const next = new Map<number, FulfillmentStatus>()
      for (const r of results) {
        next.set(r.salesOrderId, r.status)
      }
      statusMap.value = next
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }, 300)
}

function onUpdateSelection(value: BookableSalesOrder[]) {
  selected.value = value.filter((r) => !r.booked)
}

watch(selected, onSelectionChange)

function onSubmitClick() {
  submitAcceptHandler.value = async () => {
    const ids = selected.value.map((r) => r.id)
    try {
      await BookingOrdersService.submit(ids)
      toast.add(commonSuccessToast(t('bookingOrders.messages.submitSuccess'), overlayGroup))
      selected.value = []
      statusMap.value = new Map()
      await fetchData(currentPage.value)
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

fetchData(0)
</script>
