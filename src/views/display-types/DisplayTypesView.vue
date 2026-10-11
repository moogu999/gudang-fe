<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('displayTypes.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton
          :label="t('displayTypes.addType')"
          data-testid="add-type"
          @click="openDialog(DialogMode.ADD)"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <div class="mb-4 flex flex-col gap-2 md:flex-row">
          <Select
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full md:w-48"
            data-testid="status-filter"
          />
        </div>

        <TableComponent
          ref="table"
          :url="url"
          :columns="columns"
          :query-adapter="DisplayTypesService.toListQuery"
          :row-class="rowClass"
        >
          <template #content="{ col, data }">
            <span v-if="col.field === 'code'" class="font-mono">{{ data['code'] }}</span>

            <span v-if="col.field === 'name'">{{ data['name'] }}</span>

            <span v-if="col.field === 'minPhotos'">{{ data['minPhotos'] }}</span>

            <template v-if="col.field === 'description'">
              <span v-if="data['description']">{{ data['description'] }}</span>
              <span v-else class="text-surface-400">—</span>
            </template>

            <span v-if="col.field === 'programCount'">{{ data['programCount'] }}</span>

            <Tag
              v-if="col.field === 'isActive'"
              :value="data['isActive'] ? t('common.labels.active') : t('common.labels.inactive')"
              :severity="data['isActive'] ? 'success' : 'secondary'"
            />

            <span
              v-if="col.field === ''"
              v-tooltip.top="data['programCount'] > 0 ? t('displayTypes.deleteBlocked') : undefined"
              class="inline-block"
            >
              <TableActionButtons
                :can-write="canWrite"
                :can-delete="data['programCount'] === 0"
                @edit="openDialog(DialogMode.EDIT, data as DisplayType)"
                @delete="onDeleteClick(data['id'])"
                @view="openDialog(DialogMode.VIEW, data as DisplayType)"
              />
            </span>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>

    <Dialog
      v-model:visible="isDialogShown"
      :header="dialogHeader"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      :style="{ width: '40vw' }"
      :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
      @hide="close"
    >
      <DisplayTypeDialog
        :key="dialogKey"
        :mode="dialogMode"
        :display-type="selected"
        @close="onDialogClose"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Toolbar from 'primevue/toolbar'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import TableComponent from '@/components/table/TableComponent.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import DialogMode from '@/constants/dialogMode'
import { DisplayTypesService } from '@/services'
import type { Column } from '@/types/table.type'
import type { DisplayType } from '@/types'
import DisplayTypeDialog from './DisplayTypeDialog.vue'
import { displayTypeErrorKey } from './displayTypeErrors'

const { t } = useI18n()
const overlayGroup = 'displayTypesView'
const { canWrite } = usePermissions('/display-types')

type StatusFilter = 'active' | 'inactive' | 'all'

const table = ref()
const status = ref<StatusFilter>('active')

const statusOptions = computed(() => [
  { value: 'active', label: t('displayTypes.filters.statusActive') },
  { value: 'inactive', label: t('displayTypes.filters.statusInactive') },
  { value: 'all', label: t('displayTypes.filters.statusAll') },
])

const url = computed(() => {
  const base = API_ENDPOINTS.DISPLAY_TYPES
  if (status.value === 'all') return base
  return `${base}?isActive=${status.value === 'active'}`
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

// None sortable: `/v1/display-types` orders by code and reads no sort parameter.
const columns = computed<Column[]>(() =>
  [
    { field: 'code', header: t('displayTypes.fields.code') },
    { field: 'name', header: t('displayTypes.fields.name') },
    { field: 'minPhotos', header: t('displayTypes.fields.minPhotos'), hideOnMobile: true },
    { field: 'description', header: t('displayTypes.fields.description'), hideOnMobile: true },
    { field: 'programCount', header: t('displayTypes.fields.programs'), hideOnMobile: true },
    { field: 'isActive', header: t('common.labels.status') },
    { field: '', header: t('common.labels.actions') },
  ].map((c) => ({ exportable: false, sortable: false, filterable: false, ...c })),
)

function rowClass(data: DisplayType) {
  return data.isActive ? undefined : 'opacity-60'
}

const dialogMode = ref(DialogMode.ADD)
const selected = ref<DisplayType | undefined>(undefined)
const dialogKey = ref(0)
const { isVisible: isDialogShown, open, close } = useDialog()

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('displayTypes.addType')
  if (dialogMode.value === DialogMode.EDIT) return t('displayTypes.editType')
  return t('displayTypes.viewType')
})

function openDialog(m: DialogMode, row?: DisplayType) {
  dialogMode.value = m
  selected.value = row
  dialogKey.value++
  open()
}

async function onDialogClose(saved: boolean) {
  close()
  if (saved) await table.value?.clearSearch()
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: t('displayTypes.entityName'),
  onSuccess: () => table.value?.clearSearch(),
})

function onDeleteClick(id: number) {
  confirmDelete(async () => {
    try {
      await DisplayTypesService.delete(id)
    } catch (e) {
      const key = displayTypeErrorKey(e)
      if (key) throw new Error(t(key))
      throw e
    }
  })
}
</script>
