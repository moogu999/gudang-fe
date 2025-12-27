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
          t('unitOfMeasurements.fields.name')
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
        <label for="symbol" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('unitOfMeasurements.fields.symbol')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="symbol"
            name="symbol"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.symbol?.invalid" severity="error" size="small" variant="simple">{{
            $form.symbol.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <Checkbox
            id="isCustom"
            name="isCustom"
            :binary="true"
            :disabled="true"
          />
          <label for="isCustom" class="text-sm font-semibold sm:text-base">{{
            t('unitOfMeasurements.fields.isCustom')
          }}</label>
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
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { UnitOfMeasurementsService } from '@/services'
import { ref } from 'vue'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { UnitOfMeasurement } from '@/types'

const { t } = useI18n()

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  unitOfMeasurement: {
    type: Object as PropType<UnitOfMeasurement>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.unitOfMeasurement) {
    return
  }

  initialValues.name = props.unitOfMeasurement.name
  initialValues.symbol = props.unitOfMeasurement.symbol
  initialValues.isCustom = props.unitOfMeasurement.isCustom
})

// Toast
const toastGroup = 'unitOfMeasurementDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  name: '',
  symbol: '',
  isCustom: true,
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('unitOfMeasurements.validation.nameRequired')),
      symbol: z.string().min(1, t('unitOfMeasurements.validation.symbolRequired')),
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
      await addUnitOfMeasurement(event)
    } else {
      await editUnitOfMeasurement(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addUnitOfMeasurement(event: FormSubmitEvent) {
  await UnitOfMeasurementsService.create({
    name: event.states.name.value,
    symbol: event.states.symbol.value,
    isCustom: event.states.isCustom.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('unitOfMeasurements.messages.unitOfMeasurementCreated'), toastGroup))
}

async function editUnitOfMeasurement(event: FormSubmitEvent) {
  await UnitOfMeasurementsService.update(props.unitOfMeasurement!.id, {
    name: event.states.name.value,
    symbol: event.states.symbol.value,
  })

  toast.add(commonSuccessToast(t('unitOfMeasurements.messages.unitOfMeasurementUpdated'), toastGroup))
}
</script>
