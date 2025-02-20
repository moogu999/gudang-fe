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

      <div class="mb-4 flex items-center gap-4">
        <label for="permissions" class="w-30 font-semibold">Add Permission</label>
        <div class="flex flex-auto flex-col gap-1">
          <Select
            option-label="name"
            option-value="id"
            :options="permissionOptions"
            @update:model-value="addPermission"
            filter
            v-model="selectedPermission"
          />
        </div>
      </div>

      <TableComponent ref="table" :numbered="true" :url="url" :columns="columns">
        <template #content="{ col, data }">
          <span v-if="col.header === 'Created At'">{{
            dayjs(data[col.field]).format(DateFormat.DATE_TIME)
          }}</span>

          <div class="flex items-center" v-if="col.header === 'Actions'">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              outlined
              @click="deletePermission(data['id'])"
            />
          </div>
        </template>
      </TableComponent>
    </TabPanel>
  </div>
</template>

<script setup lang="ts">
import type { Column } from '@/components/table/table.type'
import TableComponent from '@/components/table/TableComponent.vue'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Select from 'primevue/select'
import { onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import ApiService, { type Base } from '@/services/api'
import { type Permission } from '../permissions/permission.type'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import DateFormat from '@/common/enum/dateFormat'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'

const props = defineProps({
  roleId: {
    type: Number,
    required: true,
  },
})

onMounted(async () => await fetchPermissions())

const loading = ref(false)

// Toast
const toastGroup = 'permissionsTab'
const toast = useToast()

// Select
const permissionOptions = ref<Array<Permission>>([])

async function fetchPermissions() {
  loading.value = true

  // @TODO change withPagination
  const query = new GenericQueryBuilder().withPagination(1, 1000).build()
  const url = `/gen/v1/permissions?${query}`

  try {
    const res = await ApiService.get<Base<Permission>>(url)
    permissionOptions.value = res.data
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

const selectedPermission = ref<Permission | undefined>()
async function addPermission(id: number) {
  loading.value = true

  try {
    await ApiService.post('/gen/v1/role-permissions', {
      roleId: props.roleId,
      permissionId: id,
      // @TODO change to user id
      createdBy: 1,
    })

    selectedPermission.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Table
const url = `/gen/v1/role-permissions?filterBy=role_id&filterOperator=0&filterValue=${props.roleId}`

const columns: Column[] = [
  {
    field: 'permissionName',
    header: 'Name',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'permissionDescription',
    header: 'Description',
    exportable: true,
    sortable: false,
    filterable: false,
    class: 'min-w-50',
  },
  {
    field: 'createdAt',
    header: 'Created At',
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
  {
    field: 'userEmail',
    underlyingField: 'createdBy',
    header: 'Created By',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: '',
    header: 'Actions',
    exportable: false,
    sortable: false,
    filterable: false,
  },
]

const table = ref()

async function deletePermission(id: number) {
  loading.value = true

  try {
    await ApiService.delete(`/gen/v1/role-permissions/${id}`)

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
