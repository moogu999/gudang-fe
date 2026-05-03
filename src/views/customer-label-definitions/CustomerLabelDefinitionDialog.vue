<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="deleteAcceptanceHandler" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('customerLabelDefinitions.fields.name')
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

      <!-- Options Section (only in EDIT mode) -->
      <div v-if="mode === DialogMode.EDIT && props.definition" class="mb-4">
        <Divider />

        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold sm:text-base md:text-lg">
            {{ t('customerLabelDefinitions.options.title') }}
          </h3>
          <Button
            :label="t('customerLabelDefinitions.options.addOption')"
            icon="pi pi-plus"
            size="small"
            @click="addOption"
          />
        </div>

        <DataTable
          :value="options"
          :loading="isLoadingOptions"
          striped-rows
          responsive-layout="scroll"
          :empty-message="t('table.noResults')"
          class="text-sm"
        >
          <Column field="value" :header="t('customerLabelDefinitions.options.fields.value')" />
          <Column :header="t('common.labels.actions')" style="width: 8rem">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  @click="editOption(data)"
                  text
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  @click="onDeleteOptionClick(data.id)"
                  text
                />
              </div>
            </template>
          </Column>
        </DataTable>
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

    <!-- Option Dialog -->
    <Dialog
      :header="optionDialogHeader"
      @hide="closeOptionDialog"
      v-model:visible="isOptionDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw',
      }"
      :style="{ width: '40vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl',
      }"
    >
      <CustomerLabelDefinitionOptionDialog
        :mode="optionDialogMode"
        :option="selectedOption"
        :definition-id="props.definition?.id ?? 0"
        @close="closeOptionDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useToast } from 'primevue/usetoast'
import {
  CustomerLabelDefinitionsService,
  CustomerLabelOptionsService,
  GenericQueryBuilder,
} from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import { useConfirmDelete } from '@/composables'
import DialogMode from '@/constants/dialogMode'
import { FilterOperator } from '@/constants'
import type { CustomerLabelDefinition, CustomerLabelOption } from '@/types'
import CustomerLabelDefinitionOptionDialog from './CustomerLabelDefinitionOptionDialog.vue'

const { t } = useI18n()

const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  definition: {
    type: Object as PropType<CustomerLabelDefinition>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.definition) {
    return
  }

  initialValues.name = props.definition.name

  if (props.mode === DialogMode.EDIT) {
    loadOptions()
  }
})

const toastGroup = 'customerLabelDefinitionDialog'
const toast = useToast()

const initialValues = reactive({
  name: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('customerLabelDefinitions.validation.nameRequired')),
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
      await addDefinition(event)
    } else {
      await editDefinition(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addDefinition(event: FormSubmitEvent) {
  // TODO: companyId should come from the auth store or company context.
  // The backend will need to provide this. Using 1 as a placeholder.
  await CustomerLabelDefinitionsService.create({
    name: event.states.name.value,
    companyId: 1,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('customerLabelDefinitions.messages.definitionCreated'), toastGroup))
}

async function editDefinition(event: FormSubmitEvent) {
  await CustomerLabelDefinitionsService.update(props.definition!.id, {
    name: event.states.name.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('customerLabelDefinitions.messages.definitionUpdated'), toastGroup))
}

// Options management
const options = ref<CustomerLabelOption[]>([])
const isLoadingOptions = ref(false)

async function loadOptions() {
  if (!props.definition?.id) return

  const query = new GenericQueryBuilder()
    .withFilter('customer_label_definition_id', FilterOperator.EQUAL, props.definition.id)
    .build()

  isLoadingOptions.value = true
  try {
    const response = await CustomerLabelOptionsService.list(query)
    options.value = response.data
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingOptions.value = false
  }
}

// Option dialog
const isOptionDialogShown = ref(false)
const optionDialogMode = ref(DialogMode.ADD)
const selectedOption = ref<CustomerLabelOption | undefined>(undefined)

const optionDialogHeader = computed(() => {
  if (optionDialogMode.value === DialogMode.ADD) {
    return t('customerLabelDefinitions.options.addOption')
  }
  return t('customerLabelDefinitions.options.editOption')
})

function addOption() {
  optionDialogMode.value = DialogMode.ADD
  selectedOption.value = undefined
  isOptionDialogShown.value = true
}

function editOption(option: CustomerLabelOption) {
  optionDialogMode.value = DialogMode.EDIT
  selectedOption.value = option
  isOptionDialogShown.value = true
}

async function closeOptionDialog() {
  isOptionDialogShown.value = false
  await loadOptions()
}

// Delete option confirmation
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'option',
  onSuccess: async () => {
    await loadOptions()
  },
})

function onDeleteOptionClick(id: number) {
  confirmDelete(() => CustomerLabelOptionsService.delete(id))
}
</script>
