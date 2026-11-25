<template>
  <div>
    <Toast position="top-center" :group="overlayGroup" />
    <ConfirmationDialog :group="overlayGroup" :accept-handler="deleteAcceptanceHandler" />

    <h1 class="mb-3 text-base font-semibold sm:mb-5 sm:text-lg md:text-2xl">
      {{ t('competitorProducts.title') }}
    </h1>

    <Toolbar v-if="canWrite" class="mb-5">
      <template #end>
        <ResponsiveButton
          :label="t('competitorProducts.addProduct')"
          @click="router.push('/competitor-products/create')"
        />
      </template>
    </Toolbar>

    <ResponsiveCard>
      <template #content>
        <Tabs :value="activeTab" @update:value="onTabChange">
          <TabList>
            <Tab value="master">{{ t('competitorProducts.tabs.master') }}</Tab>
            <Tab value="recommendations">
              <span class="flex items-center gap-2">
                {{ t('competitorProducts.tabs.recommendations') }}
                <Badge v-if="pendingCount > 0" :value="pendingCount" severity="danger" />
              </span>
            </Tab>
          </TabList>
        </Tabs>

        <template v-if="activeTab === 'master'">
          <div class="my-4 flex flex-col gap-2 md:flex-row md:flex-wrap">
            <Select
              v-model="filterBrandId"
              :options="brandOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('competitorProducts.filters.allBrands')"
              show-clear
              filter
              class="w-full md:w-52"
            />
            <Select
              v-model="filterCategory"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('competitorProducts.filters.allCategories')"
              show-clear
              filter
              class="w-full md:w-52"
            />
            <Select
              v-model="filterPrincipal"
              :options="principalOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('competitorProducts.filters.allPrincipals')"
              show-clear
              filter
              class="w-full md:w-52"
            />
            <Select
              v-model="filterStatus"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-full md:w-44"
            />
          </div>

          <TableComponent
            ref="table"
            :url="url"
            :columns="columns"
            :query-adapter="CompetitorProductsService.toListQuery"
            :row-class="rowClass"
          >
            <template #content="{ col, data }">
              <div v-if="col.field === 'name'" class="flex items-center gap-3">
                <img
                  v-if="data['thumbnailUrl']"
                  :src="buildFileUrl(data['thumbnailUrl'])"
                  class="h-9 w-9 shrink-0 rounded object-cover"
                  alt=""
                />
                <div
                  v-else
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-stone-100"
                >
                  <i class="pi pi-image text-stone-400" />
                </div>
                <div>
                  <a
                    class="text-primary-500 cursor-pointer font-semibold hover:underline"
                    @click.prevent="openProduct(data['id'])"
                    >{{ data['name'] }}</a
                  >
                  <div class="text-surface-500 font-mono text-xs">{{ data['code'] }}</div>
                </div>
              </div>

              <div v-if="col.field === 'brand.name'">
                <div>{{ data['brand'].name }}</div>
                <div v-if="data['brand'].manufacturer" class="text-surface-500 text-xs">
                  {{ data['brand'].manufacturer }}
                </div>
              </div>

              <span v-if="col.field === 'category.name'">{{ categoryText(data as Item) }}</span>

              <div
                v-if="col.field === 'primaryComparison'"
                class="flex flex-wrap items-center gap-1"
              >
                <template v-if="data['primaryComparison']">
                  <Tag severity="info" class="max-w-48">
                    <i class="pi pi-star-fill mr-1 text-xs" />
                    <span class="truncate">{{ data['primaryComparison'].name }}</span>
                    <span v-if="data['primaryComparison'].price !== undefined" class="ml-1 shrink-0"
                      >· {{ formatPrice(data['primaryComparison'].price, 2) }}</span
                    >
                  </Tag>
                  <Tag
                    v-if="data['otherComparisonCount'] > 0"
                    :value="`+${data['otherComparisonCount']}`"
                    severity="secondary"
                  />
                </template>
                <span v-else class="text-sm text-amber-600">{{
                  t('competitorProducts.list.noComparison')
                }}</span>
              </div>

              <div v-if="col.field === 'referencePrice'" class="text-right">
                <template v-if="data['referencePrice'] !== undefined">
                  {{ formatPrice(data['referencePrice']) }}
                  <span class="text-surface-500 text-xs">/ {{ data['uomGroup'].baseUomName }}</span>
                </template>
                <span v-else class="text-surface-400">—</span>
              </div>

              <Tag
                v-if="col.field === 'isActive'"
                :value="data['isActive'] ? t('common.labels.active') : t('common.labels.inactive')"
                :severity="data['isActive'] ? 'success' : 'secondary'"
              />

              <TableActionButtons
                v-if="col.field === ''"
                :can-write="canWrite"
                @edit="openProduct(data['id'])"
                @delete="onDeleteClick(data['id'])"
                @view="openProduct(data['id'])"
              />
            </template>
          </TableComponent>

          <p class="text-surface-500 mt-3 text-sm">{{ t('competitorProducts.list.legend') }}</p>
        </template>

        <RecommendationsTab
          v-else
          :can-write="canWrite"
          :toast-group="overlayGroup"
          @changed="loadPendingCount"
        />
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Badge from 'primevue/badge'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Toolbar from 'primevue/toolbar'
import ResponsiveButton from '@/components/button/ResponsiveButton.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import TableComponent from '@/components/table/TableComponent.vue'
import { useConfirmDelete, usePermissions } from '@/composables'
import { API_ENDPOINTS } from '@/constants/api'
import {
  CompetitorBrandsService,
  CompetitorProductRecommendationsService,
  CompetitorProductsService,
} from '@/services'
import type { Column } from '@/types/table.type'
import type { CompetitorProductListItem } from '@/types'
import { buildFileUrl } from '@/utils/fileUrl'
import { NO_LABEL, loadLabelFilterOptions } from '@/views/sales-teams/salesTeamHelpers'
import RecommendationsTab from './components/RecommendationsTab.vue'
import { competitorProductErrorKey } from './competitorProductErrors'

