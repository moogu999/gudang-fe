<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <!-- Type -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="type" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.type')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Select
            v-model="type"
            input-id="type"
            :options="typeOptions"
            option-label="label"
            option-value="key"
            :disabled="mode !== DialogMode.ADD"
            class="w-full"
          />
          <small v-if="mode === DialogMode.EDIT" class="text-surface-500">
            <i class="pi pi-lock mr-1" />{{ t('reasons.fields.typeLockedHint') }}
          </small>
          <Message severity="info" size="small" variant="simple" class="mt-1">
            {{ t(`reasons.types.${type}.trigger`) }}<br />
            {{ t(`reasons.types.${type}.impact`) }}
          </Message>
        </div>
      </div>

      <!-- Code -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="code" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.code')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('reasons.codeMode.auto')"
              :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasSeries || previewLoading"
              @click="codeMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('reasons.codeMode.manual')"
              :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="codeMode = 'manual'"
            />
          </div>
          <div v-if="mode === DialogMode.ADD && codeMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="previewLoading ? '' : previewCode"
              :placeholder="previewLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full font-mono"
            />
            <small class="text-surface-500">{{ t('reasons.hints.codeAssignedOnSave') }}</small>
          </div>
          <template v-else>
            <InputText
              id="code"
              name="code"
              autocomplete="off"
              maxlength="32"
              :disabled="mode !== DialogMode.ADD"
              class="w-full font-mono"
            />
            <small v-if="mode === DialogMode.ADD" class="text-surface-500">{{
              t('reasons.hints.codeManual')
            }}</small>
          </template>
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
          <Message v-if="codeError" severity="error" size="small" variant="simple">{{
            codeError
          }}</Message>
        </div>
      </div>

      <!-- Name -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="name"
            name="name"
            autocomplete="off"
            maxlength="40"
            :disabled="isView"
            class="w-full"
          />
          <small class="text-surface-500 self-end">{{ nameLength($form.name?.value) }}/40</small>
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
          <Message v-if="nameError" severity="error" size="small" variant="simple">{{
            nameError
          }}</Message>
        </div>
      </div>

      <!-- Employee types -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <span class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.employeeTypes')
        }}</span>
        <div class="flex w-full flex-auto flex-col gap-2">
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="forTakingOrder"
                input-id="forTakingOrder"
                binary
                :disabled="isView"
              />
              <label for="forTakingOrder">{{ t('reasons.employeeTypes.salesman') }}</label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="forCanvass" input-id="forCanvass" binary :disabled="isView" />
              <label for="forCanvass">{{ t('reasons.employeeTypes.canvass') }}</label>
            </div>
          </div>
          <small class="text-surface-500">{{ t('reasons.hints.employeeTypes') }}</small>
          <Message v-if="modesError" severity="error" size="small" variant="simple">{{
            modesError
          }}</Message>
        </div>
      </div>

      <!-- Default stock type (return only) -->
      <div
        v-if="type === 'return'"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
      >
        <span class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.defaultStockType')
        }}</span>
        <div class="flex w-full flex-auto flex-col gap-2">
          <div class="flex flex-wrap gap-4">
            <div v-for="st in stockTypeOptions" :key="st" class="flex items-center gap-2">
              <RadioButton
                v-model="defaultStockType"
                :input-id="`stock-${st}`"
                name="defaultStockType"
                :value="st"
                :disabled="isView"
              />
              <label :for="`stock-${st}`">{{ t(`reasons.stockTypes.${st}`) }}</label>
            </div>
          </div>
          <small class="text-surface-500">{{ t('reasons.hints.stockTypeExample') }}</small>
          <Message v-if="stockTypeError" severity="error" size="small" variant="simple">{{
            stockTypeError
          }}</Message>
        </div>
      </div>

      <!-- Flags -->
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="requiresPhoto" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.requiresPhoto')
        }}</label>
        <div class="flex w-full flex-auto items-start gap-3">
          <ToggleSwitch v-model="requiresPhoto" input-id="requiresPhoto" :disabled="isView" />
          <small class="text-surface-500">{{ t('reasons.fields.requiresPhotoHint') }}</small>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="requiresNote" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.requiresNote')
        }}</label>
        <div class="flex w-full flex-auto items-start gap-3">
          <ToggleSwitch v-model="requiresNote" input-id="requiresNote" :disabled="isView" />
          <small class="text-surface-500">{{ t('reasons.fields.requiresNoteHint') }}</small>
        </div>
      </div>

      <!-- Active (existing reasons only) -->
      <div
        v-if="mode !== DialogMode.ADD"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
      >
        <label for="isActive" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('reasons.fields.active')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <div class="flex items-start gap-3">
            <ToggleSwitch v-model="isActive" input-id="isActive" :disabled="isView" />
            <small class="text-surface-500">{{ t('reasons.fields.activeHint') }}</small>
          </div>
          <Message v-if="activeError" severity="error" size="small" variant="simple">{{
            activeError
          }}</Message>
        </div>
      </div>

      <div
        v-if="mode === DialogMode.EDIT && reason?.updatedByName && reason.updatedAt"
        class="text-surface-500 mb-4 text-sm"
      >
        {{
          t('reasons.fields.lastChanged', {
            name: reason.updatedByName,
            date: dayjs(reason.updatedAt).format(DateFormat.DATE_TIME),
          })
        }}
      </div>

      <div v-if="!isView" class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emits('close', false)"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        />
      </div>
      <div v-else class="flex justify-end gap-2">
        <Button type="button" :label="t('common.actions.close')" @click="emits('close', false)" />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import RadioButton from 'primevue/radiobutton'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { NumberSeriesService, ReasonsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import { REASON_TYPES, type Reason, type ReasonStockType, type ReasonType } from '@/types'
import { reasonErrorCode, reasonErrorKey } from './reasonErrors'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  reason: {
    type: Object as PropType<Reason>,
  },
  initialType: {
    type: String as PropType<ReasonType>,
    default: REASON_TYPES[0].key,
  },
})

