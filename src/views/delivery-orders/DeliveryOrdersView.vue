<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="cancelAcceptHandler" />

    <div class="mb-3 flex items-center justify-between gap-3 sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('deliveryOrders.title') }}
      </h1>
      <ResponsiveButton
        v-if="canCreateReturn"
        icon="pi pi-plus"
        :label="t('deliveryOrders.actions.createReturn')"
        @click="router.push('/return-delivery-orders/create')"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <DataTable
          :value="items"
          data-key="id"
          :lazy="true"
          :paginator="true"
          :rows="pageSize"
          :total-records="total"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          :loading="isLoading"
          class="text-sm"
          @page="onPage"
        >
          <Column :header="t('deliveryOrders.fields.no')">
            <template #body="{ data }">
              {{ data.no }}
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.soNo')">
            <template #body="{ data }">
              <RouterLink
                :to="{ name: 'SalesOrderDetail', params: { id: data.salesOrderHeaderId } }"
                class="text-primary font-medium hover:underline"
                >{{ data.soNo }}</RouterLink
              >
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.customer')">
            <template #body="{ data }">
              {{ data.customerName }}
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.warehouse')">
            <template #body="{ data }">
              {{ data.warehouseName }}
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.deliveryDate')">
            <template #body="{ data }">
              {{ data.deliveryDate ? dayjs(data.deliveryDate).format(DateFormat.DATE) : '-' }}
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.createdAt')">
            <template #body="{ data }">
              {{ dayjs(data.createdAt).format(DateFormat.DATE_TIME) }}
            </template>
          </Column>
          <Column :header="t('deliveryOrders.fields.status')">
            <template #body="{ data }">
              <div class="flex items-center gap-1">
                <Tag
                  :severity="statusSeverity(data.status)"
                  :value="t(`deliveryOrders.status.${data.status}`)"
                />
                <Tag
                  v-if="data.isPartial"
                  severity="warn"
                  :value="t('deliveryOrders.status.partial')"
                />
              </div>
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <Button
                  icon="pi pi-eye"
                  :aria-label="t('common.actions.view')"
                  severity="info"
                  size="small"
                  outlined
                  @click="router.push({ name: 'DeliveryOrderDetail', params: { id: data.id } })"
                />
                <Button
                  v-if="canCancel && data.status === 'open'"
                  :label="t('deliveryOrders.actions.cancel')"
                  severity="danger"
                  size="small"
                  outlined
                  @click="onCancelClick(data)"
                />
              </div>
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
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRouter, RouterLink } from 'vue-router'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { DataTablePageEvent } from 'primevue/datatable'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import { DeliveryOrdersService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { DeliveryOrderListItem, DeliveryOrderStatus } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()
const router = useRouter()
const { hasPermission } = usePermissions()

const overlayGroup = 'deliveryOrders'

const items = ref<DeliveryOrderListItem[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)

const canCancel = computed(() => hasPermission(PERMISSIONS.DELIVERY_ORDER_CANCEL))
const canCreateReturn = computed(() => hasPermission(PERMISSIONS.DELIVERY_ORDER_WRITE))

const cancelAcceptHandler = ref(async () => {})

function statusSeverity(status: DeliveryOrderStatus) {
  if (status === 'open' || status === 'applied') return 'success'
  return 'danger'
}

async function fetchData(page: number) {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pageSize.value),
    })
    const res = await DeliveryOrdersService.list(params.toString())
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

function onCancelClick(item: DeliveryOrderListItem) {
  cancelAcceptHandler.value = async () => {
    try {
      await DeliveryOrdersService.cancel(item.id)
      toast.add(commonSuccessToast(t('deliveryOrders.messages.cancelSuccess'), overlayGroup))
      await fetchData(currentPage.value)
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }

  confirm.require({
    group: overlayGroup,
    header: t('deliveryOrders.actions.cancel'),
    message: t('deliveryOrders.messages.confirmCancel'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('deliveryOrders.actions.cancel'), severity: 'danger' },
  })
}

fetchData(0)
</script>
