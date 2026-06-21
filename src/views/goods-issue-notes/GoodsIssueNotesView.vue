<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />

    <div class="mb-3 flex items-center justify-between sm:mb-5">
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('goodsIssueNotes.title') }}
      </h1>
      <Button
        v-if="canWrite"
        :label="t('goodsIssueNotes.actions.create')"
        icon="pi pi-plus"
        @click="router.push({ name: 'GoodsIssueNoteCreate' })"
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
          <Column :header="t('goodsIssueNotes.fields.no')">
            <template #body="{ data }">{{ data.no }}</template>
          </Column>
          <Column :header="t('goodsIssueNotes.fields.pickingListNo')">
            <template #body="{ data }">
              <RouterLink
                :to="{ name: 'PickingListDetail', params: { id: data.pickingListId } }"
                class="text-primary font-medium hover:underline"
                >{{ data.pickingListNo }}</RouterLink
              >
            </template>
          </Column>
          <Column :header="t('goodsIssueNotes.fields.deliveryNoteNo')">
            <template #body="{ data }">
              <RouterLink
                :to="{ name: 'DeliveryNoteDetail', params: { id: data.deliveryNoteId } }"
                class="text-primary font-medium hover:underline"
                >{{ data.deliveryNoteNo }}</RouterLink
              >
            </template>
          </Column>
          <Column :header="t('goodsIssueNotes.fields.createdAt')">
            <template #body="{ data }">
              {{ dayjs(data.createdAt).format(DateFormat.DATE_TIME) }}
            </template>
          </Column>
          <Column :header="t('goodsIssueNotes.fields.status')">
            <template #body="{ data }">
              <Tag
                :severity="data.status === 'issued' ? 'success' : 'danger'"
                :value="t(`goodsIssueNotes.status.${data.status}`)"
              />
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                :aria-label="t('common.actions.view')"
                severity="info"
                size="small"
                outlined
                @click="router.push({ name: 'GoodsIssueNoteDetail', params: { id: data.id } })"
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
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useRouter, RouterLink } from 'vue-router'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { DataTablePageEvent } from 'primevue/datatable'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { GoodsIssueNotesService, commonErrorToast } from '@/services'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'
import type { GoodsIssueNoteListItem } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const { hasPermission } = usePermissions()

const overlayGroup = 'goodsIssueNotes'

const items = ref<GoodsIssueNoteListItem[]>([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(0)
const isLoading = ref(false)

const canWrite = computed(() => hasPermission(PERMISSIONS.GOODS_ISSUE_NOTE_WRITE))

async function fetchData(page: number) {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pageSize.value),
    })
    const res = await GoodsIssueNotesService.list(params.toString())
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

fetchData(0)
</script>