const emits = defineEmits<{ close: [saved: boolean] }>()

const toastGroup = 'reasonDialog'
const toast = useToast()

const isView = computed(() => props.mode === DialogMode.VIEW)
const stockTypeOptions: ReasonStockType[] = ['good', 'bad']

const editing = props.mode !== DialogMode.ADD ? props.reason : undefined

// Fields the PrimeVue Form doesn't own: selects, radios, toggles and the
// cross-field checks are plain refs, validated in onFormSubmit.
const type = ref<ReasonType>(editing?.type ?? props.initialType)
const forTakingOrder = ref(editing?.forTakingOrder ?? true)
const forCanvass = ref(editing?.forCanvass ?? true)
const requiresPhoto = ref(editing?.requiresPhoto ?? false)
const requiresNote = ref(editing?.requiresNote ?? false)
const isActive = ref(editing?.isActive ?? true)
const defaultStockType = ref<ReasonStockType | undefined>(editing?.defaultStockType)

const initialValues = {
  code: editing?.code ?? '',
  name: editing?.name ?? '',
}

const typeOptions = computed(() =>
  REASON_TYPES.map((rt) => ({ key: rt.key, label: t(`reasons.types.${rt.key}.label`) })),
)

// Auto code: one number series per type, so the preview follows the type.
const codeMode = ref<'auto' | 'manual'>('manual')
const previewCode = ref('')
const previewLoading = ref(false)
const hasSeries = ref(false)

async function loadPreview() {
  if (props.mode !== DialogMode.ADD) return
  const forType = type.value
  previewLoading.value = true
  try {
    const result = await NumberSeriesService.preview(`reasons.${forType}`)
    if (forType !== type.value) return
    previewCode.value = result.code
    hasSeries.value = true
    if (codeMode.value === 'manual' && !previewTouched) codeMode.value = 'auto'
  } catch {
    if (forType !== type.value) return
    previewCode.value = ''
    hasSeries.value = false
    codeMode.value = 'manual'
  } finally {
    if (forType === type.value) previewLoading.value = false
  }
}

// The first successful preview selects Auto; after that the user's choice sticks.
let previewTouched = false
watch(codeMode, () => {
  if (!previewLoading.value) previewTouched = true
})

loadPreview()

watch(type, (next) => {
  if (next !== 'return') defaultStockType.value = undefined
  stockTypeError.value = ''
  loadPreview()
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      code:
        props.mode === DialogMode.ADD && codeMode.value === 'auto'
          ? z.string().optional()
          : props.mode === DialogMode.ADD
            ? z
                .string()
                .trim()
                .min(1, t('reasons.validation.codeRequired'))
                .max(32, t('reasons.validation.codeTooLong'))
            : z.string().optional(),
      name: z
        .string()
        .trim()
        .min(1, t('reasons.validation.nameRequired'))
        .max(40, t('reasons.validation.nameTooLong')),
    }),
  ),
)

function nameLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0
}

const codeError = ref('')
const nameError = ref('')
const modesError = ref('')
const stockTypeError = ref('')
const activeError = ref('')

function clearServerErrors() {
  codeError.value = ''
  nameError.value = ''
  activeError.value = ''
}

watch([forTakingOrder, forCanvass], () => {
  if (forTakingOrder.value || forCanvass.value) modesError.value = ''
})
watch(defaultStockType, () => {
  if (defaultStockType.value) stockTypeError.value = ''
})

function validateLocal(): boolean {
  modesError.value =
    forTakingOrder.value || forCanvass.value ? '' : t('reasons.validation.noEmployeeType')
  stockTypeError.value =
    type.value === 'return' && !defaultStockType.value
      ? t('reasons.validation.stockTypeRequired')
      : ''
  return !modesError.value && !stockTypeError.value
}

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  const localOk = validateLocal()
  if (!event.valid || !localOk) return

  clearServerErrors()
  isLoading.value = true

  try {
    const name = String(event.states.name.value).trim()
    const common = {
      name,
      forTakingOrder: forTakingOrder.value,
      forCanvass: forCanvass.value,
      requiresPhoto: requiresPhoto.value,
      requiresNote: requiresNote.value,
      ...(type.value === 'return' ? { defaultStockType: defaultStockType.value } : {}),
    }

    if (props.mode === DialogMode.ADD) {
      const code = codeMode.value === 'manual' ? String(event.states.code.value).trim() : ''
      await ReasonsService.create({ type: type.value, ...(code ? { code } : {}), ...common })
      toast.add(commonSuccessToast(t('reasons.messages.created'), toastGroup))
    } else {
      await ReasonsService.update(props.reason!.id, { ...common, isActive: isActive.value })
      toast.add(commonSuccessToast(t('reasons.messages.updated'), toastGroup))
    }

    emits('close', true)
  } catch (e) {
    handleSaveError(e)
  } finally {
    isLoading.value = false
  }
}

function handleSaveError(e: unknown) {
  const key = reasonErrorKey(e)
  const message = key ? t(key) : undefined
  switch (reasonErrorCode(e)) {
    case 'code_duplicate':
      codeError.value = message!
      return
    case 'name_duplicate':
      nameError.value = message!
      return
    case 'last_active_reason':
      if (isActive.value) modesError.value = message!
      else activeError.value = message!
      toast.add(commonErrorToast(message!, toastGroup))
      return
    default:
      toast.add(commonErrorToast(message ?? e, toastGroup))
  }
}
</script>
