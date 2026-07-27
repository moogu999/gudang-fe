<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
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
        <label for="branchId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('warehouses.fields.branch')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="branchId"
            name="branchId"
            :option-label="branchLabel"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('warehouses.labels.selectBranch')"
            :initial-option="initialBranch"
            sort-by="code"
            sort-operator="asc"
          />
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
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { BranchesService, WarehousesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Warehouse } from '@/types/warehouse.type'
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

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.warehouse) {
    return
  }

  initialValues.code = props.warehouse.code
  initialValues.name = props.warehouse.name
  initialValues.branchId = props.warehouse.branchId

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
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      code: z.string().min(1, t('warehouses.validation.codeRequired')),
      name: z.string().min(1, t('warehouses.validation.nameRequired')),
      branchId: z.number({ required_error: t('warehouses.validation.branchRequired') }),
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

async function addWarehouse(event: FormSubmitEvent) {
  await WarehousesService.create({
    code: event.states.code.value,
    name: event.states.name.value,
    branchId: event.states.branchId.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('warehouses.messages.warehouseCreated'), toastGroup))
}

async function editWarehouse(event: FormSubmitEvent) {
  await WarehousesService.update(props.warehouse!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    branchId: event.states.branchId.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('warehouses.messages.warehouseUpdated'), toastGroup))
}
</script>
