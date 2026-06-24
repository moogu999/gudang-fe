<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="cancelAcceptHandler" />

    <div class="mb-3 flex items-center justify-between sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('deliveryNotes.title') }}
      </h1>
      <Button
        v-if="canWrite"
        :label="t('deliveryNotes.actions.create')"
        icon="pi pi-plus"
        @click="router.push({ name: 'DeliveryNoteCreate' })"
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
          <Column :header="t('deliveryNotes.fields.no')">
            <template #body="{ data }">{{ data.no }}</template>
          </Column>
          <Column :header="t('deliveryNotes.fields.deliveryDate')">
            <template #body="{ data }">
              {{ dayjs(data.deliveryDate).format(DateFormat.DATE) }}
            </template>
          </Column>
          <Column :header="t('deliveryNotes.fields.vehicle')">
            <template #body="{ data }">{{ data.vehiclePlate ?? '-' }}</template>
          </Column>
          <Column :header="t('deliveryNotes.fields.driver')">
            <template #body="{ data }">{{ data.driverName ?? '-' }}</template>
          </Column>
          <Column :header="t('deliveryNotes.fields.doCount')">
            <template #body="{ data }">{{ data.doCount }}</template>
          </Column>
          <Column :header="t('deliveryNotes.fields.status')">
            <template #body="{ data }">
              <Tag
                :severity="
                  data.status === 'open' || data.status === 'applied'
                    ? 'success'
                    : data.status === 'draft'
                      ? 'secondary'
                      : 'danger'
                "
                :value="t(`deliveryNotes.status.${data.status}`)"
              />
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
                  @click="router.push({ name: 'DeliveryNoteDetail', params: { id: data.id } })"
                />
                <Button
                  v-if="canWrite && data.status === 'draft'"
                  icon="pi pi-pencil"
                  :aria-label="t('deliveryNotes.actions.edit')"
                  severity="secondary"
                  size="small"
                  outlined
                  @click="router.push({ name: 'DeliveryNoteEdit', params: { id: data.id } })"
                />
                <Button
                  v-if="canWrite && (data.status === 'draft' || data.status === 'open')"
                  icon="pi pi-ban"
                  :aria-label="t('deliveryNotes.actions.cancel')"
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
import { useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { DataTablePageEvent } from 'primevue/datatable'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { DeliveryNotesService, commonSuccessToast, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { DeliveryNoteListItem } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()
const router = useRouter()
const { hasPermission } = usePermissions()

const overlayGroup = 'deliveryNotes'

const items = ref<DeliveryNoteListItem[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)

const canWrite = computed(() => hasPermission(PERMISSIONS.DELIVERY_NOTE_WRITE))

const cancelAcceptHandler = ref(async () => {})

async function fetchData(page: number) {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pageSize.value),
    })
    const res = await DeliveryNotesService.list(params.toString())
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

function onCancelClick(item: DeliveryNoteListItem) {
  cancelAcceptHandler.value = async () => {
    try {
      await DeliveryNotesService.cancel(item.id)
      toast.add(commonSuccessToast(t('deliveryNotes.messages.cancelSuccess'), overlayGroup))
      await fetchData(currentPage.value)
    } catch (e) {
      toast.add(commonErrorToast(e, overlayGroup))
    }
  }

  confirm.require({
    group: overlayGroup,
    header: t('deliveryNotes.actions.cancel'),
    message: t('deliveryNotes.messages.confirmCancel'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('deliveryNotes.actions.cancel'), severity: 'danger' },
  })
}

fetchData(0)
</script>
