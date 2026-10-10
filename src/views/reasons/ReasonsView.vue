<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('reasons.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('reasons.addReason')" @click="addReason" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <Tabs :value="activeType" scrollable @update:value="onTabChange">
          <TabList>
            <Tab v-for="rt in REASON_TYPES" :key="rt.key" :value="rt.key">
              <span class="flex items-center gap-2">
                {{ t(`reasons.types.${rt.key}.label`) }}
                <Badge :value="activeCounts[rt.key]" severity="secondary" />
              </span>
            </Tab>
          </TabList>
        </Tabs>

        <div class="my-4 flex flex-col gap-2 md:flex-row">
          <InputText
            v-model="search"
            :placeholder="t('reasons.filters.search')"
            class="w-full md:w-72"
          />
          <Select
            v-model="mode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            class="w-full md:w-56"
          />
          <Select
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full md:w-48"
          />
        </div>

        <DataTable
          :value="rows"
          data-key="id"
          :loading="loading"
          :row-class="rowClass"
          @row-reorder="onRowReorder"
        >
          <Column v-if="canReorder" row-reorder style="width: 3rem" :reorderable-column="false" />
          <Column field="code" :header="t('reasons.fields.code')">
            <template #body="{ data }"
              ><span class="font-mono">{{ data.code }}</span></template
            >
          </Column>
          <Column field="name" :header="t('reasons.fields.name')" />
          <Column :header="t('reasons.fields.requiresPhoto')">
            <template #body="{ data }">
              <i v-if="data.requiresPhoto" class="pi pi-camera" />
              <span v-else class="text-surface-400">·</span>
            </template>
          </Column>
          <Column :header="t('reasons.fields.requiresNote')">
            <template #body="{ data }">
              <i v-if="data.requiresNote" class="pi pi-pencil" />
              <span v-else class="text-surface-400">·</span>
            </template>
          </Column>
          <Column :header="t('reasons.fields.employeeTypes')">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Tag
                  v-if="data.forTakingOrder"
                  v-tooltip="t('reasons.employeeTypes.salesman')"
                  :value="t('reasons.employeeTypes.salesmanShort')"
                  severity="info"
                />
                <Tag
                  v-if="data.forCanvass"
                  v-tooltip="t('reasons.employeeTypes.canvass')"
                  :value="t('reasons.employeeTypes.canvassShort')"
                  severity="warn"
                />
              </div>
            </template>
          </Column>
          <Column v-if="activeType === 'return'" :header="t('reasons.fields.defaultStockType')">
            <template #body="{ data }">
              <Tag
                v-if="data.defaultStockType"
                :value="t(`reasons.stockTypes.${data.defaultStockType}`)"
                :severity="data.defaultStockType === 'good' ? 'success' : 'danger'"
              />
            </template>
          </Column>
          <Column :header="t('common.labels.status')">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? t('common.labels.active') : t('common.labels.inactive')"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <TableActionButtons
                :can-write="canWrite"
                @edit="editReason(data)"
                @delete="onDeleteClick(data.id)"
                @view="viewReason(data)"
              />
            </template>
          </Column>
        </DataTable>

        <p class="text-surface-500 mt-3 text-sm">{{ t('reasons.hints.order') }}</p>
      </template>
    </ResponsiveCard>

    <Dialog
      :header="dialogHeader"
      @hide="close"
      v-model:visible="isDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw',
      }"
      :style="{ width: '50vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
    >
      <ReasonDialog
        :key="dialogKey"
        :mode="dialogMode"
        :reason="reason"
        :initial-type="activeType"
        @close="onDialogClose"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Badge from 'primevue/badge'
