<template>
  <Dialog
    :visible="true"
    :header="t('mustSellLists.products.categoryPickerTitle')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '35vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-3">
      <Select
        v-model="categoryOptionId"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('mustSellLists.products.selectCategory')"
        filter
        class="w-full"
        data-testid="category-select"
      />
      <p v-if="categoryOptionId" class="text-sm text-stone-600" data-testid="category-count">
        <i v-if="loading" class="pi pi-spinner pi-spin mr-1" />
        <template v-else>{{
          t('mustSellLists.products.categoryCount', { n: products.length })
        }}</template>
      </p>
      <small class="text-surface-500">{{ t('mustSellLists.products.categoryHelp') }}</small>
    </div>

    <template #footer>
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('close')" />
      <Button
        :label="t('mustSellLists.products.addCount', { n: products.length })"
        icon="pi pi-plus"
        :disabled="loading || products.length === 0"
        data-testid="category-add"
        @click="emit('select', products)"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { MustSellListsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { MslProductOption } from '@/types/mustSellList.type'
import { NO_LABEL, loadLabelFilterOptions } from '../../sales-teams/salesTeamHelpers'

const props = defineProps<{ principalOptionId: number; toastGroup?: string }>()

const emit = defineEmits<{ select: [products: MslProductOption[]]; close: [] }>()

const { t } = useI18n()
const toast = useToast()

const categoryOptions = ref<{ label: string; value: number }[]>([])
const categoryOptionId = ref<number | undefined>()
const products = ref<MslProductOption[]>([])
const loading = ref(false)

async function loadProducts() {
  products.value = []
  const category = categoryOptionId.value
  if (!category) return
  loading.value = true
  try {
    // Every product of the category that carries the principal, up to the API's cap.
    const res = await MustSellListsService.productOptions({
      principalOptionId: props.principalOptionId,
      categoryOptionId: category,
      all: true,
    })
    if (category !== categoryOptionId.value) return
    products.value = res.data ?? []
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  } finally {
    loading.value = false
  }
}

watch(categoryOptionId, loadProducts)

onMounted(async () => {
  try {
    const options = await loadLabelFilterOptions('category', '')
    categoryOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({ label: o.label, value: o.value as number }))
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  }
})
</script>
