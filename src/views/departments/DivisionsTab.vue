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
        <label for="divisions" class="w-30 font-semibold">{{ t('divisions.labels.addDivision') }}</label>
        <div class="flex flex-auto flex-col gap-1">
          <InfiniteSelect
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => DivisionsService.list(query)"
            @update:model-value="addDivision"
            v-model="selectedDivision"
            sort-by="id"
            sort-operator="desc"
            use-cursor
          />
        </div>
      </div>

      <TableComponent ref="table" :numbered="true" :url="url" :columns="columns">
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
              @click="deleteDivision(data['id'])"
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
import { DivisionsService, DepartmentDivisionsService } from '@/services'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import { useAuthStore } from '@/stores'
import type { Division } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'
import { usePermissions } from '@/composables'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

// Permissions
const { canWrite } = usePermissions('/departments')

const props = defineProps({
  departmentId: {
    type: Number,
    required: true,
  },
})

const loading = ref(false)

// Toast
const toastGroup = 'divisionsTab'
const toast = useToast()

// Select
const selectedDivision = ref<Division | undefined>()
async function addDivision(id: unknown) {
  if (typeof id !== 'number') return

  loading.value = true

  try {
    await DepartmentDivisionsService.addDivisionToDepartment({
      departmentId: props.departmentId,
      divisionId: id,
      createdBy: authStore.userId!,
    })

    selectedDivision.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Table
const url = `${API_ENDPOINTS.GEN_DEPARTMENT_DIVISIONS}?filterBy=department_id&filterOperator=0&filterValue=${props.departmentId}`

const columns = computed<Column[]>(() => [
  {
    field: 'divisionName',
    header: t('common.labels.name'),
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

async function deleteDivision(id: number) {
  loading.value = true

  try {
    await DepartmentDivisionsService.removeDivisionFromDepartment(id)

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