import Column from 'primevue/column'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Toolbar from 'primevue/toolbar'
import { useToast } from 'primevue/usetoast'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import { useConfirmDelete, useDialog, usePermissions } from '@/composables'
import DialogMode from '@/constants/dialogMode'
import { ReasonsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { REASON_TYPES, type Reason, type ReasonType } from '@/types'
import ReasonDialog from './ReasonDialog.vue'
import { reasonErrorKey } from './reasonErrors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const overlayGroup = 'reasonsView'

const { canWrite } = usePermissions('/reasons')

type ModeFilter = 'all' | 'taking_order' | 'canvass'
type StatusFilter = 'active' | 'inactive' | 'all'

const all = ref<Reason[]>([])
const loading = ref(false)
const search = ref('')
const mode = ref<ModeFilter>('all')
const status = ref<StatusFilter>('active')

const isReasonType = (v: unknown): v is ReasonType => REASON_TYPES.some((rt) => rt.key === v)

const activeType = ref<ReasonType>(
  isReasonType(route.query.type) ? route.query.type : REASON_TYPES[0].key,
)

function onTabChange(value: string | number) {
  if (!isReasonType(value)) return
  activeType.value = value
  router.replace({ query: { ...route.query, type: value } })
}

const modeOptions = computed(() => [
  { value: 'all', label: t('reasons.filters.allEmployeeTypes') },
  { value: 'taking_order', label: t('reasons.employeeTypes.salesman') },
  { value: 'canvass', label: t('reasons.employeeTypes.canvass') },
])

const statusOptions = computed(() => [
  { value: 'active', label: t('reasons.filters.statusActive') },
  { value: 'inactive', label: t('reasons.filters.statusInactive') },
  { value: 'all', label: t('reasons.filters.statusAll') },
])

const activeCounts = computed(() => {
  const counts = Object.fromEntries(REASON_TYPES.map((rt) => [rt.key, 0])) as Record<
    ReasonType,
    number
  >
  for (const r of all.value) if (r.isActive) counts[r.type]++
  return counts
})

// The server orders each type active first, then by display order; filtering
// keeps that order.
const rows = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return all.value.filter((r) => {
    if (r.type !== activeType.value) return false
    if (status.value === 'active' && !r.isActive) return false
    if (status.value === 'inactive' && r.isActive) return false
    if (mode.value === 'taking_order' && !r.forTakingOrder) return false
    if (mode.value === 'canvass' && !r.forCanvass) return false
    if (needle && !r.code.toLowerCase().includes(needle) && !r.name.toLowerCase().includes(needle))
      return false
    return true
  })
})

// A filtered subset can't define the order, and the server needs exactly the
// type's active ids.
const canReorder = computed(
  () => canWrite.value && status.value === 'active' && !search.value.trim() && mode.value === 'all',
)

function rowClass(data: Reason) {
  return data.isActive ? '' : 'opacity-60'
}

async function fetchReasons() {
  loading.value = true
  try {
    const res = await ReasonsService.list()
    all.value = res.data
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    loading.value = false
  }
}

onMounted(fetchReasons)

async function onRowReorder(event: DataTableRowReorderEvent) {
  const reordered = event.value as Reason[]
  const type = activeType.value
  const previous = all.value
  all.value = sortActiveFirst(previous, type, reordered)

  try {
    await ReasonsService.reorder(
      type,
      reordered.map((r) => r.id),
    )
  } catch (e) {
    const key = reasonErrorKey(e)
    toast.add(commonErrorToast(key ? t(key) : e, overlayGroup))
    await fetchReasons()
  }
}

/** Puts `type`'s active rows in `activeOrder`, ahead of its inactive rows. */
function sortActiveFirst(list: Reason[], type: ReasonType, activeOrder: Reason[]): Reason[] {
  const others = list.filter((r) => r.type !== type)
  const inactive = list.filter((r) => r.type === type && !r.isActive)
  const merged = [...others, ...activeOrder, ...inactive]
  return merged.sort(
    (a, b) =>
      REASON_TYPES.findIndex((x) => x.key === a.type) -
      REASON_TYPES.findIndex((x) => x.key === b.type),
  )
}

// Dialog
const dialogMode = ref(DialogMode.ADD)
const reason = ref<Reason | undefined>(undefined)
const dialogKey = ref(0)

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('reasons.addReason')
  if (dialogMode.value === DialogMode.EDIT) return t('reasons.editReason')
  return t('reasons.viewReason')
})

const { isVisible: isDialogShown, open, close } = useDialog()

function openDialog(m: DialogMode, selected?: Reason) {
  dialogMode.value = m
  reason.value = selected
  dialogKey.value++
  open()
}

const addReason = () => openDialog(DialogMode.ADD)
const editReason = (selected: Reason) => openDialog(DialogMode.EDIT, selected)
const viewReason = (selected: Reason) => openDialog(DialogMode.VIEW, selected)

async function onDialogClose(saved: boolean) {
  close()
  if (saved) await fetchReasons()
}

// Delete
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'reason',
  onSuccess: fetchReasons,
})

function onDeleteClick(id: number) {
  confirmDelete(async () => {
    try {
      await ReasonsService.delete(id)
    } catch (e) {
      // useConfirmDelete words every 409 as "in use"; a plain Error carries the
      // specific reason through to its error toast instead.
      const key = reasonErrorKey(e)
      if (key) throw new Error(t(key))
      throw e
    }
  })
}
</script>
