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
        <label for="fromUomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomConversions.details.fields.fromUom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="fromUomId"
            name="fromUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialFromUom"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message v-if="$form.fromUomId?.invalid" severity="error" size="small" variant="simple">{{
            $form.fromUomId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="toUomId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomConversions.details.fields.toUom')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="toUomId"
            name="toUomId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => UnitOfMeasurementsService.list(query)"
            :initial-option="initialToUom"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <Message v-if="$form.toUomId?.invalid" severity="error" size="small" variant="simple">{{
            $form.toUomId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="conversionFactor" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('uomConversions.details.fields.conversionFactor')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            id="conversionFactor"
            name="conversionFactor"
            :disabled="mode === DialogMode.VIEW"
            :min-fraction-digits="0"
            :max-fraction-digits="6"
            class="w-full"
          />
          <Message v-if="$form.conversionFactor?.invalid" severity="error" size="small" variant="simple">{{
            $form.conversionFactor.error.message
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
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { UomConversionDetailsService, UnitOfMeasurementsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { UomConversionDetail } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  detail: {
    type: Object as PropType<UomConversionDetail>,
  },
  headerId: {
    type: Number,
    required: true,
  },
})

const emits = defineEmits(['close'])

// Initial options for dropdowns
const initialFromUom = ref()
const initialToUom = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.detail) {
    return
  }

  initialValues.fromUomId = props.detail.fromUomId
  initialValues.toUomId = props.detail.toUomId
  initialValues.conversionFactor = props.detail.conversionFactor

  // Set initial options for dropdowns
  if (props.detail.fromUom) {
    initialFromUom.value = {
      id: props.detail.fromUomId,
      name: props.detail.fromUom.name,
    }
  }
  if (props.detail.toUom) {
    initialToUom.value = {
      id: props.detail.toUomId,
      name: props.detail.toUom.name,
    }
  }
})

// Toast
const toastGroup = 'uomConversionDetailDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  fromUomId: undefined as number | undefined,
  toUomId: undefined as number | undefined,
  conversionFactor: undefined as number | undefined,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      fromUomId: z.number({ required_error: t('uomConversions.details.validation.fromUomRequired') }),
      toUomId: z.number({ required_error: t('uomConversions.details.validation.toUomRequired') }),
      conversionFactor: z
        .number({ required_error: t('uomConversions.details.validation.conversionFactorRequired') })
        .positive(t('uomConversions.details.validation.conversionFactorPositive')),
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
      await addDetail(event)
    } else {
      await editDetail(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addDetail(event: FormSubmitEvent) {
  await UomConversionDetailsService.create({
    headerId: props.headerId,
    fromUomId: event.states.fromUomId.value,
    toUomId: event.states.toUomId.value,
    conversionFactor: event.states.conversionFactor.value,
  })

  toast.add(commonSuccessToast(t('uomConversions.details.messages.detailCreated'), toastGroup))
}

async function editDetail(event: FormSubmitEvent) {
  await UomConversionDetailsService.update(props.detail!.id, {
    fromUomId: event.states.fromUomId.value,
    toUomId: event.states.toUomId.value,
    conversionFactor: event.states.conversionFactor.value,
  })

  toast.add(commonSuccessToast(t('uomConversions.details.messages.detailUpdated'), toastGroup))
}
</script>
