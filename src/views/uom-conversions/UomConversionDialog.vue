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
          t('common.labels.name')
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
        <label for="description" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('common.labels.description')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Textarea
            id="description"
            name="description"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            rows="3"
          />
          <Message v-if="$form.description?.invalid" severity="error" size="small" variant="simple">{{
            $form.description.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <Checkbox
            id="isActive"
            name="isActive"
            :binary="true"
            :disabled="mode === DialogMode.VIEW"
          />
          <label for="isActive" class="text-sm font-semibold sm:text-base">{{
            t('common.labels.active')
          }}</label>
        </div>
      </div>

      <!-- Conversion Details Section (Only in EDIT mode) -->
      <div v-if="mode === DialogMode.EDIT && props.uomConversion" class="mb-4">
        <Divider />

        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold sm:text-base md:text-lg">
            {{ t('uomConversions.details.title') }}
          </h3>
          <Button
            :label="t('uomConversions.details.addDetail')"
            icon="pi pi-plus"
            size="small"
            @click="addDetail"
          />
        </div>

        <DataTable
          :value="conversionDetails"
          :loading="isLoadingDetails"
          striped-rows
          responsive-layout="scroll"
          :empty-message="t('table.noResults')"
          class="text-sm"
        >
          <Column
            field="fromUom.name"
            :header="t('uomConversions.details.fields.fromUom')"
            sortable
          />
          <Column
            field="toUom.name"
            :header="t('uomConversions.details.fields.toUom')"
            sortable
          />
          <Column
            field="conversionFactor"
            :header="t('uomConversions.details.fields.conversionFactor')"
            sortable
          >
            <template #body="{ data }">
              {{ data.conversionFactor }}
            </template>
          </Column>
          <Column :header="t('common.labels.actions')" style="width: 8rem">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  @click="editDetail(data)"
                  text
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  @click="onDeleteDetailClick(data.id)"
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

    <!-- Detail Dialog -->
    <Dialog
      :header="detailDialogHeader"
      @hide="closeDetailDialog"
      v-model:visible="isDetailDialogShown"
      modal
      :breakpoints="{
        '960px': '75vw',
        '640px': '90vw'
      }"
      :style="{ width: '40vw' }"
      :pt="{
        header: 'text-base sm:text-lg md:text-xl'
      }"
    >
      <UomConversionDetailDialog
        :mode="detailDialogMode"
        :detail="selectedDetail"
        :header-id="props.uomConversion?.id ?? 0"
        @close="closeDetailDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import { useToast } from 'primevue/usetoast'
import { UomConversionHeadersService, UomConversionDetailsService, GenericQueryBuilder } from '@/services'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import { useConfirmDelete } from '@/composables'
import DialogMode from '@/constants/dialogMode'
import type { UomConversionHeader, UomConversionDetail } from '@/types'
import UomConversionDetailDialog from './UomConversionDetailDialog.vue'
import { FilterOperator } from '@/constants'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  uomConversion: {
    type: Object as PropType<UomConversionHeader>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.uomConversion) {
    return
  }

  initialValues.name = props.uomConversion.name
  initialValues.description = props.uomConversion.description ?? ''
  initialValues.isActive = props.uomConversion.isActive

  // Load conversion details if in EDIT mode
  if (props.mode === DialogMode.EDIT) {
    loadConversionDetails()
  }
})

// Toast
const toastGroup = 'uomConversionDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  name: '',
  description: '',
  isActive: true,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('uomConversions.validation.nameRequired')),
      description: z.string().optional(),
    })
  )
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
      await addUomConversion(event)
    } else {
      await editUomConversion(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addUomConversion(event: FormSubmitEvent) {
  await UomConversionHeadersService.create({
    name: event.states.name.value,
    description: event.states.description.value || null,
    isActive: event.states.isActive.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('uomConversions.messages.uomConversionCreated'), toastGroup))
}

async function editUomConversion(event: FormSubmitEvent) {
  await UomConversionHeadersService.update(props.uomConversion!.id, {
    name: event.states.name.value,
    description: event.states.description.value || null,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('uomConversions.messages.uomConversionUpdated'), toastGroup))
}

// Conversion Details Management
const conversionDetails = ref<UomConversionDetail[]>([])
const isLoadingDetails = ref(false)

async function loadConversionDetails() {
  if (!props.uomConversion?.id) return

  const query = new GenericQueryBuilder()
    .withFilter("header_id", FilterOperator.EQUAL, props.uomConversion.id)
    .build();

  isLoadingDetails.value = true
  try {
    const response = await UomConversionDetailsService.list(query)
    conversionDetails.value = response.data
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingDetails.value = false
  }
}

// Detail Dialog Management
const isDetailDialogShown = ref(false)
const detailDialogMode = ref(DialogMode.ADD)
const selectedDetail = ref<UomConversionDetail | undefined>(undefined)

const detailDialogHeader = computed(() => {
  if (detailDialogMode.value === DialogMode.ADD) {
    return t('uomConversions.details.addDetail')
  } else if (detailDialogMode.value === DialogMode.EDIT) {
    return t('uomConversions.details.editDetail')
  } else {
    return t('uomConversions.details.viewDetail')
  }
})

function addDetail() {
  detailDialogMode.value = DialogMode.ADD
  selectedDetail.value = undefined
  isDetailDialogShown.value = true
}

function editDetail(detail: UomConversionDetail) {
  detailDialogMode.value = DialogMode.EDIT
  selectedDetail.value = detail
  isDetailDialogShown.value = true
}

async function closeDetailDialog() {
  isDetailDialogShown.value = false
  // Reload details after closing dialog
  await loadConversionDetails()
}

// Delete confirmation for details
const { confirmDelete, deleteAcceptanceHandler } = useConfirmDelete({
  overlayGroup: toastGroup,
  entityName: 'conversion detail',
  onSuccess: async () => {
    await loadConversionDetails()
  },
})

function onDeleteDetailClick(id: number) {
  confirmDelete(() => UomConversionDetailsService.delete(id))
}
</script>
