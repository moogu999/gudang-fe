<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <TabPanel value="1">
      <ProgressBar
        class="mb-3"
        mode="indeterminate"
        :pt="{ root: '!h-[2px]' }"
        v-if="loading"
      ></ProgressBar>

      <div v-if="canWrite" class="mb-4 flex flex-col gap-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <label for="assignmentType" class="w-full text-sm font-semibold sm:text-base md:w-32">
            {{ t('users.labels.assignBy') }}
          </label>
          <div class="flex flex-auto flex-col gap-1">
            <Select
              id="assignmentType"
              v-model="assignmentType"
              :options="assignmentTypes"
              option-label="label"
              option-value="value"
              :pt="{ root: 'w-full' }"
            />
          </div>
        </div>

        <div
          v-if="assignmentType === 'branch'"
          class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
        >
          <label for="branch" class="w-full text-sm font-semibold sm:text-base md:w-32">
            {{ t('users.labels.selectBranch') }}
          </label>
          <div class="flex flex-auto flex-col gap-1">
            <InfiniteSelect
              id="branch"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => BranchesService.list(query)"
              @update:model-value="assignBranch"
              v-model="selectedBranch"
              sort-by="id"
              sort-operator="desc"
              use-cursor
            />
          </div>
        </div>

        <div
          v-if="assignmentType === 'salesOrganization'"
          class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
        >
          <label for="salesOrganization" class="w-full text-sm font-semibold sm:text-base md:w-32">
            {{ t('users.labels.selectSalesOrganization') }}
          </label>
          <div class="flex flex-auto flex-col gap-1">
            <InfiniteSelect
              id="salesOrganization"
              option-label="name"
              option-value="id"
              :fetch-fn="(query) => SalesOrganizationsService.list(query)"
              @update:model-value="assignSalesOrganization"
              v-model="selectedSalesOrganization"
              sort-by="id"
              sort-operator="desc"
              use-cursor
            />
          </div>
        </div>
      </div>

      <TableComponent ref="table" :url="url" :columns="columns">
        <template #content="{ col, data }">
          <span v-if="col.header === t('common.labels.createdAt')">{{
            dayjs(data[col.field]).format(DateFormat.DATE_TIME)
          }}</span>

          <div
            class="flex items-center"
            v-if="col.header === t('common.labels.actions') && canWrite"
          >
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
import type { Column } from '@/types/table.type'
import TableComponent from '@/components/table/TableComponent.vue'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import Select from 'primevue/select'
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import { BranchesService } from '@/services/branches.service'
import { SalesOrganizationsService } from '@/services/salesOrganizations.service'
import { UserBranchesService } from '@/services/userBranches.service'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import type { Branch, SalesOrganization } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'
import { usePermissions } from '@/composables'
import { useI18n } from 'vue-i18n'

// i18n
const { t } = useI18n()

// Permissions
const { canWrite } = usePermissions('/users')

const props = defineProps({
  userId: {
    type: Number,
    required: true,
  },
})

const loading = ref(false)

// Toast
const toastGroup = 'branchesTab'
const toast = useToast()

// Assignment type selection
const assignmentType = ref<'branch' | 'salesOrganization'>('branch')
const assignmentTypes = computed(() => [
  {
    label: t('users.assignmentTypes.branch'),
    value: 'branch',
  },
  {
    label: t('users.assignmentTypes.salesOrganization'),
    value: 'salesOrganization',
  },
])

// Branch selection
const selectedBranch = ref<Branch | undefined>()
async function assignBranch(id: unknown) {
  if (typeof id !== 'number') return

  loading.value = true

  try {
    await UserBranchesService.assignBranches(props.userId, {
      branchId: id,
    })

    selectedBranch.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Sales Organization selection
const selectedSalesOrganization = ref<SalesOrganization | undefined>()
async function assignSalesOrganization(id: unknown) {
  if (typeof id !== 'number') return

  loading.value = true

  try {
    await UserBranchesService.assignBranches(props.userId, {
      salesOrganizationId: id,
    })

    selectedSalesOrganization.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Table
const url = `${API_ENDPOINTS.GEN_USER_BRANCHES}?filterBy=user_id&filterOperator=0&filterValue=${props.userId}`

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
    await UserBranchesService.removeBranchFromUser(id)

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
