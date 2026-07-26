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
          t('suppliers.fields.code')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <!-- Auto/Manual toggle only shown in ADD mode -->
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('suppliers.codeMode.auto')"
              :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="codeMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('suppliers.codeMode.manual')"
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
              class="w-full font-mono"
            />
            <small class="text-surface-500">{{ t('suppliers.codeMode.assignedOnSave') }}</small>
          </div>
          <!-- Manual mode or EDIT/VIEW mode: editable -->
          <InputText
            v-else
            id="code"
            name="code"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full font-mono"
          />
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.name')
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
        <label for="npwp" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.npwp')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="npwp"
            name="npwp"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.npwp?.invalid" severity="error" size="small" variant="simple">{{
            $form.npwp.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="address" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.address')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Textarea
            id="address"
            name="address"
            rows="3"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.address?.invalid" severity="error" size="small" variant="simple">{{
            $form.address.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="picName" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.picName')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="picName"
            name="picName"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.picName?.invalid" severity="error" size="small" variant="simple">{{
            $form.picName.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="picPhone" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.picPhone')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="picPhone"
            name="picPhone"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.picPhone?.invalid" severity="error" size="small" variant="simple">{{
            $form.picPhone.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="paymentTermId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.paymentTerm')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="paymentTermId"
            name="paymentTermId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => PaymentTermsService.list(query)"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('suppliers.labels.selectPaymentTerm')"
            :initial-option="initialPaymentTerm"
            sort-by="name"
            sort-operator="asc"
          />
          <Message
            v-if="$form.paymentTermId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.paymentTermId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="bankName" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.bankName')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="bankName"
            name="bankName"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="bankAccountNumber" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('suppliers.fields.bankAccountNumber')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="bankAccountNumber"
            name="bankAccountNumber"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label
          for="bankAccountHolderName"
          class="w-full text-sm font-semibold sm:text-base md:w-32"
          >{{ t('suppliers.fields.bankAccountHolderName') }}</label
        >
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="bankAccountHolderName"
            name="bankAccountHolderName"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <ToggleSwitch id="isActive" name="isActive" :disabled="mode === DialogMode.VIEW" />
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
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { SuppliersService, PaymentTermsService, NumberSeriesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { Supplier } from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()

// Number series (only used in ADD mode)
const {
  codeMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('suppliers')

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  supplier: {
    type: Object as PropType<Supplier>,
  },
})

const emits = defineEmits(['close'])

// Initial option for the Term of Payment dropdown
const initialPaymentTerm = ref()

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.supplier) {
    return
  }

  initialValues.code = props.supplier.code
  initialValues.name = props.supplier.name
  initialValues.npwp = props.supplier.npwp
  initialValues.address = props.supplier.address
  initialValues.picName = props.supplier.picName
  initialValues.picPhone = props.supplier.picPhone
  initialValues.paymentTermId = props.supplier.paymentTermId
  initialValues.bankName = props.supplier.bankName ?? ''
  initialValues.bankAccountNumber = props.supplier.bankAccountNumber ?? ''
  initialValues.bankAccountHolderName = props.supplier.bankAccountHolderName ?? ''
  initialValues.isActive = props.supplier.isActive

  if (props.supplier.paymentTerm) {
    initialPaymentTerm.value = {
      id: props.supplier.paymentTermId,
      name: props.supplier.paymentTerm.name,
    }
  }
})

const toastGroup = 'supplierDialog'
const toast = useToast()

const initialValues = reactive({
  code: '',
  name: '',
  npwp: '',
  address: '',
  picName: '',
  picPhone: '',
  paymentTermId: undefined as number | undefined,
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  isActive: true,
})

// Validation schema — code field is optional in ADD+auto mode (generated server-side)
const resolver = computed(() =>
  zodResolver(
    z.object({
      code:
        props.mode === DialogMode.ADD && codeMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('suppliers.validation.codeRequired')),
      name: z.string().min(1, t('suppliers.validation.nameRequired')),
      npwp: z.string().min(1, t('suppliers.validation.npwpRequired')),
      address: z.string().min(1, t('suppliers.validation.addressRequired')),
      picName: z.string().min(1, t('suppliers.validation.picNameRequired')),
      picPhone: z.string().min(1, t('suppliers.validation.picPhoneRequired')),
      paymentTermId: z.number({
        required_error: t('suppliers.validation.paymentTermRequired'),
      }),
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankAccountHolderName: z.string().optional(),
      isActive: z.boolean(),
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
      await addSupplier(event)
    } else {
      await editSupplier(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addSupplier(event: FormSubmitEvent) {
  let code: string
  if (codeMode.value === 'auto' && numberSeriesId.value !== null) {
    const generated = await NumberSeriesService.generateNext(numberSeriesId.value)
    code = generated.code
  } else {
    code = event.states.code.value
  }

  await SuppliersService.create({
    code,
    name: event.states.name.value,
    npwp: event.states.npwp.value,
    address: event.states.address.value,
    picName: event.states.picName.value,
    picPhone: event.states.picPhone.value,
    paymentTermId: event.states.paymentTermId.value,
    bankName: event.states.bankName.value || undefined,
    bankAccountNumber: event.states.bankAccountNumber.value || undefined,
    bankAccountHolderName: event.states.bankAccountHolderName.value || undefined,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('suppliers.messages.supplierCreated'), toastGroup))
}

async function editSupplier(event: FormSubmitEvent) {
  await SuppliersService.update(props.supplier!.id, {
    code: event.states.code.value,
    name: event.states.name.value,
    npwp: event.states.npwp.value,
    address: event.states.address.value,
    picName: event.states.picName.value,
    picPhone: event.states.picPhone.value,
    paymentTermId: event.states.paymentTermId.value,
    bankName: event.states.bankName.value || undefined,
    bankAccountNumber: event.states.bankAccountNumber.value || undefined,
    bankAccountHolderName: event.states.bankAccountHolderName.value || undefined,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('suppliers.messages.supplierUpdated'), toastGroup))
}
</script>
