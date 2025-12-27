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
          <Checkbox id="taxable" name="taxable" :binary="true" :disabled="mode === DialogMode.VIEW" />
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
        <label for="productBaseUomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('products.fields.productBaseUom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="productBaseUomId"
            name="productBaseUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => ProductBaseUomsService.list(query)"
            :initial-option="initialProductBaseUom"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('products.labels.selectProductBaseUom')"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.productBaseUomId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.productBaseUomId.error.message }}</Message
          >
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
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { ProductsService, TrackingTypesService, ProductBaseUomsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Product } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

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
const initialProductBaseUom = ref()

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
  initialValues.productBaseUomId = props.product.productBaseUomId

  // Set initial options for dropdowns
  if (props.product.trackingType) {
    initialTrackingType.value = {
      id: props.product.trackingTypeId,
      name: props.product.trackingType.name,
      code: props.product.trackingType.code,
    }
  }

  if (props.product.productBaseUom) {
    initialProductBaseUom.value = {
      id: props.product.productBaseUomId,
      name: props.product.productBaseUom.name,
    }
  }
})

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
  productBaseUomId: undefined as number | undefined,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      code: z.string().min(1, t('products.validation.codeRequired')),
      name: z.string().min(1, t('products.validation.nameRequired')),
      description: z.string().optional(),
      taxable: z.boolean(),
      trackingTypeId: z.number({ message: t('products.validation.trackingTypeRequired') }),
      productBaseUomId: z.number().optional(),
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
      await addProduct(event)
    } else {
      await editProduct(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addProduct(event: FormSubmitEvent) {
  await ProductsService.create({
    code: event.states.code.value,
    name: event.states.name.value,
    description: event.states.description.value || undefined,
    taxable: event.states.taxable.value,
    trackingTypeId: event.states.trackingTypeId.value,
    productBaseUomId: event.states.productBaseUomId.value || undefined,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('products.messages.productCreated'), toastGroup))
}

async function editProduct(event: FormSubmitEvent) {
  await ProductsService.update(props.product!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    description: event.states.description.value || undefined,
    taxable: event.states.taxable.value,
    trackingTypeId: event.states.trackingTypeId.value,
    productBaseUomId: event.states.productBaseUomId.value || undefined,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('products.messages.productUpdated'), toastGroup))
}
</script>
