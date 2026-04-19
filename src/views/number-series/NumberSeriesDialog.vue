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
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
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
        <label for="prefix" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
          t('numberSeries.fields.prefix')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="prefix"
            name="prefix"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @input="onPrefixInput"
          />
          <Message v-if="$form.prefix?.invalid" severity="error" size="small" variant="simple">{{
            $form.prefix.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="separator" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
          t('numberSeries.fields.separator')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="separator"
            name="separator"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @input="onSeparatorInput"
          />
          <Message v-if="$form.separator?.invalid" severity="error" size="small" variant="simple">{{
            $form.separator.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="dateFormat" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
          t('numberSeries.fields.dateFormat')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Select
            id="dateFormat"
            name="dateFormat"
            :options="dateFormatOptions"
            option-label="label"
            option-value="value"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @change="onDateFormatChange"
          />
          <Message
            v-if="$form.dateFormat?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.dateFormat.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="padding" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
          t('numberSeries.fields.padding')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputNumber
            id="padding"
            name="padding"
            :min="1"
            :max="10"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @input="onPaddingInput"
          />
          <Message v-if="$form.padding?.invalid" severity="error" size="small" variant="simple">{{
            $form.padding.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="entityType" class="w-full text-sm font-semibold sm:text-base md:w-36">{{
          t('numberSeries.fields.entityType')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Select
            id="entityType"
            name="entityType"
            :options="entityTypeOptions"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            :disabled="mode === DialogMode.VIEW || mode === DialogMode.EDIT"
            class="w-full"
          />
          <Message
            v-if="$form.entityType?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.entityType.error.message }}</Message
          >
        </div>
      </div>

      <!-- Live Preview -->
      <div
        v-if="mode !== DialogMode.VIEW"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4"
      >
        <div class="w-full md:w-36"></div>
        <div
          class="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
        >
          {{ t('numberSeries.preview') }}:
          <span class="font-mono font-semibold">{{ preview }}</span>
        </div>
      </div>

      <div v-if="mode !== DialogMode.VIEW" class="flex justify-end gap-2">
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
      <div v-else class="flex justify-end gap-2">
        <Button type="button" :label="t('common.actions.close')" @click="handleClose"></Button>
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { NumberSeriesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { NumberSeries } from '@/types'

const { t } = useI18n()
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  numberSeries: {
    type: Object as PropType<NumberSeries>,
  },
})

const emits = defineEmits(['close'])

// Toast
const toastGroup = 'numberSeriesDialog'
const toast = useToast()

// Form initial values
const initialValues = reactive({
  name: '',
  prefix: '',
  separator: '-',
  dateFormat: '',
  padding: 3,
  entityType: '',
})

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    const result = await NumberSeriesService.list()
    takenEntityTypes.value = new Set(result.data.map((s) => s.entityType))
    return
  }

  if (!props.numberSeries) {
    return
  }

  initialValues.name = props.numberSeries.name
  initialValues.prefix = props.numberSeries.prefix
  initialValues.separator = props.numberSeries.separator
  initialValues.dateFormat = props.numberSeries.dateFormat
  initialValues.padding = props.numberSeries.padding
  initialValues.entityType = props.numberSeries.entityType

  previewPrefix.value = props.numberSeries.prefix
  previewSeparator.value = props.numberSeries.separator
  previewDateFormat.value = props.numberSeries.dateFormat
  previewPadding.value = props.numberSeries.padding
})

// Dropdown options
const dateFormatOptions = computed(() => [
  { label: t('numberSeries.dateFormats.none'), value: '' },
  { label: t('numberSeries.dateFormats.yyyy'), value: 'YYYY' },
  { label: t('numberSeries.dateFormats.yyyymm'), value: 'YYYYMM' },
  { label: t('numberSeries.dateFormats.yymm'), value: 'YYMM' },
])

const takenEntityTypes = ref<Set<string>>(new Set())

const entityTypeOptions = computed(() => [
  {
    label: t('numberSeries.entityTypes.products'),
    value: 'products',
    disabled: takenEntityTypes.value.has('products'),
  },
  {
    label: t('numberSeries.entityTypes.customers'),
    value: 'customers',
    disabled: takenEntityTypes.value.has('customers'),
  },
])

// Live preview (client-side only)
const previewPrefix = ref(initialValues.prefix)
const previewSeparator = ref(initialValues.separator)
const previewDateFormat = ref(initialValues.dateFormat)
const previewPadding = ref(initialValues.padding)

function onPrefixInput(e: Event) {
  previewPrefix.value = (e.target as HTMLInputElement).value
}

function onSeparatorInput(e: Event) {
  previewSeparator.value = (e.target as HTMLInputElement).value
}

function onDateFormatChange(e: { value: string }) {
  previewDateFormat.value = e.value
}

function onPaddingInput(e: { value: string | number | undefined }) {
  if (typeof e.value === 'number') {
    previewPadding.value = e.value
  }
}

function formatDatePart(format: string): string {
  if (!format) return ''
  const now = new Date()
  const y = now.getFullYear().toString()
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  switch (format) {
    case 'YYYY':
      return y
    case 'YYYYMM':
      return y + m
    case 'YYMM':
      return y.slice(-2) + m
    default:
      return ''
  }
}

const preview = computed(() => {
  const parts: string[] = [previewPrefix.value || 'PREFIX']
  const datePart = formatDatePart(previewDateFormat.value)
  if (datePart) parts.push(datePart)
  parts.push('1'.padStart(previewPadding.value || 3, '0'))
  return parts.join(previewSeparator.value || '-')
})

// Validation schema
const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('numberSeries.validation.nameRequired')),
      prefix: z.string().min(1, t('numberSeries.validation.prefixRequired')),
      separator: z.string().min(1, t('numberSeries.validation.separatorRequired')),
      dateFormat: z.string(),
      padding: z
        .number()
        .min(1, t('numberSeries.validation.paddingRange'))
        .max(10, t('numberSeries.validation.paddingRange')),
      entityType: z.string().min(1, t('numberSeries.validation.entityTypeRequired')),
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
      await addNumberSeries(event)
    } else {
      await editNumberSeries(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addNumberSeries(event: FormSubmitEvent) {
  await NumberSeriesService.create({
    name: event.states.name.value,
    prefix: event.states.prefix.value,
    separator: event.states.separator.value,
    dateFormat: event.states.dateFormat.value,
    padding: event.states.padding.value,
    entityType: event.states.entityType.value,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('numberSeries.messages.created'), toastGroup))
}

async function editNumberSeries(event: FormSubmitEvent) {
  await NumberSeriesService.update(props.numberSeries!.id, {
    name: event.states.name.value,
    prefix: event.states.prefix.value,
    separator: event.states.separator.value,
    dateFormat: event.states.dateFormat.value,
    padding: event.states.padding.value,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('numberSeries.messages.updated'), toastGroup))
}
</script>