type Item = CompetitorProductListItem
type StatusFilter = 'active' | 'inactive' | 'all'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { canWrite } = usePermissions('/competitor-products')

const overlayGroup = 'competitorProductsView'
const table = ref()

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabKey = 'master' | 'recommendations'
const activeTab = ref<TabKey>(route.query.tab === 'recommendations' ? 'recommendations' : 'master')

function onTabChange(value: string | number) {
  if (value !== 'master' && value !== 'recommendations') return
  activeTab.value = value
  router.replace({ query: { ...route.query, tab: value } })
}

const pendingCount = ref(0)

async function loadPendingCount() {
  try {
    const res = await CompetitorProductRecommendationsService.list({ status: 'pending', limit: 1 })
    pendingCount.value = res.meta.total
  } catch {
    // The badge is a hint; the tab itself reports errors.
  }
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const filterBrandId = ref<number | undefined>()
const filterCategory = ref<number | undefined>()
const filterPrincipal = ref<number | undefined>()
const filterStatus = ref<StatusFilter>('active')

const brandOptions = ref<{ label: string; value: number }[]>([])
const categoryOptions = ref<{ label: string; value: number }[]>([])
const principalOptions = ref<{ label: string; value: number }[]>([])

const statusOptions = computed(() => [
  { label: t('competitorProducts.filters.statusActive'), value: 'active' },
  { label: t('competitorProducts.filters.statusInactive'), value: 'inactive' },
  { label: t('competitorProducts.filters.statusAll'), value: 'all' },
])

async function loadFilterOptions() {
  const labelOptions = async (key: 'category' | 'principal') => {
    try {
      const all = await loadLabelFilterOptions(key, '')
      return all.filter((o): o is { label: string; value: number } => o.value !== NO_LABEL)
    } catch {
      return []
    }
  }
  const [brands, categories, principals] = await Promise.all([
    CompetitorBrandsService.list().then(
      (r) => r.data.map((b) => ({ label: b.name, value: b.id })),
      () => [],
    ),
    labelOptions('category'),
    labelOptions('principal'),
  ])
  brandOptions.value = brands
  categoryOptions.value = categories
  principalOptions.value = principals
}

const url = computed(() => {
  const params = new URLSearchParams()
  if (filterBrandId.value) params.set('brandId', String(filterBrandId.value))
  if (filterCategory.value) params.set('categoryOptionId', String(filterCategory.value))
  if (filterPrincipal.value) params.set('principalOptionId', String(filterPrincipal.value))
  if (filterStatus.value !== 'all') params.set('isActive', String(filterStatus.value === 'active'))
  const qs = params.toString()
  return qs ? `${API_ENDPOINTS.COMPETITOR_PRODUCTS}?${qs}` : API_ENDPOINTS.COMPETITOR_PRODUCTS
})

// nextTick: TableComponent must have the new url before it refetches.
watch(url, async () => {
  await nextTick()
  table.value?.clearSearch()
})

onMounted(() => {
  loadFilterOptions()
  loadPendingCount()
})

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function openProduct(id: number) {
  router.push(`/competitor-products/${id}/edit`)
}

function rowClass(data: Item) {
  return data.isActive ? '' : 'opacity-60'
}

function categoryText(item: Item): string {
  return item.principal ? `${item.principal.name} › ${item.category.name}` : item.category.name
}

function formatPrice(value: string, maxFractionDigits = 0): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxFractionDigits }).format(
    Number(value),
  )
}

// None sortable: `/v1/competitor-products` orders by code and reads no sort parameter.
const col = (field: string, header: string, hideOnMobile = false): Column => ({
  field,
  header,
  exportable: false,
  sortable: false,
  filterable: false,
  ...(hideOnMobile ? { hideOnMobile } : {}),
})

const columns = computed<Column[]>(() => [
  col('name', t('competitorProducts.list.columnProduct')),
  col('brand.name', t('competitorProducts.list.columnBrand'), true),
  col('category.name', t('competitorProducts.list.columnCategory'), true),
  col('primaryComparison', t('competitorProducts.list.columnComparisons'), true),
  col('referencePrice', t('competitorProducts.list.columnReferencePrice'), true),
  col('isActive', t('common.labels.status')),
  col('', t('common.labels.actions')),
])

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup,
  entityName: 'competitor product',
  onSuccess: () => table.value?.clearSearch(),
})

function onDeleteClick(id: number) {
  confirmDelete(async () => {
    try {
      await CompetitorProductsService.delete(id)
    } catch (e) {
      const key = competitorProductErrorKey(e)
      if (key) throw new Error(t(key))
      throw e
    }
  })
}
</script>
