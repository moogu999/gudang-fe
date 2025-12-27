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
        <label for="uomConversionHeaderId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('productBaseUoms.fields.uomConversionHeader')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="uomConversionHeaderId"
            name="uomConversionHeaderId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UomConversionHeadersService.list(query)"
            :initial-option="initialUomConversionHeader"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.uomConversionHeaderId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.uomConversionHeaderId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="baseUomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('productBaseUoms.fields.baseUom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="baseUomId"
            name="baseUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialBaseUom"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
          />
          <Message v-if="$form.baseUomId?.invalid" severity="error" size="small" variant="simple">{{
            $form.baseUomId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="defaultDisplayUomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('productBaseUoms.fields.defaultDisplayUom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="defaultDisplayUomId"
            name="defaultDisplayUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialDefaultDisplayUom"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.defaultDisplayUomId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.defaultDisplayUomId.error.message }}</Message
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
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import {
  ProductBaseUomsService,
  UomConversionHeadersService,
  UnitOfMeasurementsService,
} from '@/services'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { ProductBaseUom } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  productBaseUom: {
    type: Object as PropType<ProductBaseUom>,
  },
})

const emits = defineEmits(['close'])

// Initial options for dropdowns
const initialUomConversionHeader = ref()
const initialBaseUom = ref()
const initialDefaultDisplayUom = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.productBaseUom) {
    return
  }

  initialValues.name = props.productBaseUom.name
  initialValues.uomConversionHeaderId = props.productBaseUom.uomConversionHeaderId
  initialValues.baseUomId = props.productBaseUom.baseUomId
  initialValues.defaultDisplayUomId = props.productBaseUom.defaultDisplayUomId

  // Set initial options for dropdowns
  if (props.productBaseUom.uomConversionHeader) {
    initialUomConversionHeader.value = {
      id: props.productBaseUom.uomConversionHeaderId,
      name: props.productBaseUom.uomConversionHeader.name,
    }
  }

  if (props.productBaseUom.baseUom) {
    initialBaseUom.value = {
      id: props.productBaseUom.baseUomId,
      name: props.productBaseUom.baseUom.name,
    }
  }

  if (props.productBaseUom.defaultDisplayUom) {
    initialDefaultDisplayUom.value = {
      id: props.productBaseUom.defaultDisplayUomId,
      name: props.productBaseUom.defaultDisplayUom.name,
    }
  }
})

// Toast
const toastGroup = 'productBaseUomDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  name: '',
  uomConversionHeaderId: undefined as number | undefined,
  baseUomId: undefined as number | undefined,
  defaultDisplayUomId: undefined as number | undefined,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('productBaseUoms.validation.nameRequired')),
      uomConversionHeaderId: z.number({
        required_error: t('productBaseUoms.validation.uomConversionHeaderRequired'),
      }),
      baseUomId: z.number({
        required_error: t('productBaseUoms.validation.baseUomRequired'),
      }),
      defaultDisplayUomId: z.number({
        required_error: t('productBaseUoms.validation.defaultDisplayUomRequired'),
      }),
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
      await addProductBaseUom(event)
    } else {
      await editProductBaseUom(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addProductBaseUom(event: FormSubmitEvent) {
  await ProductBaseUomsService.create({
    name: event.states.name.value,
    uomConversionHeaderId: event.states.uomConversionHeaderId.value,
    baseUomId: event.states.baseUomId.value,
    defaultDisplayUomId: event.states.defaultDisplayUomId.value,
  })

  toast.add(commonSuccessToast(t('productBaseUoms.messages.productBaseUomCreated'), toastGroup))
}

async function editProductBaseUom(event: FormSubmitEvent) {
  await ProductBaseUomsService.update(props.productBaseUom!.id, {
    name: event.states.name.value,
    uomConversionHeaderId: event.states.uomConversionHeaderId.value,
    baseUomId: event.states.baseUomId.value,
    defaultDisplayUomId: event.states.defaultDisplayUomId.value,
  })

  toast.add(commonSuccessToast(t('productBaseUoms.messages.productBaseUomUpdated'), toastGroup))
}
</script>
