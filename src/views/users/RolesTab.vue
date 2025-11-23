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
        <label for="roles" class="w-30 font-semibold">{{ t('users.labels.addRole') }}</label>
        <div class="flex flex-auto flex-col gap-1">
          <InfiniteSelect
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => RolesService.list(query)"
            @update:model-value="addRole"
            v-model="selectedRole"
            sort-by="id"
            sort-operator="desc"
            use-cursor
          />
        </div>
      </div>

      <TableComponent ref="table" :numbered="true" :url="url" :columns="columns">
        <template #content="{ col, data }">
          <span v-if="col.header === t('common.labels.createdAt')">{{
            dayjs(data[col.field]).format(DateFormat.DATE_TIME)
          }}</span>

          <div class="flex items-center" v-if="col.header === t('common.labels.actions') && canWrite">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              outlined
              @click="deleteRole(data['id'])"
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
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import { RolesService } from '@/services/roles.service'
import { UserRolesService } from '@/services/userRoles.service'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'
import Toast from 'primevue/toast'
import { useAuthStore } from '@/stores'
import type { Role } from '@/types'
import { API_ENDPOINTS } from '@/constants/api'
import { usePermissions } from '@/composables'
import { useI18n } from 'vue-i18n'

// i18n
const { t } = useI18n()

// Auth
const authStore = useAuthStore()

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
const toastGroup = 'rolesTab'
const toast = useToast()

// Select
const selectedRole = ref<Role | undefined>()
async function addRole(id: unknown) {
  if (typeof id !== 'number') return

  loading.value = true

  try {
    await UserRolesService.addRoleToUser({
      userId: props.userId,
      roleId: id,
      createdBy: authStore.userId!,
    })

    selectedRole.value = undefined

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

// Table
const url = `${API_ENDPOINTS.GEN_USER_ROLES}?filterBy=user_id&filterOperator=0&filterValue=${props.userId}`

const columns = computed<Column[]>(() => [
  {
    field: 'roleName',
    header: t('common.labels.name'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'roleDescription',
    header: t('common.labels.description'),
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

async function deleteRole(id: number) {
  loading.value = true

  try {
    await UserRolesService.removeRoleFromUser(id)

    await table.value.clearSearch()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
