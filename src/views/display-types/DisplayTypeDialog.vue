<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="displayTypeCode" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
        t('displayTypes.fields.code')
      }}</label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputText
          id="displayTypeCode"
          :model-value="code"
          autocomplete="off"
          maxlength="10"
          :disabled="isView"
          :invalid="!!errors.code"
          class="w-full font-mono"
          data-testid="type-code"
          @update:model-value="onCodeInput"
        />
        <small class="text-surface-500">{{ t('displayTypes.fields.codeHint') }}</small>
        <Message v-if="errors.code" severity="error" size="small" variant="simple">{{
          errors.code
        }}</Message>
      </div>
    </div>

    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="displayTypeName" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
        t('displayTypes.fields.name')
      }}</label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputText
          id="displayTypeName"
          v-model="name"
          autocomplete="off"
          maxlength="100"
          :disabled="isView"
          :invalid="!!errors.name"
          class="w-full"
          data-testid="type-name"
        />
        <Message v-if="errors.name" severity="error" size="small" variant="simple">{{
          errors.name
        }}</Message>
      </div>
    </div>

    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label for="displayTypeMinPhotos" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
        t('displayTypes.fields.minPhotos')
      }}</label>
      <div class="flex w-full flex-auto flex-col gap-1">
        <InputNumber
          v-model="minPhotos"
          input-id="displayTypeMinPhotos"
          :min="MIN_PHOTOS_MIN"
          :max="MIN_PHOTOS_MAX"
          :use-grouping="false"
          show-buttons
          :disabled="isView"
          :invalid="!!errors.minPhotos"
          class="w-full"
          data-testid="type-min-photos"
        />
        <small class="text-surface-500">{{ t('displayTypes.fields.minPhotosHint') }}</small>
        <Message v-if="errors.minPhotos" severity="error" size="small" variant="simple">{{
          errors.minPhotos
        }}</Message>
      </div>
    </div>

    <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
      <label
        for="displayTypeDescription"
        class="w-full text-sm font-semibold sm:text-base md:w-40"
        >{{ t('displayTypes.fields.description') }}</label
      >
      <div class="flex w-full flex-auto flex-col gap-1">
        <Textarea
          id="displayTypeDescription"
          v-model="description"
          rows="3"
          maxlength="500"
          auto-resize
          :disabled="isView"
          class="w-full"
        />
        <small class="text-surface-500 self-end">{{ description.length }}/500</small>
      </div>
    </div>

    <div
      v-if="mode !== DialogMode.ADD"
      class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
    >
      <label for="displayTypeActive" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
        t('displayTypes.fields.active')
      }}</label>
      <div class="flex w-full flex-auto items-start gap-3">
        <ToggleSwitch v-model="isActive" input-id="displayTypeActive" :disabled="isView" />
        <small class="text-surface-500">{{ t('displayTypes.fields.activeHint') }}</small>
      </div>
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
        type="button"
        :label="!isLoading ? t('common.actions.save') : ''"
        :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
        :disabled="isLoading"
        data-testid="type-save"
        @click="onSubmit"
      />
    </div>
    <div v-else class="flex justify-end gap-2">
      <Button type="button" :label="t('common.actions.close')" @click="emits('close', false)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { DisplayTypesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type { DisplayType, DisplayTypePayload } from '@/types'
import { displayTypeErrorField, displayTypeErrorKey } from './displayTypeErrors'

const MIN_PHOTOS_MIN = 1
const MIN_PHOTOS_MAX = 10
const CODE_PATTERN = /^[A-Z0-9_-]{1,10}$/

const { t } = useI18n()

const props = defineProps({
  mode: { type: String as PropType<DialogMode>, default: DialogMode.ADD },
  displayType: { type: Object as PropType<DisplayType> },
})

const emits = defineEmits<{ close: [saved: boolean, displayType?: DisplayType] }>()

const toastGroup = 'displayTypeDialog'
const toast = useToast()

const isView = computed(() => props.mode === DialogMode.VIEW)
const editing = props.mode !== DialogMode.ADD ? props.displayType : undefined

const code = ref(editing?.code ?? '')
const name = ref(editing?.name ?? '')
const minPhotos = ref<number | null>(editing?.minPhotos ?? 1)
const description = ref(editing?.description ?? '')
const isActive = ref(editing?.isActive ?? true)

const errors = ref<{ code?: string; name?: string; minPhotos?: string }>({})
const isLoading = ref(false)

/** Codes are stored uppercase; showing them that way as they are typed avoids a surprise on save. */
function onCodeInput(value: string | undefined) {
  code.value = (value ?? '').toUpperCase()
}

function validate(): boolean {
  const next: typeof errors.value = {}
  const trimmed = code.value.trim()
  if (!trimmed) next.code = t('displayTypes.validation.codeRequired')
  else if (!CODE_PATTERN.test(trimmed)) next.code = t('displayTypes.validation.codeInvalid')
  if (!name.value.trim()) next.name = t('displayTypes.validation.nameRequired')
  else if (name.value.trim().length > 100) next.name = t('displayTypes.validation.nameTooLong')
  if (
    minPhotos.value === null ||
    minPhotos.value < MIN_PHOTOS_MIN ||
    minPhotos.value > MIN_PHOTOS_MAX
  ) {
    next.minPhotos = t('displayTypes.validation.minPhotosRange', {
      min: MIN_PHOTOS_MIN,
      max: MIN_PHOTOS_MAX,
    })
  }
  errors.value = next
  return Object.keys(next).length === 0
}

function buildPayload(): DisplayTypePayload {
  const text = description.value.trim()
  return {
    code: code.value.trim().toUpperCase(),
    name: name.value.trim(),
    minPhotos: minPhotos.value as number,
    ...(text ? { description: text } : {}),
    isActive: isActive.value,
  }
}

async function onSubmit() {
  if (!validate()) return
  isLoading.value = true
  try {
    const payload = buildPayload()
    let saved: DisplayType
    if (props.mode === DialogMode.ADD) {
      saved = await DisplayTypesService.create(payload)
      toast.add(commonSuccessToast(t('displayTypes.messages.created'), toastGroup))
    } else {
      saved = await DisplayTypesService.update(props.displayType!.id, payload)
      toast.add(commonSuccessToast(t('displayTypes.messages.updated'), toastGroup))
    }
    emits('close', true, saved)
  } catch (e) {
    const key = displayTypeErrorKey(e)
    const field = displayTypeErrorField(e)
    if (key && field) errors.value = { ...errors.value, [field]: t(key) }
    else toast.add(commonErrorToast(key ? t(key) : e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

defineExpose({ code, name, minPhotos, buildPayload, validate, errors })
</script>
