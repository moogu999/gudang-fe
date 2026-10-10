<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <!-- Stats -->
    <div class="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-stone-50 px-3 py-2 text-sm">
      <span>
        <span class="text-stone-500">{{ t('salesTeams.products.skuCarried') }}:</span>
        <span class="ml-1 font-semibold">{{ team.skuCount }}</span>
      </span>
      <span v-if="team.principals.length">
        <span class="text-stone-500">
          {{ t('salesTeams.products.principals', { n: team.principals.length }) }}:
        </span>
        <span class="ml-1">{{
          principalSummaryText(team.principals, t('salesTeams.noPrincipal'))
        }}</span>
      </span>
    </div>

    <!-- Toolbar -->
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <Select
        v-model="filterPrincipal"
        :options="principalOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesTeams.filters.allPrincipals')"
        show-clear
        filter
        class="min-w-44"
      />
      <Select
        v-model="filterCategory"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('salesTeams.products.allCategories')"
        show-clear
        filter
        class="min-w-44"
      />
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('salesTeams.products.searchPlaceholder')"
          @keydown.enter="fetchProducts"
        />
      </IconField>
      <div v-if="canWrite" class="ml-auto flex gap-2">
        <Button
          :label="t('salesTeams.products.removeSelected', { n: selection.length })"
          icon="pi pi-trash"
          severity="danger"
          outlined
          size="small"
          :disabled="selection.length === 0"
          @click="confirmRemove"
        />
        <Button
          :label="t('salesTeams.products.addSkus')"
          icon="pi pi-plus"
          size="small"
          @click="isPickerShown = true"
        />
      </div>
    </div>

    <DataTable
      v-model:selection="selection"
      v-model:expanded-row-groups="expandedGroups"
      :value="rows"
      data-key="productId"
      :selection-mode="canWrite ? 'multiple' : undefined"
      :meta-key-selection="false"
      row-group-mode="subheader"
      group-rows-by="groupKey"
      expandable-row-groups
      :loading="loading"
      scrollable
      scroll-height="600px"
      class="text-sm"
    >
      <Column v-if="canWrite" selection-mode="multiple" header-style="width: 3rem" />
      <Column field="code" :header="t('salesTeams.products.columns.code')" class="font-mono" />
      <Column field="name" :header="t('salesTeams.products.columns.name')" />
      <Column :header="t('salesTeams.products.columns.uomGroup')">
        <template #body="{ data }">{{ data.uomGroup?.name ?? '—' }}</template>
      </Column>
      <template #groupheader="{ data }">
        <span class="font-semibold">
          {{
            t('salesTeams.products.groupLabel', {
              principal: data.principalName,
              category: data.categoryName,
              n: data.groupCount,
            })
          }}
        </span>
      </template>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('salesTeams.products.empty') }}</div>
      </template>
    </DataTable>

    <SalesTeamProductPickerDialog
      v-if="isPickerShown"
      :team="team"
      :toast-group="toastGroup"
      @close="isPickerShown = false"
      @added="onAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { SalesTeam } from '@/types/salesTeam.type'
import {
  groupKeys,
  groupProducts,
  principalSummaryText,
  type GroupedSalesTeamProduct,
} from '../salesTeamGrouping'
import { loadLabelFilterOptions, toLabelBuckets, type LabelSelectValue } from '../salesTeamHelpers'
import SalesTeamProductPickerDialog from './SalesTeamProductPickerDialog.vue'

const props = defineProps<{
  team: SalesTeam
  canWrite: boolean
  toastGroup: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()

const confirmGroup = 'salesTeamProducts'

const filterPrincipal = ref<LabelSelectValue | undefined>()
const filterCategory = ref<LabelSelectValue | undefined>()
const search = ref('')
const principalOptions = ref<{ label: string; value: LabelSelectValue }[]>([])
const categoryOptions = ref<{ label: string; value: LabelSelectValue }[]>([])

const rows = ref<GroupedSalesTeamProduct[]>([])
const selection = ref<GroupedSalesTeamProduct[]>([])
const expandedGroups = ref<string[]>([])
const loading = ref(false)
const isPickerShown = ref(false)

const names = computed(() => ({
  noPrincipal: t('salesTeams.noPrincipal'),
  noCategory: t('salesTeams.noCategory'),
}))

async function fetchProducts() {
  loading.value = true
  try {
    const res = await SalesTeamsService.listProducts(props.team.id, {
      ...toLabelBuckets(filterPrincipal.value, filterCategory.value),
      q: search.value.trim() || undefined,
    })
    rows.value = groupProducts(res.data, names.value)
    // The first group starts open, the rest collapsed.
    expandedGroups.value = groupKeys(rows.value).slice(0, 1)
    selection.value = []
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

watch([filterPrincipal, filterCategory], fetchProducts)

onMounted(async () => {
  const [principals, categories] = await Promise.allSettled([
    loadLabelFilterOptions('principal', t('salesTeams.noPrincipal')),
    loadLabelFilterOptions('category', t('salesTeams.noCategory')),
  ])
  if (principals.status === 'fulfilled') principalOptions.value = principals.value
  if (categories.status === 'fulfilled') categoryOptions.value = categories.value
  await fetchProducts()
})

function confirmRemove() {
  const count = selection.value.length
  confirm.require({
    group: confirmGroup,
    header: t('salesTeams.products.removeTitle'),
    message: t('salesTeams.products.confirmRemove', { n: count, code: props.team.code }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('salesTeams.products.remove'), severity: 'danger' },
    accept: removeSelected,
  })
}

async function removeSelected() {
  try {
    const res = await SalesTeamsService.removeProducts(
      props.team.id,
      selection.value.map((r) => r.productId),
    )
    toast.add(
      commonSuccessToast(
        t('salesTeams.messages.productsRemoved', { n: res.removed }),
        props.toastGroup,
      ),
    )
    await fetchProducts()
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}

async function onAdded() {
  await fetchProducts()
  emit('changed')
}
</script>
