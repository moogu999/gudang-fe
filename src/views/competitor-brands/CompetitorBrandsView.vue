<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('competitorBrands.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton :label="t('competitorBrands.addBrand')" @click="openDialog(DialogMode.ADD)" />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <div class="mb-4 flex flex-col gap-2 md:flex-row">
          <InputText
            v-model="search"
            :placeholder="t('competitorBrands.filters.search')"
            class="w-full md:w-72"
          />
          <Select
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full md:w-48"
          />
        </div>

        <DataTable :value="rows" data-key="id" :loading="loading" :row-class="rowClass">
          <Column field="name" :header="t('competitorBrands.fields.name')" />
          <Column :header="t('competitorBrands.fields.manufacturer')">
            <template #body="{ data }">
              <span v-if="data.manufacturer">{{ data.manufacturer }}</span>
              <span v-else class="text-surface-400">—</span>
            </template>
          </Column>
          <Column field="productCount" :header="t('competitorBrands.fields.products')" />
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
                @edit="openDialog(DialogMode.EDIT, data)"
                @delete="onDeleteClick(data.id)"
                @view="openDialog(DialogMode.VIEW, data)"
              />
            </template>
          </Column>
        </DataTable>
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
      <CompetitorBrandDialog
        :key="dialogKey"
        :mode="dialogMode"
        :brand="brand"
        @close="onDialogClose"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
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
import { CompetitorBrandsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { CompetitorBrand } from '@/types'
import CompetitorBrandDialog from './CompetitorBrandDialog.vue'
import { competitorBrandErrorKey } from './competitorBrandErrors'

const { t } = useI18n()
const toast = useToast()
const overlayGroup = 'competitorBrandsView'
const { canWrite } = usePermissions('/competitor-brands')

type StatusFilter = 'active' | 'inactive' | 'all'

const all = ref<CompetitorBrand[]>([])
const loading = ref(false)
const search = ref('')
const status = ref<StatusFilter>('active')

const statusOptions = computed(() => [
  { value: 'active', label: t('competitorBrands.filters.statusActive') },
  { value: 'inactive', label: t('competitorBrands.filters.statusInactive') },
  { value: 'all', label: t('competitorBrands.filters.statusAll') },
])

const rows = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return all.value.filter((b) => {
    if (status.value === 'active' && !b.isActive) return false
    if (status.value === 'inactive' && b.isActive) return false
    if (!needle) return true
    return (
      b.name.toLowerCase().includes(needle) || (b.manufacturer ?? '').toLowerCase().includes(needle)
    )
  })
})

function rowClass(data: CompetitorBrand) {
  return data.isActive ? '' : 'opacity-60'
}

async function fetchBrands() {
  loading.value = true
  try {
    all.value = (await CompetitorBrandsService.list()).data
  } catch (e) {
    toast.add(commonErrorToast(e, overlayGroup))
  } finally {
    loading.value = false
  }
}

onMounted(fetchBrands)

const dialogMode = ref(DialogMode.ADD)
const brand = ref<CompetitorBrand | undefined>(undefined)
const dialogKey = ref(0)
const { isVisible: isDialogShown, open, close } = useDialog()

const dialogHeader = computed(() => {
  if (dialogMode.value === DialogMode.ADD) return t('competitorBrands.addBrand')
  if (dialogMode.value === DialogMode.EDIT) return t('competitorBrands.editBrand')
  return t('competitorBrands.viewBrand')
})

function openDialog(m: DialogMode, selected?: CompetitorBrand) {
  dialogMode.value = m
  brand.value = selected
  dialogKey.value++
  open()
}

async function onDialogClose(saved: boolean) {
  close()
  if (saved) await fetchBrands()
}

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'competitor brand',
  onSuccess: fetchBrands,
})

function onDeleteClick(id: number) {
  confirmDelete(async () => {
    try {
      await CompetitorBrandsService.delete(id)
    } catch (e) {
      const key = competitorBrandErrorKey(e)
      if (key) throw new Error(t(key))
      throw e
    }
  })
}
</script>
