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
        <label for="days" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('paymentTerms.fields.days')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            id="days"
            name="days"
            :min="0"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.days?.invalid" severity="error" size="small" variant="simple">{{
            $form.days.error.message
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
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { PaymentTermsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { PaymentTerm } from '@/types'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  paymentTerm: {
    type: Object as PropType<PaymentTerm>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.paymentTerm) {
    return
  }

  initialValues.name = props.paymentTerm.name
  initialValues.days = props.paymentTerm.days ?? undefined
  initialValues.isActive = props.paymentTerm.isActive
})

const toastGroup = 'paymentTermDialog'
const toast = useToast()

const initialValues = reactive({
  name: '',
  days: undefined as number | undefined,
  isActive: true,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('paymentTerms.validation.nameRequired')),
      days: z.number().int().min(0).optional().nullable(),
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
      await addPaymentTerm(event)
    } else {
      await editPaymentTerm(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addPaymentTerm(event: FormSubmitEvent) {
  await PaymentTermsService.create({
    name: event.states.name.value,
    days: event.states.days.value ?? null,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('paymentTerms.messages.paymentTermCreated'), toastGroup))
}

async function editPaymentTerm(event: FormSubmitEvent) {
  await PaymentTermsService.update(props.paymentTerm!.id, {
    name: event.states.name.value,
    days: event.states.days.value ?? null,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('paymentTerms.messages.paymentTermUpdated'), toastGroup))
}
</script>
