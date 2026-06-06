<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="cancelAcceptHandler" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('deliveryNotes.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <!-- Header card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.no')
              }}</span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.status')
              }}</span>
              <Tag
                class="w-fit"
                :severity="detail.status === 'open' ? 'success' : 'danger'"
                :value="t(`deliveryNotes.status.${detail.status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.createdAt')
              }}</span>
              <span>{{ dayjs(detail.createdAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.deliveryDate')
              }}</span>
              <span>{{ dayjs(detail.deliveryDate).format(DateFormat.DATE) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.vehicle')
              }}</span>
              <span>{{ detail.vehiclePlate ?? '-' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.driver')
              }}</span>
              <span>{{ detail.driverName ?? '-' }}</span>
            </div>
            <div v-if="detail.notes" class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('deliveryNotes.fields.notes')
              }}</span>
              <span class="whitespace-pre-line">{{ detail.notes }}</span>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <Button
              v-if="canWrite && detail.status === 'open'"
              :label="t('deliveryNotes.actions.cancel')"
              severity="danger"
              icon="pi pi-times"
              @click="onCancelClick"
            />
          </div>
        </template>
      </ResponsiveCard>

      <!-- Picking List card -->
      <ResponsiveCard v-if="detail.pickingList" class="mb-4">
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Picking List
              </p>
              <p class="font-medium">{{ detail.pickingList.no }}</p>
            </div>
            <Button
              :label="t('deliveryNotes.pickingListLink')"
              icon="pi pi-list"
              severity="success"
              outlined
              @click="
                router.push({ name: 'PickingListDetail', params: { id: detail!.pickingList!.id } })
              "
            />
          </div>
        </template>
      </ResponsiveCard>

      <!-- Delivery Orders table -->
      <ResponsiveCard>
        <template #content>
          <p class="mb-3 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {{ t('deliveryNotes.addedDos.title') }}
          </p>
          <DataTable :value="detail.deliveryOrders" class="text-sm" size="small">
            <Column :header="t('deliveryNotes.doTable.no')">
              <template #body="{ data }">
                <RouterLink
                  :to="{ name: 'DeliveryOrderDetail', params: { id: data.id } }"
                  class="text-primary font-medium hover:underline"
                  >{{ data.no }}</RouterLink
                >
              </template>
            </Column>
            <Column :header="t('deliveryNotes.doTable.customer')">
              <template #body="{ data }">{{ data.customerName }}</template>
            </Column>
            <Column :header="t('deliveryNotes.doTable.warehouse')">
              <template #body="{ data }">{{ data.warehouseName }}</template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>
          </DataTable>
        </template>
      </ResponsiveCard>
    </template>

    <Message v-else-if="!isLoading" severity="error">
      {{ t('deliveryNotes.messages.notFound') }}
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { DeliveryNotesService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { DeliveryNoteDetail } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const confirm = useConfirm()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'deliveryNoteDetail'
const detail = ref<DeliveryNoteDetail | null>(null)
const isLoading = ref(false)

const canWrite = computed(() => hasPermission(PERMISSIONS.DELIVERY_NOTE_WRITE))
const cancelAcceptHandler = ref(async () => {})

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await DeliveryNotesService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

function onCancelClick() {
  if (!detail.value) return
  const id = detail.value.id

  cancelAcceptHandler.value = async () => {
    try {
      await DeliveryNotesService.cancel(id)
      toast.add(commonSuccessToast(t('deliveryNotes.messages.cancelSuccess'), toastGroup))
      await fetchDetail(id)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    }
  }

  confirm.require({
    group: toastGroup,
    header: t('deliveryNotes.actions.cancel'),
    message: t('deliveryNotes.messages.confirmCancel'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('deliveryNotes.actions.cancel'), severity: 'danger' },
  })
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/delivery-notes')
    return
  }
  fetchDetail(id)
})
</script>
