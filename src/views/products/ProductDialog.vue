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
          t('products.fields.code')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <!-- Auto/Manual toggle only shown in ADD mode -->
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('products.codeMode.auto')"
              :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="codeMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('products.codeMode.manual')"
              :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="codeMode = 'manual'"
            />
          </div>
          <!-- Auto mode: read-only preview -->
          <div v-if="mode === DialogMode.ADD && codeMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="numberSeriesLoading ? '' : previewCode"
              :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full"
            />
            <small class="text-surface-500">{{ t('products.codeMode.assignedOnSave') }}</small>
          </div>
          <!-- Manual mode or EDIT/VIEW mode: editable -->
          <InputText
            v-else
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
          t('products.fields.name')
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
          t('products.fields.description')
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
          <Message
            v-if="$form.description?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.description.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <Checkbox
            id="taxable"
            name="taxable"
            :binary="true"
            :disabled="mode === DialogMode.VIEW"
          />
          <label for="taxable" class="text-sm font-semibold sm:text-base">{{
            t('products.fields.taxable')
          }}</label>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="trackingTypeId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('products.fields.trackingType')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="trackingTypeId"
            name="trackingTypeId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => TrackingTypesService.list(query)"
            :initial-option="initialTrackingType"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('products.labels.selectTrackingType')"
            sort-by="code"
            sort-operator="asc"
          />
          <Message
            v-if="$form.trackingTypeId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.trackingTypeId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="uomGroupId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('products.fields.uomGroup')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="uomGroupId"
            name="uomGroupId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UomGroupsService.list(query)"
            :initial-option="initialUomGroup"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('products.labels.selectUomGroup')"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.uomGroupId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.uomGroupId.error.message }}</Message
          >
        </div>
      </div>

      <!-- Labels Section (EDIT mode only) -->
      <div v-if="mode === DialogMode.EDIT && props.product" class="mb-4">
        <Divider />
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold sm:text-base md:text-lg">
            {{ t('products.labels.title') }}
          </h3>
          <Button
            :label="t('products.labels.setLabels')"
            icon="pi pi-tag"
            size="small"
            @click="openSetLabelsDialog"
          />
        </div>
        <DataTable
          :value="currentLabels"
          :loading="isLoadingLabels"
          striped-rows
          responsive-layout="scroll"
          :empty-message="t('table.noResults')"
          class="text-sm"
        >
          <Column field="definition.name" :header="t('products.labels.fields.label')" />
          <Column field="option.value" :header="t('products.labels.fields.value')" />
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

    <!-- Set Labels Dialog -->
    <Dialog
      :header="t('products.labels.setLabels')"
      @hide="closeSetLabelsDialog"
      v-model:visible="isSetLabelsDialogShown"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      :style="{ width: '50vw' }"
      :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    >
      <ProductSetLabelsDialog
        v-if="props.product"
        :product-id="props.product.id"
        :current-labels="currentLabels"
        @close="closeSetLabelsDialog"
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
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import {
  ProductsService,
  TrackingTypesService,
  UomGroupsService,
  NumberSeriesService,
} from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import HttpStatus from '@/constants/httpStatus'
import ToastLife from '@/constants/toastLife'
import type { Product, ProductLabelValue } from '@/types'
import { ApiError } from '@/types/api.type'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ProductSetLabelsDialog from './ProductSetLabelsDialog.vue'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

// Number series (only used in ADD mode)
const {
  codeMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('products')

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  product: {
    type: Object as PropType<Product>,
  },
})

const emits = defineEmits(['close'])

