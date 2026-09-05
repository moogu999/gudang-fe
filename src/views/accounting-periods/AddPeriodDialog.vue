<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Message severity="info" :closable="false" class="mb-4 text-sm">
      {{ t('accountingPeriods.helpers.addPeriodHint') }}
    </Message>

    <Form
      ref="formRef"
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('accountingPeriods.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText id="name" name="name" autocomplete="off" class="w-full" />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="startDate" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('accountingPeriods.fields.startDate')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <DatePicker id="startDate" name="startDate" date-format="dd M yy" class="w-full" />
          <Message v-if="$form.startDate?.invalid" severity="error" size="small" variant="simple">{{
            $form.startDate.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="endDate" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('accountingPeriods.fields.endDate')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <DatePicker id="endDate" name="endDate" date-format="dd M yy" class="w-full" />
          <Message v-if="$form.endDate?.invalid" severity="error" size="small" variant="simple">{{
            $form.endDate.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex w-full flex-auto items-center gap-2">
          <Checkbox v-model="isYearEnd" input-id="isYearEnd" binary />
          <label for="isYearEnd" class="text-sm">{{ t('accountingPeriods.fields.yearEnd') }}</label>
        </div>
      </div>
      <p v-if="isYearEnd" class="text-surface-500 mb-4 text-xs">
        {{ t('accountingPeriods.helpers.yearEndCheckbox') }}
      </p>

      <div class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        />
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import { reactive, ref, computed } from 'vue'
import { FiscalYearsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'

const props = defineProps<{
  fiscalYearId: number
}>()

const emits = defineEmits(['close'])

const { t } = useI18n()
const toast = useToast()

const toastGroup = 'addPeriodDialog'
const formRef = ref()
const isLoading = ref(false)
const isYearEnd = ref(false)

const initialValues = reactive({
  name: '',
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z
      .object({
        name: z.string().min(1, t('accountingPeriods.validation.nameRequired')),
        startDate: z.date({ message: t('accountingPeriods.validation.startDateRequired') }),
        endDate: z.date({ message: t('accountingPeriods.validation.endDateRequired') }),
      })
      .refine((data) => !dayjs(data.endDate).isBefore(dayjs(data.startDate), 'day'), {
        message: t('accountingPeriods.validation.endAfterStart'),
        path: ['endDate'],
      }),
  ),
)

function handleClose() {
  emits('close')
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true
  try {
    await FiscalYearsService.addPeriod(props.fiscalYearId, {
      name: event.states.name.value,
      startDate: dayjs(event.states.startDate.value).format('YYYY-MM-DD'),
      endDate: dayjs(event.states.endDate.value).format('YYYY-MM-DD'),
      isYearEnd: isYearEnd.value,
    })
    toast.add(commonSuccessToast(t('accountingPeriods.messages.periodAdded'), toastGroup))
    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
