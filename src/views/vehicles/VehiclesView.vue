<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('vehicles.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('vehicles.addVehicle')" @click="addVehicle" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <TableComponent ref="table" :url="url" :columns="columns">
          <template #content="{ col, data }">
            <Tag
              v-if="col.field === 'status'"
              :value="t(`vehicles.options.status.${data.status}`)"
              :severity="statusSeverity(data.status)"
            />

            <span v-else-if="col.field === 'capacityKg'">
              {{ data.capacityKg ? `${data.capacityKg} kg` : '—' }}
            </span>

            <span v-else-if="col.field === 'stnkExpiry'">
              {{ data.stnkExpiry ? formatExpiry(data.stnkExpiry) : '—' }}
            </span>

            <span v-else-if="col.field === 'ownership'">
              {{ t(`vehicles.options.ownership.${data.ownership}`) }}
            </span>

            <TableActionButtons
              v-if="col.field === ''"
              :can-write="canWrite"
              @edit="navigateToVehicle(data['id'])"
              @delete="onDeleteClick(data['id'])"
              @view="navigateToVehicle(data['id'])"
            />
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import Toolbar from 'primevue/toolbar'
import Toast from 'primevue/toast'
import Tag from 'primevue/tag'
import TableComponent from '@/components/table/TableComponent.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useConfirmDelete, usePermissions } from '@/composables'
import { VehiclesService } from '@/services'
import { API_ENDPOINTS } from '@/constants/api'
import type { Column } from '@/types/table.type'
import type { VehicleStatus } from '@/types/vehicle.type'

const { t } = useI18n()
const router = useRouter()

const overlayGroup = 'vehiclesView'
const { canWrite } = usePermissions('/vehicles')
const table = ref()
const url = API_ENDPOINTS.GEN_VEHICLES

const columns = computed<Column[]>(() => [
  {
    field: 'plateNumber',
    header: t('vehicles.fields.plateNumber'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'vehicleTypeName',
    underlyingField: 'vehicleTypeId',
    header: t('vehicles.fields.vehicleType'),
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'capacityKg',
    header: t('vehicles.fields.capacityKg'),
    exportable: true,
    sortable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'stnkExpiry',
    header: t('vehicles.fields.stnkExpiry'),
    exportable: true,
    sortable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'ownership',
    header: t('vehicles.fields.ownership'),
    exportable: true,
    sortable: true,
    filterable: true,
    hideOnMobile: true,
  },
  {
    field: 'status',
    header: t('common.labels.status'),
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

function statusSeverity(status: VehicleStatus) {
  switch (status) {
    case 'available':
      return 'success'
    case 'service':
      return 'warn'
    case 'inactive':
      return 'danger'
    default:
      return 'secondary'
  }
}

function formatExpiry(dateStr: string): string {
  const expiry = dayjs(dateStr)
  const today = dayjs()
  const diff = expiry.diff(today, 'day')
  if (diff < 0) return t('vehicles.labels.expired')
  if (diff <= 30) return t('vehicles.labels.daysLeft', { days: diff })
  return expiry.format('DD/MM/YYYY')
}

function addVehicle() {
  router.push('/vehicles/new')
}

function navigateToVehicle(id: number) {
  router.push(`/vehicles/${id}`)
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'vehicle',
  onSuccess: async () => {
    await table.value.clearSearch()
  },
})

function onDeleteClick(id: number) {
  confirmDelete(() => VehiclesService.delete(id))
}
</script>
