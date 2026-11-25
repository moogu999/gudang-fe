<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      ref="formRef"
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="code" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.code')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="code"
            name="code"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="name"
            name="name"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="kind" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.kind')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Select
            id="kind"
            name="kind"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            data-testid="kind"
            @update:model-value="onKindChange"
          />
          <small v-if="$form.kind?.value === 'canvass'" class="text-surface-500">{{
            t('warehouses.labels.canvassHint')
          }}</small>
        </div>
      </div>

      <div
        v-if="$form.kind?.value === 'canvass'"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
      >
        <label for="salesmanEmployeeId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.salesman')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="canvassReady"
            id="salesmanEmployeeId"
            name="salesmanEmployeeId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => EmployeesService.listForSelect(query)"
            :custom-filters="canvassFilters"
            :initial-option="initialSalesman"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('warehouses.labels.selectSalesman')"
            sort-by="name"
            sort-operator="asc"
            data-testid="salesman"
            @select-option="(opt) => onSalesmanSelect(opt as Employee)"
          />
          <Message
            v-if="$form.salesmanEmployeeId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.salesmanEmployeeId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="branchId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.branch')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            :key="`branch-${initialBranch?.id ?? 'none'}`"
            id="branchId"
            name="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            :disabled="mode === DialogMode.VIEW || $form.kind?.value === 'canvass'"
            :placeholder="t('warehouses.labels.selectBranch')"
            :initial-option="initialBranch"
            sort-by="code"
            sort-operator="asc"
          />
          <small v-if="$form.kind?.value === 'canvass'" class="text-surface-500">{{
            t('warehouses.labels.branchFromSalesman')
          }}</small>
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">{{
            $form.branchId.error.message
          }}</Message>
        </div>
      </div>

      <div class="flex justify-end gap-2" v-if="mode !== DialogMode.VIEW">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
      <div class="flex justify-end gap-2" v-else>
        <Button type="button" :label="t('common.actions.close')" @click="handleClose"></Button>
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref, nextTick } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import {
  BranchesService,
  EmployeesService,
  GenericQueryBuilder,
  WarehousesService,
} from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Warehouse, WarehouseKind } from '@/types/warehouse.type'
import type { Employee } from '@/types'
import { useCanvassEmployeeFilter } from '@/composables/useCanvassEmployeeFilter'
import FilterOperator from '@/constants/filterOperator'
import { branchLabel } from '@/utils/branchHelper'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  warehouse: {
    type: Object as PropType<Warehouse>,
  },
})

const emits = defineEmits(['close'])

const initialBranch = ref()
const initialSalesman = ref<Employee>()
const formRef = ref()
const { filters: canvassFilters, ready: canvassReady } = useCanvassEmployeeFilter()

const kindOptions = computed(() => [
  { value: 'regular', label: t('warehouses.kinds.regular') },
  { value: 'canvass', label: t('warehouses.kinds.canvass') },
])

// A van belongs to its salesman's branch, so picking the salesman sets and locks the branch.
async function onSalesmanSelect(employee: Employee) {
  if (!employee.branchId) return
  // The employee payload may carry no branch name, so resolve the full branch for the label.
  const query = new GenericQueryBuilder()
    .withFilter('id', FilterOperator.EQUAL, employee.branchId)
    .build()
  const branch = (await BranchesService.list(query)).data[0]
  initialBranch.value = branch ?? {
    id: employee.branchId,
    code: '',
    name: employee.branch?.name ?? '',
  }
  // The select remounts when its initial option changes and a remounted field starts from
  // the form's initial values, so write the value only after that has happened.
  await nextTick()
  formRef.value?.setFieldValue('branchId', employee.branchId)
}

function onKindChange(kind: WarehouseKind) {
  if (kind === 'regular') formRef.value?.setFieldValue('salesmanEmployeeId', undefined)
}

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.warehouse) {
    return
  }

  initialValues.code = props.warehouse.code
  initialValues.name = props.warehouse.name
  initialValues.branchId = props.warehouse.branchId
  initialValues.kind = props.warehouse.kind ?? 'regular'
  initialValues.salesmanEmployeeId = props.warehouse.salesmanEmployeeId ?? undefined
  if (props.warehouse.salesmanEmployeeId) {
    initialSalesman.value = {
      id: props.warehouse.salesmanEmployeeId,
      name: props.warehouse.salesmanName ?? '',
    } as Employee
  }

  if (props.warehouse.branchCode) {
    initialBranch.value = {
      id: props.warehouse.branchId,
      code: props.warehouse.branchCode,
      name: props.warehouse.branchName,
    }
  }
})

const toastGroup = 'warehouseDialog'
const toast = useToast()

const initialValues = reactive({
  code: '',
  name: '',
  branchId: undefined as number | undefined,
  kind: 'regular' as WarehouseKind,
  salesmanEmployeeId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z
      .object({
        code: z.string().min(1, t('warehouses.validation.codeRequired')),
        name: z.string().min(1, t('warehouses.validation.nameRequired')),
        branchId: z.number().nullish(),
        kind: z.enum(['regular', 'canvass']),
        salesmanEmployeeId: z.number().nullish(),
      })
      .superRefine((value, ctx) => {
        if (value.branchId == null) {
          ctx.addIssue({
            code: 'custom',
            path: ['branchId'],
            message: t('warehouses.validation.branchRequired'),
          })
        }
        if (value.kind === 'canvass' && !value.salesmanEmployeeId) {
          ctx.addIssue({
            code: 'custom',
            path: ['salesmanEmployeeId'],
            message: t('warehouses.validation.salesmanRequired'),
          })
        }
      }),
  ),
)

function handleClose() {
  emits('close')
}

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true

  try {
    if (props.mode === DialogMode.ADD) {
      await addWarehouse(event)
    } else {
      await editWarehouse(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

// A regular warehouse never carries a salesman, even if one was picked and then switched away from.
function kindFields(event: FormSubmitEvent) {
  const kind = event.states.kind.value as WarehouseKind
  return {
    kind,
    salesmanEmployeeId:
      kind === 'canvass' ? (event.states.salesmanEmployeeId.value as number) : null,
  }
}

async function addWarehouse(event: FormSubmitEvent) {
  await WarehousesService.create({
    code: event.states.code.value,
    name: event.states.name.value,
    branchId: event.states.branchId.value,
    ...kindFields(event),
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('warehouses.messages.warehouseCreated'), toastGroup))
}

async function editWarehouse(event: FormSubmitEvent) {
  await WarehousesService.update(props.warehouse!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    branchId: event.states.branchId.value,
    ...kindFields(event),
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('warehouses.messages.warehouseUpdated'), toastGroup))
}
</script>
