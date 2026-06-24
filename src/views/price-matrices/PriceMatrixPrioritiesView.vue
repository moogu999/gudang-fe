<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('priceMatrixPriority.title') }}
    </h1>

    <!-- Branch selector -->
    <ResponsiveCard class="mb-5">
      <template #content>
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <label for="branchId" class="text-sm font-semibold sm:text-base md:w-24">
            {{ t('priceMatrixPriority.branchLabel') }}
          </label>
          <InfiniteSelect
            id="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            :placeholder="t('priceMatrixPriority.branchPlaceholder')"
            sort-by="name"
            sort-operator="asc"
            class="w-full md:w-80"
            @update:model-value="onBranchChange"
          />
        </div>
        <p v-if="selectedBranchId === null" class="text-surface-500 mt-2 text-sm">
          {{ t('priceMatrixPriority.branchHint') }}
        </p>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-if="canWrite" class="mb-5">
      <template #content>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            v-model="selectedMatrixId"
            :options="availableMatrices"
            option-label="code"
            option-value="id"
            :placeholder="t('priceMatrixPriority.addPlaceholder')"
            class="w-full sm:w-80"
            :disabled="loading || selectedBranchId === null"
          />
          <Button
            :label="t('priceMatrixPriority.actions.add')"
            :disabled="selectedMatrixId === null || loading || selectedBranchId === null"
            @click="onAdd"
          />
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard>
      <template #content>
        <DataTable :value="priorities" :loading="loading">
          <Column field="priority" :header="t('priceMatrixPriority.columns.priority')" />
          <Column field="code" :header="t('priceMatrixPriority.columns.code')" />
          <Column field="description" :header="t('priceMatrixPriority.columns.description')" />
          <Column v-if="canWrite" header="">
            <template #body="{ data, index }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-arrow-up"
                  severity="secondary"
                  text
                  :disabled="data.priority === 1 || loading || selectedBranchId === null"
                  :aria-label="t('priceMatrixPriority.actions.moveUp')"
                  @click="onMove(data.id, 'up')"
                />
                <Button
                  icon="pi pi-arrow-down"
                  severity="secondary"
                  text
                  :disabled="
                    index === priorities.length - 1 || loading || selectedBranchId === null
                  "
                  :aria-label="t('priceMatrixPriority.actions.moveDown')"
                  @click="onMove(data.id, 'down')"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  :disabled="loading || selectedBranchId === null"
                  :aria-label="t('priceMatrixPriority.actions.remove')"
                  @click="onRemove(data.id)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { usePermissions } from '@/composables'
import { PriceMatricesService } from '@/services/price-matrices.service'
import { BranchesService } from '@/services/branches.service'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { PriceMatrixPriorityItem, PriceMatrixSummary } from '@/types/price-matrix.type'

const { t } = useI18n()
const toast = useToast()
const { canWrite } = usePermissions('/price-matrix-priorities')

const toastGroup = 'priceMatrixPrioritiesView'
const loading = ref(false)
const priorities = ref<PriceMatrixPriorityItem[]>([])
const allMatrices = ref<PriceMatrixSummary[]>([])
const selectedMatrixId = ref<number | null>(null)
const selectedBranchId = ref<number | null>(null)

const priorityIds = computed(() => new Set(priorities.value.map((p) => p.id)))
const availableMatrices = computed(() =>
  allMatrices.value.filter((m) => !priorityIds.value.has(m.id)),
)

async function fetchPriorities(branchId: number) {
  const result = await PriceMatricesService.getPriorities(branchId)
  priorities.value = result.data
}

async function fetchAllMatrices() {
  const result = await PriceMatricesService.list('limit=1000')
  allMatrices.value = result.data
}

async function loadBranchData(branchId: number) {
  loading.value = true
  try {
    await Promise.all([fetchPriorities(branchId), fetchAllMatrices()])
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchAllMatrices())

function onBranchChange(value: string | number | boolean | Date | object | null | undefined) {
  const branchId = typeof value === 'number' ? value : null
  selectedBranchId.value = branchId
  priorities.value = []
  selectedMatrixId.value = null
  if (branchId !== null) {
    loadBranchData(branchId)
  }
}

async function onAdd() {
  if (selectedMatrixId.value === null || selectedBranchId.value === null) return
  loading.value = true
  try {
    await PriceMatricesService.addToPriorityList(selectedMatrixId.value, selectedBranchId.value)
    selectedMatrixId.value = null
    toast.add(commonSuccessToast(t('priceMatrixPriority.messages.added'), toastGroup))
    await loadBranchData(selectedBranchId.value)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

async function onMove(id: number, direction: 'up' | 'down') {
  if (selectedBranchId.value === null) return
  loading.value = true
  try {
    await PriceMatricesService.movePriority(id, direction, selectedBranchId.value)
    toast.add(commonSuccessToast(t('priceMatrixPriority.messages.moved'), toastGroup))
    await loadBranchData(selectedBranchId.value)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

async function onRemove(id: number) {
  if (selectedBranchId.value === null) return
  loading.value = true
  try {
    await PriceMatricesService.removeFromPriorityList(id, selectedBranchId.value)
    toast.add(commonSuccessToast(t('priceMatrixPriority.messages.removed'), toastGroup))
    await loadBranchData(selectedBranchId.value)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}
</script>
