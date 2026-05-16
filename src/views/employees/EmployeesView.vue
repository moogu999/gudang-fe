<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <!-- Header -->
    <div class="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ t('employees.title') }}
        </h1>
        <p v-if="summary" class="mt-1 text-sm text-stone-500">
          {{ summary.active }} {{ t('employees.status.active').toLowerCase() }} ·
          {{ summary.inactive }} {{ t('employees.status.inactive').toLowerCase() }} ·
          {{ summary.draft }} {{ t('employees.status.draft').toLowerCase() }}
        </p>
      </div>
      <Button
        :label="t('employees.addButton')"
        icon="pi pi-plus"
        size="small"
        @click="router.push('/employees/new')"
      />
    </div>

    <!-- Employee Type Chips -->
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="chip in typeChips"
        :key="chip.id ?? 'all'"
        class="rounded-full border px-3 py-1 text-sm transition-colors"
        :class="
          filterTypeId === chip.id
            ? 'border-stone-800 bg-stone-800 text-white'
            : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
        "
        @click="selectTypeChip(chip.id)"
      >
        {{ chip.label }}
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <InfiniteSelect
        v-model="filterBranchId"
        :fetch-fn="(q) => BranchesService.list(q)"
        option-label="name"
        option-value="id"
        :placeholder="t('employees.fields.branch')"
        sort-by="name"
        sort-operator="asc"
        class="min-w-40"
        show-clear
      />
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('employees.filter.statusAll')"
        show-clear
        class="min-w-36"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <!-- Employee info stacked: name + NIP + phone -->
            <div v-if="col.field === 'name'" class="flex items-center gap-3">
              <img
                v-if="data['photoUrl']"
                :src="photoSrc(data['photoUrl'])"
                class="h-9 w-9 rounded-full object-cover"
                alt=""
              />
              <div v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200">
                <i class="pi pi-user text-stone-500" />
              </div>
              <div>
                <div class="font-medium">{{ data['name'] }}</div>
                <div class="text-xs text-stone-500">
                  <span v-if="data['nip']">{{ data['nip'] }}</span>
                  <span v-if="data['nip'] && data['phoneNumber']"> · </span>
                  <span v-if="data['phoneNumber']">{{ data['phoneNumber'] }}</span>
                </div>
              </div>
            </div>

            <!-- Employee type chip -->
            <Tag
              v-if="col.field === 'employeeType.name'"
              :value="data['employeeType']?.name"
              severity="secondary"
            />

            <!-- Branch -->
            <span v-if="col.field === 'branch.name'">{{ data['branch']?.name ?? '—' }}</span>

            <!-- Status tag -->
            <div v-if="col.field === 'status'">
              <Tag
                v-tooltip.top="data['isDraft'] ? t('employees.status.draftTooltip') : undefined"
                :severity="getStatusSeverity(data as Employee)"
                :value="getStatusLabel(data as Employee)"
              />
            </div>

            <!-- Actions -->
            <div v-if="col.field === ''" class="flex items-center gap-2">
              <Button
                :label="t('table.details')"
                icon="pi pi-eye"
                size="small"
                severity="secondary"
                outlined
                @click="router.push(`/employees/${data['id']}`)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                outlined
                :aria-label="t('common.actions.delete')"
                @click="onDeleteClick(data['id'])"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { useConfirmDelete } from '@/composables'
import { EmployeesService, EmployeeTypesService, BranchesService } from '@/services'
import { API_ENDPOINTS } from '@/constants/api'
import type { Column } from '@/types/table.type'
import type { Employee, EmployeeType, EmployeeSummary } from '@/types/employee.type'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'employeesView'
const table = ref()

// Summary
const summary = ref<EmployeeSummary | null>(null)

onMounted(async () => {
  await Promise.all([loadSummary(), loadEmployeeTypes()])
})

async function loadSummary() {
  try {
    summary.value = await EmployeesService.summary()
  } catch {
    // non-critical
  }
}

// Employee type chips
const employeeTypes = ref<EmployeeType[]>([])

async function loadEmployeeTypes() {
  try {
    const res = await EmployeeTypesService.list('sortBy=name&sortOperator=asc&limit=50')
    employeeTypes.value = res.data
  } catch {
    // non-critical
  }
}

const typeChips = computed(() => [
  { id: null, label: t('employees.chips.all') },
  ...employeeTypes.value.map((et) => ({ id: et.id, label: et.name })),
])

// Filters
const filterTypeId = ref<number | null>(null)
const filterBranchId = ref<number | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const statusOptions = computed(() => [
  { label: t('employees.filter.statusAll'), value: '' },
  { label: t('employees.filter.statusDraft'), value: 'draft' },
  { label: t('employees.filter.statusActive'), value: 'active' },
  { label: t('employees.filter.statusInactive'), value: 'inactive' },
])

function selectTypeChip(id: number | null) {
  filterTypeId.value = id
}

// Build URL with filters
const url = computed(() => {
  const params = new URLSearchParams()
  if (filterTypeId.value) params.append('employeeTypeId', String(filterTypeId.value))
  if (filterBranchId.value) params.append('branchId', String(filterBranchId.value))
  if (filterStatus.value === 'draft') {
    params.append('isDraft', 'true')
  } else if (filterStatus.value === 'active') {
    params.append('isDraft', 'false')
    params.append('isActive', 'true')
  } else if (filterStatus.value === 'inactive') {
    params.append('isDraft', 'false')
    params.append('isActive', 'false')
  }
  const qs = params.toString()
  return qs ? `${API_ENDPOINTS.EMPLOYEES}?${qs}` : API_ENDPOINTS.EMPLOYEES
})

// Watch URL changes to trigger table refresh — nextTick ensures the new url
// prop has been received by TableComponent before it fetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// Columns
const columns = computed<Column[]>(() => [
  {
    field: 'name',
    header: t('employees.columns.employee'),
    exportable: false,
    sortable: true,
    filterable: false,
  },
  {
    field: 'employeeType.name',
    underlyingField: 'employeeTypeId',
    header: t('employees.columns.type'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'branch.name',
    underlyingField: 'branchId',
    header: t('employees.columns.branch'),
    exportable: false,
    sortable: false,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'status',
    header: t('employees.columns.status'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    exportable: false,
    sortable: false,
    filterable: false,
  },
])

// Status helpers
function getStatusSeverity(emp: Employee): 'warn' | 'success' | 'secondary' {
  if (emp.isDraft) return 'warn'
  if (emp.isActive) return 'success'
  return 'secondary'
}

function getStatusLabel(emp: Employee): string {
  if (emp.isDraft) return t('employees.status.draft')
  if (emp.isActive) return t('employees.status.active')
  return t('employees.status.inactive')
}

// Photo URL
function photoSrc(photoUrl: string): string {
  if (photoUrl.startsWith('http')) return photoUrl
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}${photoUrl}`
}

// Delete
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'employee',
  onSuccess: async () => {
    await loadSummary()
    await table.value?.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => EmployeesService.delete(id))
}
</script>