// Initial options for dropdowns
const initialTrackingType = ref()
const initialUomGroup = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.product) {
    // Set default tracking type to Non (id: 1)
    initialValues.trackingTypeId = 1
    return
  }

  initialValues.code = props.product.code
  initialValues.name = props.product.name
  initialValues.description = props.product.description || ''
  initialValues.taxable = props.product.taxable
  initialValues.trackingTypeId = props.product.trackingTypeId
  initialValues.uomGroupId = props.product.uomGroupId

  // Set initial options for dropdowns
  if (props.product.trackingType) {
    initialTrackingType.value = {
      id: props.product.trackingTypeId,
      name: props.product.trackingType.name,
      code: props.product.trackingType.code,
    }
  }

  if (props.product.uomGroup) {
    initialUomGroup.value = {
      id: props.product.uomGroupId,
      name: props.product.uomGroup.name,
    }
  }

  if (props.mode === DialogMode.EDIT && props.product) {
    currentLabels.value = props.product.labels ?? []
  }
})

// Labels state
const currentLabels = ref<ProductLabelValue[]>([])
const isLoadingLabels = ref(false)
const isSetLabelsDialogShown = ref(false)

function openSetLabelsDialog() {
  isSetLabelsDialogShown.value = true
}

async function closeSetLabelsDialog() {
  isSetLabelsDialogShown.value = false
  await loadCurrentLabels()
}

async function loadCurrentLabels() {
  if (!props.product) return
  isLoadingLabels.value = true
  try {
    const fresh = await ProductsService.getById(props.product.id)
    currentLabels.value = fresh.labels ?? []
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingLabels.value = false
  }
}

// Toast
const toastGroup = 'productDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  code: '',
  name: '',
  description: '',
  taxable: true,
  trackingTypeId: 1 as number | undefined,
  uomGroupId: undefined as number | undefined,
})

// Validation schema — code field is optional in ADD+auto mode (generated server-side)
const resolver = computed(() =>
  zodResolver(
    z.object({
      code:
        props.mode === DialogMode.ADD && codeMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('products.validation.codeRequired')),
      name: z.string().min(1, t('products.validation.nameRequired')),
      description: z.string().optional(),
      taxable: z.boolean(),
      trackingTypeId: z.number({ message: t('products.validation.trackingTypeRequired') }),
      uomGroupId: z.number().optional(),
    }),
  ),
)

function handleClose() {
  emits('close')
}

const isLoading = ref(false)

// Code being saved, so a duplicate-code error can name it back to the user
const submittedCode = ref('')

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true

  try {
    if (props.mode === DialogMode.ADD) {
      await addProduct(event)
    } else {
      await editProduct(event)
    }

    emits('close')
  } catch (e) {
    // 409 means the code collides with an existing product. The backend message is
    // in English and phrased around database fields, so show a localized one instead,
    // and give it longer on screen since it asks the user to change something.
    if (e instanceof ApiError && e.status === HttpStatus.CONFLICT) {
      toast.add(
        commonErrorToast(
          t('products.messages.duplicateCode', { code: submittedCode.value }),
          toastGroup,
          ToastLife.FIVE_SECONDS,
        ),
      )
      return
    }
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addProduct(event: FormSubmitEvent) {
  let code: string
  if (codeMode.value === 'auto' && numberSeriesId.value !== null) {
    const generated = await NumberSeriesService.generateNext(numberSeriesId.value)
    code = generated.code
  } else {
    code = event.states.code.value
  }
  submittedCode.value = code

  await ProductsService.create({
    code,
    name: event.states.name.value,
    description: event.states.description.value || undefined,
    taxable: event.states.taxable.value,
    trackingTypeId: event.states.trackingTypeId.value,
    uomGroupId: event.states.uomGroupId.value || undefined,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('products.messages.productCreated'), toastGroup))
}

async function editProduct(event: FormSubmitEvent) {
  submittedCode.value = event.states.code.value

  await ProductsService.update(props.product!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    description: event.states.description.value || undefined,
    taxable: event.states.taxable.value,
    trackingTypeId: event.states.trackingTypeId.value,
    uomGroupId: event.states.uomGroupId.value || undefined,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('products.messages.productUpdated'), toastGroup))
}
</script>
