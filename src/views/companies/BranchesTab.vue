<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <TabPanel value="0">
      <ProgressBar
        class="mb-3"
        mode="indeterminate"
        :pt="{ root: '!h-[2px]' }"
        v-if="loading"
      ></ProgressBar>

      <div v-if="canWrite" class="mb-4 flex items-center gap-4">
        <label for="branches" class="w-30 text-sm font-semibold sm:text-base">{{
          t('branches.labels.addBranch')
        }}</label>
        <div class="flex flex-auto flex-col gap-1">
          <InfiniteSelect
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            @update:model-value="addBranch"
            v-model="selectedBranch"
            sort-by="id"
            sort-operator="desc"
            use-cursor
          />
        </div>
      </div>

      <TableComponent ref="table" :url="url" :columns="columns">
        <template #content="{ col, data }">
          <span v-if="col.field === 'createdAt'">{{
            dayjs(data[col.field]).format(DateFormat.DATE_TIME)
          }}</span>

          <div class="flex items-center" v-if="col.field === '' && canWrite">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              outlined
              @click="deleteBranch(data['id'])"
            />
          </div>
        </template>
      </TableComponent>
    </TabPanel>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Column } from '@/types/table.type'
import TableComponent from '@/components/table/TableComponent.vue'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import { BranchesService, CompanyBranchesService } from '@/services'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import { useAuthStore } from '@/stores'
import type { Branch } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'
import { usePermissions } from '@/composables'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

// Permissions
const { canWrite } = usePermissions('/companies')

const props = defineProps({
  companyId: {
    type: Number,
    required: true,
  },
})

const loading = ref(false)

// Toast
const toastGroup = 'branchesTab'
const toast = useToast()

// Select
const selectedBranch = ref<Branch | undefined>()
async function addBranch(id: unknown) {
  if (typeof id !== 'number') return

  loading.value = true

  try {
    await CompanyBranchesService.addBranchToCompany({
      companyId: props.companyId,
      branchId: id,
      createdBy: authStore.userId!,
    })

    selectedBranch.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Table
const url = `${API_ENDPOINTS.GEN_COMPANY_BRANCHES}?filterBy=company_id&filterOperator=0&filterValue=${props.companyId}`

const columns = computed<Column[]>(() => [
  {
    field: 'branchCode',
    header: t('branches.fields.code'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'branchName',
    header: t('branches.fields.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'branchAddress',
    header: t('branches.fields.address'),
    exportable: true,
    sortable: false,
    filterable: false,
    class: 'min-w-50',
  },
  {
    field: 'createdAt',
    header: t('common.labels.createdAt'),
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
  {
    field: 'userEmail',
    underlyingField: 'createdBy',
    header: t('common.labels.createdBy'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
])

const table = ref()

async function deleteBranch(id: number) {
  loading.value = true

  try {
    await CompanyBranchesService.removeBranchFromCompany(id)

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
