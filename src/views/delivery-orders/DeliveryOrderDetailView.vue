<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="cancelAcceptHandler" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('deliveryOrders.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-3xl text-primary" />
    </div>

    <template v-else-if="detail">
      <!-- DO header card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.no') }}</span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.status') }}</span>
              <Tag
                class="w-fit"
                :severity="detail.status === 'open' ? 'success' : 'danger'"
                :value="t(`deliveryOrders.status.${detail.status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.createdAt') }}</span>
              <span>{{ dayjs(detail.createdAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.warehouse') }}</span>
              <span>{{ detail.warehouseName }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.soNo') }}</span>
              <RouterLink
                :to="{ name: 'SalesOrderDetail', params: { id: detail.salesOrderHeaderId } }"
                class="font-medium text-primary hover:underline"
              >{{ detail.soNo }}</RouterLink>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.customer') }}</span>
              <span>{{ detail.customerName }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.deliveryDate') }}</span>
              <span>{{ detail.deliveryDate ? dayjs(detail.deliveryDate).format(DateFormat.DATE) : '-' }}</span>
            </div>
            <div v-if="detail.remark" class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span class="text-xs font-semibold uppercase text-stone-500">{{ t('deliveryOrders.fields.remark') }}</span>
              <span class="whitespace-pre-line">{{ detail.remark }}</span>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <Button
              :label="t('deliveryOrders.actions.print')"
              severity="secondary"
              icon="pi pi-print"
              @click="onPrintClick"
            />
            <Button
              v-if="canCancel && detail.status === 'open'"
              :label="t('deliveryOrders.actions.cancel')"
              severity="danger"
              icon="pi pi-times"
              @click="onCancelClick"
            />
          </div>
        </template>
      </ResponsiveCard>

      <!-- Items and order summary -->
      <ResponsiveCard>
        <template #content>
          <SalesOrderForm
            :mode="DialogMode.VIEW"
            :sales-order-id="detail.salesOrderHeaderId"
            :hide-header="true"
            @cancel="router.back()"
          />
        </template>
      </ResponsiveCard>
    </template>

    <Message v-else-if="!isLoading" severity="error">
      {{ t('deliveryOrders.messages.notFound') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import SalesOrderForm from '@/views/sales-orders/SalesOrderForm.vue'
import { DeliveryOrdersService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { DeliveryOrderDetail } from '@/types'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const confirm = useConfirm()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'deliveryOrderDetail'
const detail = ref<DeliveryOrderDetail | null>(null)
const isLoading = ref(false)

const canCancel = computed(() => hasPermission(PERMISSIONS.DELIVERY_ORDER_CANCEL))

const cancelAcceptHandler = ref(async () => {})

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await DeliveryOrdersService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

function onPrintClick() {
  if (!detail.value) return
  const url = router.resolve({ name: 'DeliveryOrderPrint', params: { id: detail.value.id } }).href
  window.open(url, '_blank')
}

function onCancelClick() {
  if (!detail.value) return
  const id = detail.value.id

  cancelAcceptHandler.value = async () => {
    try {
      await DeliveryOrdersService.cancel(id)
      toast.add(commonSuccessToast(t('deliveryOrders.messages.cancelSuccess'), toastGroup))
      await fetchDetail(id)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    }
  }

  confirm.require({
    group: toastGroup,
    header: t('deliveryOrders.actions.cancel'),
    message: t('deliveryOrders.messages.confirmCancel'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('deliveryOrders.actions.cancel'), severity: 'danger' },
  })
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/delivery-orders')
    return
  }
  fetchDetail(id)
})
</script>
