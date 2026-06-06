<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <!-- Branch -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="branchId" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('bookingOrderConfigs.fields.branch') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            id="branchId"
            name="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            :placeholder="t('bookingOrderConfigs.labels.selectBranch')"
            sort-by="name"
            sort-operator="asc"
            @select-option="onBranchSelect"
          />
          <InputText v-else :value="props.config?.branchName" disabled class="w-full" />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">
            {{ $form.branchId.error.message }}
          </Message>
        </div>
      </div>

      <!-- Recalculate Partial Pricing -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="recalculatePartialPricing" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('bookingOrderConfigs.fields.recalculatePartialPricing') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <ToggleSwitch
            v-if="mode !== DialogMode.VIEW"
            v-model="initialValues.recalculatePartialPricing"
            input-id="recalculatePartialPricing"
          />
          <span v-else>{{
            initialValues.recalculatePartialPricing
              ? t('common.labels.yes')
              : t('common.labels.no')
          }}</span>
          <small class="text-stone-400">{{
            t('bookingOrderConfigs.labels.recalculatePartialPricingHint')
          }}</small>
        </div>
      </div>

      <!-- Warehouse -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="warehouseId" class="w-full text-sm font-semibold sm:text-base md:w-48">
          {{ t('bookingOrderConfigs.fields.warehouse') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode !== DialogMode.VIEW"
            :key="selectedBranchId"
            id="warehouseId"
            name="warehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => WarehousesService.list(query)"
            :placeholder="t('bookingOrderConfigs.labels.selectWarehouse')"
            :initial-option="initialWarehouse"
            :custom-filters="warehouseFilters"
            :disabled="mode === DialogMode.ADD && selectedBranchId === undefined"
            sort-by="name"
            sort-operator="asc"
          />
          <InputText v-else :value="props.config?.warehouseName" disabled class="w-full" />
          <Message v-if="$form.warehouseId?.invalid" severity="error" size="small" variant="simple">
            {{ $form.warehouseId.error.message }}
          </Message>
        </div>
      </div>

      <div v-if="mode !== DialogMode.VIEW" class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('close')"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading"
        />
      </div>
      <div v-else class="flex justify-end gap-2">
        <Button type="button" :label="t('common.actions.close')" @click="emit('close')" />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DialogMode from '@/constants/dialogMode'
import { BranchesService, WarehousesService, BookingOrderConfigService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { BookingOrderConfig } from '@/types'
import type { Warehouse } from '@/types/warehouse.type'
import FilterOperator from '@/constants/filterOperator'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  config: {
    type: Object as PropType<BookingOrderConfig>,
    default: undefined,
  },
})

const emit = defineEmits(['close'])

const toastGroup = 'bookingOrderConfigDialog'
const isLoading = ref(false)
const selectedBranchId = ref<number | undefined>(undefined)
const initialWarehouse = ref<Warehouse | undefined>(undefined)

const warehouseFilters = computed(() => {
  if (selectedBranchId.value === undefined) return []
  return [
    {
      filterBy: 'branch_id',
      filterOperator: FilterOperator.EQUAL,
      filterValue: selectedBranchId.value,
    },
  ]
})

const initialValues = reactive({
  branchId: undefined as number | undefined,
  warehouseId: undefined as number | undefined,
  recalculatePartialPricing: false,
})

onBeforeMount(() => {
  if ((props.mode === DialogMode.EDIT || props.mode === DialogMode.VIEW) && props.config) {
    selectedBranchId.value = props.config.branchId
    initialValues.warehouseId = props.config.warehouseId
    initialValues.recalculatePartialPricing = props.config.recalculatePartialPricing
    initialWarehouse.value = {
      id: props.config.warehouseId,
      name: props.config.warehouseName,
    } as Warehouse
  }
})

function onBranchSelect(branch: object) {
  selectedBranchId.value = (branch as { id: number }).id
}

const resolver = computed(() =>
  zodResolver(
    z.object({
      branchId:
        props.mode === DialogMode.ADD
          ? z.number({ message: t('bookingOrderConfigs.validation.branchRequired') })
          : z.number().optional(),
      warehouseId: z.number({ message: t('bookingOrderConfigs.validation.warehouseRequired') }),
    }),
  ),
)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  const branchId =
    props.mode === DialogMode.ADD ? event.states.branchId.value : props.config!.branchId

  isLoading.value = true
  try {
    await BookingOrderConfigService.upsert(branchId, {
      warehouseId: event.states.warehouseId.value,
      recalculatePartialPricing: initialValues.recalculatePartialPricing,
    })

    const message =
      props.mode === DialogMode.ADD
        ? t('bookingOrderConfigs.messages.created')
        : t('bookingOrderConfigs.messages.updated')

    toast.add(commonSuccessToast(message, toastGroup))
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
