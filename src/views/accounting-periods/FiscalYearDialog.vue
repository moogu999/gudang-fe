<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Message v-if="isFrozen" severity="warn" :closable="false" class="mb-4 text-sm">
      {{ t('accountingPeriods.helpers.frozen') }}
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
          <InputText id="name" name="name" autocomplete="off" :disabled="isFrozen" class="w-full" />
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
          <DatePicker
            id="startDate"
            name="startDate"
            date-format="dd M yy"
            :disabled="isFrozen"
            class="w-full"
            @update:model-value="onStartDateUpdate"
          />
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
          <DatePicker
            id="endDate"
            name="endDate"
            date-format="dd M yy"
            :disabled="isFrozen"
            class="w-full"
            @update:model-value="onEndDateUpdate"
          />
          <Message v-if="$form.endDate?.invalid" severity="error" size="small" variant="simple">{{
            $form.endDate.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('accountingPeriods.fields.generationMode')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-2">
          <SelectButton
            :model-value="generationMode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="isFrozen"
            @update:model-value="onModeUpdate"
          />
        </div>
      </div>

      <div v-if="generationMode === 'MONTHLY'" class="mb-4">
        <p class="text-surface-500 mb-2 text-sm">
          {{ t('accountingPeriods.labels.periodsWillBeCreated', { n: monthlyPreview.length }) }}
        </p>
        <div class="w-full overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left">
                <th class="pb-2">{{ t('accountingPeriods.fields.name') }}</th>
                <th class="pb-2">{{ t('accountingPeriods.fields.startDate') }}</th>
                <th class="pb-2">{{ t('accountingPeriods.fields.endDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in monthlyPreview" :key="i" class="border-surface-200 border-t">
                <td class="py-1">{{ row.name }}</td>
                <td class="py-1 font-mono">{{ formatDraftDate(row.startDate) }}</td>
                <td class="py-1 font-mono">{{ formatDraftDate(row.endDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="mb-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-surface-500 text-sm">{{ t('accountingPeriods.helpers.customEditor') }}</p>
          <Button
            type="button"
            :label="t('accountingPeriods.labels.prefillMonthly')"
            severity="secondary"
            text
            size="small"
            :disabled="isFrozen"
            @click="prefillFromMonthly"
          />
        </div>

        <div
          v-for="(row, i) in customRows"
          :key="i"
          class="border-surface-200 mb-2 flex flex-col gap-2 rounded border p-2 sm:flex-row sm:items-start"
        >
          <InputText
            v-model="row.name"
            :placeholder="t('accountingPeriods.fields.name')"
            class="w-full sm:w-1/3"
            :disabled="isFrozen"
          />
          <DatePicker
            v-model="row.startDate"
            date-format="dd M yy"
            :placeholder="t('accountingPeriods.fields.startDate')"
            class="w-full sm:w-1/3"
            :disabled="isFrozen"
          />
          <DatePicker
            v-model="row.endDate"
            date-format="dd M yy"
            :placeholder="t('accountingPeriods.fields.endDate')"
            class="w-full sm:w-1/3"
            :disabled="isFrozen"
          />
          <Button
            type="button"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :disabled="isFrozen"
            :aria-label="t('accountingPeriods.labels.removeRow')"
            class="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            @click="removeRow(i)"
          />
          <div v-if="issuesFor(i).length > 0" class="flex w-full flex-col gap-1">
            <Message
              v-for="(issue, k) in issuesFor(i)"
              :key="k"
              severity="error"
              size="small"
              variant="simple"
              >{{ issueMessage(issue) }}</Message
            >
          </div>
        </div>

        <Message
          v-for="(issue, k) in wholeScheduleIssues"
          :key="k"
          severity="error"
          size="small"
          variant="simple"
          class="mb-2 block"
          >{{ issueMessage(issue) }}</Message
        >

        <Button
          type="button"
          :label="t('accountingPeriods.labels.addRow')"
          severity="secondary"
          outlined
          size="small"
          :disabled="isFrozen"
          @click="addRow"
        />
      </div>

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
          :disabled="
            isLoading || isFrozen || (generationMode === 'CUSTOM' && scheduleIssues.length > 0)
          "
        />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import { onBeforeMount, reactive, ref, computed, type PropType } from 'vue'
import { FiscalYearsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import { generateMonthlyDrafts, validateDrafts, type ScheduleIssue } from './periodSchedule'
import type { FiscalYearDetail, GenerationMode, PeriodDraft } from '@/types'

const { t } = useI18n()
const toast = useToast()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  companyId: {
    type: Number,
    required: true,
  },
  fiscalYear: {
    type: Object as PropType<FiscalYearDetail>,
  },
})

const emits = defineEmits(['close'])

const toastGroup = 'fiscalYearDialog'
const formRef = ref()
const isLoading = ref(false)

// ---------------------------------------------------------------------------
// Reactive mirrors of form-bound fields, used for cascading UI logic.
// generationMode stays out of Form registration entirely (SelectButton
// programmatic-write gotcha, see FiscalYearDialog gotchas); startDate/endDate
// stay registered with the Form (for validation) but are also mirrored here
// so the monthly preview and custom-schedule validation can react to them
// from script, not just the template.
// ---------------------------------------------------------------------------

const generationMode = ref<GenerationMode>('MONTHLY')
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const customRows = ref<PeriodDraft[]>([])

const modeOptions = computed(() => [
  { label: t('accountingPeriods.modes.monthly'), value: 'MONTHLY' },
  { label: t('accountingPeriods.modes.custom'), value: 'CUSTOM' },
])

// The schedule freezes once any period in it has left UPCOMING (backend
// decision 10) — edit is unavailable client-side rather than letting the
// user fill in the form and meet a 409 on submit.
const isFrozen = computed(
  () =>
    props.mode !== DialogMode.ADD &&
    (props.fiscalYear?.periods ?? []).some((p) => p.status !== 'UPCOMING'),
)

const initialValues = reactive({
  name: '',
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
})

onBeforeMount(() => {
  if (props.mode === DialogMode.ADD || !props.fiscalYear) {
    return
  }

  const fy = props.fiscalYear

  initialValues.name = fy.name
  initialValues.startDate = new Date(fy.startDate)
  initialValues.endDate = new Date(fy.endDate)
  startDate.value = initialValues.startDate
  endDate.value = initialValues.endDate
  generationMode.value = fy.generationMode

  if (fy.generationMode === 'CUSTOM') {
    customRows.value = (fy.periods ?? []).map((p) => ({
      name: p.name,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
    }))
  }
})

function onStartDateUpdate(value: unknown) {
  startDate.value = value instanceof Date ? value : null
}

function onEndDateUpdate(value: unknown) {
  endDate.value = value instanceof Date ? value : null
}

function onModeUpdate(value: GenerationMode) {
  generationMode.value = value
}

// ---------------------------------------------------------------------------
// Schedule preview / editor
// ---------------------------------------------------------------------------

const monthlyPreview = computed(() => {
  if (!startDate.value || !endDate.value) {
    return []
  }
  return generateMonthlyDrafts(startDate.value, endDate.value)
})

const scheduleIssues = computed(() => {
  if (!startDate.value || !endDate.value) {
    return []
  }
  return validateDrafts(customRows.value, startDate.value, endDate.value)
})

function issuesFor(index: number): ScheduleIssue[] {
  return scheduleIssues.value.filter((issue) => issue.index === index)
}

const wholeScheduleIssues = computed(() =>
  scheduleIssues.value.filter((issue) => issue.index === -1),
)

function issueMessage(issue: ScheduleIssue): string {
  return t(issue.messageKey, issue.params ?? {})
}

function formatDraftDate(d: Date | null): string {
  return d ? dayjs(d).format('DD MMM YYYY') : ''
}

function addRow() {
  customRows.value.push({ name: '', startDate: null, endDate: null })
}

function removeRow(index: number) {
  customRows.value.splice(index, 1)
}

function prefillFromMonthly() {
  if (!startDate.value || !endDate.value) {
    return
  }
  customRows.value = generateMonthlyDrafts(startDate.value, endDate.value)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

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
  if (generationMode.value === 'CUSTOM' && scheduleIssues.value.length > 0) {
    return
  }

  isLoading.value = true
  try {
    const name = event.states.name.value
    const start = dayjs(event.states.startDate.value).format('YYYY-MM-DD')
    const end = dayjs(event.states.endDate.value).format('YYYY-MM-DD')
    const periods =
      generationMode.value === 'CUSTOM'
        ? customRows.value.map((d) => ({
            name: d.name,
            startDate: dayjs(d.startDate!).format('YYYY-MM-DD'),
            endDate: dayjs(d.endDate!).format('YYYY-MM-DD'),
          }))
        : undefined

    if (props.mode === DialogMode.ADD) {
      await FiscalYearsService.create({
        companyId: props.companyId,
        name,
        startDate: start,
        endDate: end,
        generationMode: generationMode.value,
        periods,
      })
      toast.add(commonSuccessToast(t('accountingPeriods.messages.created'), toastGroup))
    } else {
      await FiscalYearsService.update(props.fiscalYear!.id, {
        name,
        startDate: start,
        endDate: end,
        generationMode: generationMode.value,
        periods,
      })
      toast.add(commonSuccessToast(t('accountingPeriods.messages.updated'), toastGroup))
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
