<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form v-slot="$form" :initial-values="initialValues" :resolver="resolver" @submit="onFormSubmit">
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('competitorBrands.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="name"
            name="name"
            autocomplete="off"
            maxlength="100"
            :disabled="isView"
            class="w-full"
          />
          <small class="text-surface-500 self-end">{{ lengthOf($form.name?.value) }}/100</small>
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
          <Message v-if="nameError" severity="error" size="small" variant="simple">{{
            nameError
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="manufacturer" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('competitorBrands.fields.manufacturer')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="manufacturer"
            name="manufacturer"
            autocomplete="off"
            maxlength="150"
            :disabled="isView"
            class="w-full"
          />
          <Message
            v-if="$form.manufacturer?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.manufacturer.error.message }}</Message
          >
        </div>
      </div>

      <div
        v-if="mode !== DialogMode.ADD"
        class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4"
      >
        <label for="isActive" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('competitorBrands.fields.active')
        }}</label>
        <div class="flex w-full flex-auto items-start gap-3">
          <ToggleSwitch v-model="isActive" input-id="isActive" :disabled="isView" />
          <small class="text-surface-500">{{ t('competitorBrands.fields.activeHint') }}</small>
        </div>
      </div>

      <div
        v-if="mode === DialogMode.EDIT && brand?.updatedByName && brand.updatedAt"
        class="text-surface-500 mb-4 text-sm"
      >
        {{
          t('competitorBrands.fields.lastChanged', {
            name: brand.updatedByName,
            date: dayjs(brand.updatedAt).format(DateFormat.DATE_TIME),
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
import { computed, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { CompetitorBrandsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import type { CompetitorBrand } from '@/types'
import { competitorBrandErrorCode, competitorBrandErrorKey } from './competitorBrandErrors'

const { t } = useI18n()

const props = defineProps({
  mode: { type: String as PropType<DialogMode>, default: DialogMode.ADD },
  brand: { type: Object as PropType<CompetitorBrand> },
})

// `brand` is the saved record, so a host that creates inline (the product form)
// can select it straight away.
const emits = defineEmits<{ close: [saved: boolean, brand?: CompetitorBrand] }>()

const toastGroup = 'competitorBrandDialog'
const toast = useToast()

const isView = computed(() => props.mode === DialogMode.VIEW)
const editing = props.mode !== DialogMode.ADD ? props.brand : undefined
const isActive = ref(editing?.isActive ?? true)

const initialValues = {
  name: editing?.name ?? '',
  manufacturer: editing?.manufacturer ?? '',
}

const resolver = zodResolver(
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('competitorBrands.validation.nameRequired'))
      .max(100, t('competitorBrands.validation.nameTooLong')),
    manufacturer: z
      .string()
      .trim()
      .max(150, t('competitorBrands.validation.manufacturerTooLong'))
      .optional(),
  }),
)

function lengthOf(value: unknown): number {
  return typeof value === 'string' ? value.length : 0
}

const nameError = ref('')
const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  nameError.value = ''
  isLoading.value = true
  try {
    const manufacturer = String(event.states.manufacturer.value ?? '').trim()
    const payload = {
      name: String(event.states.name.value).trim(),
      ...(manufacturer ? { manufacturer } : {}),
    }
    let saved: CompetitorBrand
    if (props.mode === DialogMode.ADD) {
      saved = await CompetitorBrandsService.create(payload)
      toast.add(commonSuccessToast(t('competitorBrands.messages.created'), toastGroup))
    } else {
      saved = await CompetitorBrandsService.update(props.brand!.id, {
        ...payload,
        isActive: isActive.value,
      })
      toast.add(commonSuccessToast(t('competitorBrands.messages.updated'), toastGroup))
    }
    emits('close', true, saved)
  } catch (e) {
    const key = competitorBrandErrorKey(e)
    if (competitorBrandErrorCode(e) === 'name_duplicate') nameError.value = t(key!)
    else toast.add(commonErrorToast(key ? t(key) : e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
