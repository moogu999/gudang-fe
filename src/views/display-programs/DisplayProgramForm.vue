<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="flex flex-col gap-6 lg:col-span-2">
        <ResponsiveCard>
          <template #content>
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
                <!-- Code -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">{{ t('displayPrograms.form.code') }}</label>
                  <template v-if="mode === 'add'">
                    <div class="mb-1 flex gap-2">
                      <Button
                        type="button"
                        :label="t('displayPrograms.form.codeAuto')"
                        :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                        size="small"
                        :disabled="!hasDefaultSeries || numberSeriesLoading"
                        @click="codeMode = 'auto'"
                      />
                      <Button
                        type="button"
                        :label="t('displayPrograms.form.codeManual')"
                        :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
                        size="small"
                        @click="codeMode = 'manual'"
                      />
                    </div>
                    <template v-if="codeMode === 'auto'">
                      <InputText
                        :value="numberSeriesLoading ? '' : previewCode"
                        :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
                        readonly
                        class="w-full font-mono"
                      />
                      <small class="text-surface-500">{{
                        t('displayPrograms.form.codeAssignedOnSave')
                      }}</small>
                    </template>
                    <InputText
                      v-else
                      v-model="code"
                      autocomplete="off"
                      maxlength="32"
                      class="w-full font-mono"
                      :invalid="!!errors.code"
                      data-testid="code-input"
                    />
                  </template>
                  <InputText v-else :value="program?.code" readonly class="w-full font-mono" />
                  <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
                </div>

                <!-- Branch -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">
                    {{ t('displayPrograms.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <InfiniteSelect
                    v-if="mode === 'add'"
                    v-model="branchId"
                    :fetch-fn="fetchBranches"
                    :option-label="branchLabel"
                    option-value="id"
                    :placeholder="t('displayPrograms.form.selectBranch')"
                    class="w-full"
                  />
                  <InputText v-else :value="program?.branch.name" readonly class="w-full" />
                  <small v-if="errors.branchId" class="text-red-500">{{ errors.branchId }}</small>
                </div>

                <!-- Name -->
                <div class="flex flex-col gap-1 md:col-span-2">
                  <label class="text-sm font-semibold">
                    {{ t('displayPrograms.form.name') }}<span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <InputText
                    v-model="name"
                    maxlength="100"
                    :disabled="readonly"
                    :invalid="!!errors.name"
                    class="w-full"
                    data-testid="name-input"
                  />
                  <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
                </div>

                <!-- Principal -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">{{
                    t('displayPrograms.form.principal')
                  }}</label>
                  <Select
                    v-model="principalOptionId"
                    :options="principalOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('displayPrograms.form.internalPlaceholder')"
                    :disabled="readonly || locks.principal"
                    show-clear
                    filter
                    class="w-full"
                    data-testid="principal-select"
                  />
                  <small v-if="mode === 'edit' && locks.principal" class="text-surface-500">{{
                    t('displayPrograms.form.principalLocked')
                  }}</small>
                  <small v-else class="text-surface-500">{{
                    t('displayPrograms.form.principalHint')
                  }}</small>
                </div>

                <!-- Display type -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">
                    {{ t('displayPrograms.form.displayType')
                    }}<span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <Select
                    :model-value="displayTypeId"
                    :options="typeOptions"
                    option-label="label"
                    option-value="id"
                    :placeholder="t('displayPrograms.form.selectDisplayType')"
                    :disabled="readonly || locks.displayType"
                    :invalid="!!errors.displayTypeId"
                    filter
                    class="w-full"
                    data-testid="type-select"
                    @update:model-value="onTypeChange"
                  />
                  <small v-if="mode === 'edit' && locks.displayType" class="text-surface-500">{{
                    t('displayPrograms.locked')
                  }}</small>
                  <small v-if="errors.displayTypeId" class="text-red-500">{{
                    errors.displayTypeId
                  }}</small>
                </div>

                <!-- Dates -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">
                    {{ t('displayPrograms.form.startDate')
                    }}<span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <DatePicker
                    v-model="startDate"
                    date-format="yy-mm-dd"
                    :disabled="readonly || locks.startDate"
                    :invalid="!!errors.startDate"
                    show-icon
                    class="w-full"
                    data-testid="start-date"
                  />
                  <small v-if="mode === 'edit' && locks.startDate" class="text-surface-500">{{
                    t('displayPrograms.locked')
                  }}</small>
                  <small v-if="errors.startDate" class="text-red-500">{{ errors.startDate }}</small>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">
                    {{ t('displayPrograms.form.endDate')
                    }}<span class="ml-0.5 text-red-500">*</span>
                  </label>
                  <DatePicker
                    v-model="endDate"
                    date-format="yy-mm-dd"
                    :min-date="endMinDate"
                    :disabled="readonly"
                    :invalid="!!errors.endDate"
                    show-icon
                    class="w-full"
                    data-testid="end-date"
                  />
                  <small v-if="errors.endDate" class="text-red-500">{{ errors.endDate }}</small>
                </div>
              </div>

              <!-- Notes -->
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold">{{ t('displayPrograms.form.notes') }}</label>
                <Textarea
                  v-model="notes"
                  rows="2"
                  maxlength="500"
                  auto-resize
                  :disabled="readonly"
                  class="w-full"
                />
              </div>

              <Message
                v-if="mode === 'edit' && program?.displayStatus === 'active'"
                severity="info"
                size="small"
                variant="simple"
              >
                {{ t('displayPrograms.form.activeNote') }}
              </Message>
              <p v-if="mode === 'edit' && metaLine" class="text-xs text-stone-500">
                {{ metaLine }}
              </p>
            </div>
          </template>
        </ResponsiveCard>
      </div>

      <div class="flex flex-col gap-6">
        <!-- Frequency and photos -->
        <ResponsiveCard>
          <template #content>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <h2 class="text-base font-semibold">{{ t('displayPrograms.frequency.title') }}</h2>
                <SelectButton
                  v-model="frequencyMode"
                  :options="frequencyOptions"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  :disabled="readonly || locks.frequency"
                  data-testid="frequency-mode"
                />
                <div v-if="frequencyMode === 'min_per_month'" class="flex flex-col gap-1">
                  <label class="text-sm font-semibold">{{
                    t('displayPrograms.frequency.minPerMonthField')
                  }}</label>
                  <InputNumber
                    v-model="minPerMonth"
                    :min="1"
                    :max="31"
                    :use-grouping="false"
                    show-buttons
                    :disabled="readonly || locks.frequency"
                    :invalid="!!errors.minPerMonth"
                    class="w-full md:w-48"
                    data-testid="min-per-month"
                  />
                  <small v-if="errors.minPerMonth" class="text-red-500">{{
                    errors.minPerMonth
                  }}</small>
                </div>
                <small v-if="mode === 'edit' && locks.frequency" class="text-surface-500">{{
                  t('displayPrograms.locked')
                }}</small>
                <small class="text-surface-500">{{ t('displayPrograms.frequency.help') }}</small>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold">{{
                  t('displayPrograms.form.minPhotos')
                }}</label>
                <InputNumber
                  v-model="minPhotos"
                  :min="1"
                  :max="10"
                  :use-grouping="false"
                  show-buttons
                  :disabled="readonly || locks.minPhotos"
                  :invalid="!!errors.minPhotos"
                  class="w-full md:w-48"
                  data-testid="min-photos"
                />
                <small v-if="errors.minPhotos" class="text-red-500">{{ errors.minPhotos }}</small>
                <small class="text-surface-500">{{
                  t('displayPrograms.form.minPhotosHint')
                }}</small>
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <ResponsiveCard>
          <template #content>
            <div class="flex flex-col gap-3">
              <div>
                <h2 class="text-base font-semibold">{{ t('displayPrograms.photos.title') }}</h2>
                <p class="text-sm text-stone-500">{{ t('displayPrograms.photos.subtitle') }}</p>
              </div>
              <PhotoGallery
                ref="gallery"
                v-model="photos"
                owner-type="display_program"
                category="reference"
                :owner-id="program?.id ?? null"
                :max="MAX_PHOTOS"
                :readonly="readonly"
                @error="(message: string) => toast.add(commonErrorToast(message, toastGroup))"
              />
            </div>
          </template>
        </ResponsiveCard>
      </div>

      <div class="flex flex-col gap-6">
        <DisplayCriteriaList
          v-model:criteria="criteria"
          :readonly="readonly || locks.criteria"
          :locked="locks.criteria && !readonly"
          :error="errors.criteria"
        />
        <DisplayCompensationCard
          v-model:rent="rentPerMonth"
          v-model:min-comply="minComplyPct"
          :readonly="readonly || locks.compensation"
          :locked="locks.compensation && !readonly"
          :errors="{ rent: errors.rent, minComply: errors.minComply }"
        />
      </div>
    </div>

    <!-- Action bar -->
    <div
      class="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-2 py-3"
    >
      <p class="text-sm text-stone-600">
        {{
          t('displayPrograms.form.summary', {
            criteria: criteria.length,
            photos: photos.length,
            customers: participantCount,
          })
        }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="showDelete"
          type="button"
          :label="t('displayPrograms.actions.delete')"
          severity="danger"
          outlined
          :disabled="isLoading"
          data-testid="action-delete"
          @click="onDeleteClick"
        />
        <Button
          v-if="showDuplicate"
          type="button"
          :label="t('displayPrograms.actions.duplicate')"
          icon="pi pi-copy"
          severity="secondary"
          outlined
          :disabled="isLoading"
          data-testid="action-duplicate"
          @click="emit('duplicate')"
        />
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('cancel')"
        />
        <Button
          v-if="showEndEarly"
          type="button"
          :label="t('displayPrograms.actions.endEarly')"
          severity="contrast"
          :disabled="isLoading"
          data-testid="action-end-early"
          @click="onEndEarlyClick"
        />
        <Button
          v-if="showUnpublish"
          type="button"
          :label="t('displayPrograms.actions.unpublish')"
          severity="contrast"
          :disabled="isLoading"
          data-testid="action-unpublish"
          @click="onUnpublishClick"
        />
        <span v-if="showPublish" v-tooltip.top="publishDisabledReason">
          <Button
            type="button"
            :label="t('displayPrograms.actions.publish')"
            severity="success"
            :disabled="isLoading || !!publishDisabledReason"
            data-testid="action-publish"
            @click="onPublishClick"
          />
        </span>
        <Button
          v-if="!readonly"
          type="button"
          :label="isLoading ? '' : saveLabel"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading || (mode === 'add' && !canCreate)"
          data-testid="action-save"
          @click="onSaveClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import PhotoGallery from '@/components/upload/PhotoGallery.vue'
import { DisplayTypesService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import type { PhotoRef } from '@/types'
import type {
  CreateDisplayProgramRequest,
  DisplayFrequencyMode,
  DisplayProgram,
  DisplayTypeOption,
  UpdateDisplayProgramRequest,
} from '@/types'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import {
  MAX_CRITERIA,
  MAX_PHOTOS,
  buildCreatePayload,
  buildUpdatePayload,
  criteriaErrors,
  fieldLocks,
  fromApiCriterion,
  fromApiDate,
  minPhotosAfterTypeChange,
  publishBlockers,
  rentToInput,
  toApiDate,
  type FormCriterion,
  type FormState,
} from './displayProgramHelpers'
import DisplayCompensationCard from './components/DisplayCompensationCard.vue'
import DisplayCriteriaList from './components/DisplayCriteriaList.vue'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    program?: DisplayProgram
    /** Open customers; the Customers tab changes it without remounting the form. */
    participantCount?: number
    isLoading?: boolean
    /** No write permission, or the program has ended. */
    readonly?: boolean
    canWrite?: boolean
    canPublish?: boolean
    toastGroup: string
  }>(),
  {
    program: undefined,
    participantCount: 0,
    isLoading: false,
    readonly: false,
    canWrite: false,
    canPublish: false,
  },
)

const emit = defineEmits<{
  create: [body: CreateDisplayProgramRequest, setCodeError: (message: string) => void]
  save: [body: UpdateDisplayProgramRequest]
  /** The payload is set when there are unsaved changes to save before publishing. */
  publish: [body: UpdateDisplayProgramRequest | null]
  unpublish: []
  endEarly: []
  duplicate: []
  remove: []
  cancel: []
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'displayProgramForm'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const program = props.program
const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('display_programs')
const code = ref('')

const branchId = ref<number | undefined>(
  program?.branch.id ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const name = ref(program?.name ?? '')
const principalOptionId = ref<number | undefined>(program?.principal?.id)
const displayTypeId = ref<number | undefined>(program?.displayType.id)
const startDate = ref<Date | null>(
  program ? fromApiDate(program.startDate) : dayjs().startOf('day').toDate(),
)
const endDate = ref<Date | null>(program ? fromApiDate(program.endDate) : null)
const notes = ref(program?.notes ?? '')
const frequencyMode = ref<DisplayFrequencyMode>(program?.frequencyMode ?? 'every_visit')
const minPerMonth = ref<number | null>(program?.minPerMonth ?? null)
const minPhotos = ref<number>(program?.minPhotos ?? 1)
const rentPerMonth = ref<number | null>(rentToInput(program?.rentPerMonth))
const minComplyPct = ref<number | null>(rentToInput(program?.minComplyPct))
const criteria = ref<FormCriterion[]>((program?.criteria ?? []).map(fromApiCriterion))
const photos = ref<PhotoRef[]>((program?.photos ?? []).map((p) => ({ id: p.id, url: p.url })))

const errors = ref<Record<string, string>>({})
const gallery = ref<InstanceType<typeof PhotoGallery> | null>(null)

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const locks = computed(() => fieldLocks(program?.displayStatus))

const frequencyOptions = computed(() => [
  { value: 'every_visit', label: t('displayPrograms.frequency.everyVisit') },
  { value: 'min_per_month', label: t('displayPrograms.frequency.minPerMonthOption') },
])

const principalOptions = ref<{ label: string; value: number }[]>([])
async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({ label: o.label, value: o.value as number }))
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}

const types = ref<DisplayTypeOption[]>([])
const typeOptions = computed(() =>
  types.value.map((o) => ({
    id: o.id,
    label: `${o.code} · ${o.name}${o.isActive ? '' : ` (${t('common.labels.inactive')})`}`,
  })),
)
async function loadTypes() {
  try {
    // The program's own type comes back even when it has been deactivated since.
    types.value = await DisplayTypesService.options(program?.displayType.id)
    if (props.mode === 'add' && !displayTypeId.value && types.value.length === 1) {
      onTypeChange(types.value[0].id)
    }
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}

/** The new type's min photos is offered unless the user already set their own. */
function onTypeChange(value: number | undefined) {
  if (value === undefined || value === displayTypeId.value) return
  const previous = types.value.find((o) => o.id === displayTypeId.value)
  const next = types.value.find((o) => o.id === value)
  displayTypeId.value = value
  if (next)
    minPhotos.value = minPhotosAfterTypeChange(minPhotos.value, previous?.minPhotos, next.minPhotos)
}

/** Today, or the start date when it is later: the earliest an end date can be. */
const endMinDate = computed(() => {
  const today = dayjs().startOf('day')
  const start = startDate.value ? dayjs(startDate.value).startOf('day') : null
  if (locks.value.endDateFromToday) return (start && start.isAfter(today) ? start : today).toDate()
  return start?.toDate()
})

// ---------------------------------------------------------------------------
// Payload, validation and dirty tracking
// ---------------------------------------------------------------------------

function currentState(): FormState {
  return {
    code: props.mode === 'add' && codeMode.value === 'manual' ? code.value : undefined,
    branchId: branchId.value,
    name: name.value,
    principalOptionId: principalOptionId.value ?? undefined,
    displayTypeId: displayTypeId.value ?? 0,
    startDate: startDate.value ? toApiDate(startDate.value) : '',
    endDate: endDate.value ? toApiDate(endDate.value) : '',
    notes: notes.value,
    frequencyMode: frequencyMode.value,
    minPerMonth: minPerMonth.value,
    minPhotos: minPhotos.value,
    rentPerMonth: rentPerMonth.value,
    minComplyPct: minComplyPct.value,
    criteria: criteria.value,
  }
}

const savedSnapshot = ref('')
const isDirty = computed(
  () => props.mode === 'edit' && JSON.stringify(currentState()) !== savedSnapshot.value,
)

// Clearing the rent clears the percentage with it: they are stored together or not at all.
watch(rentPerMonth, (rent) => {
  if (rent === null || rent === undefined) minComplyPct.value = null
})

function validate(): boolean {
  const next: Record<string, string> = {}
  if (props.mode === 'add' && !branchId.value) {
    next.branchId = t('displayPrograms.validation.branchRequired')
  }
  if (props.mode === 'add' && codeMode.value === 'manual' && !code.value.trim()) {
    next.code = t('displayPrograms.validation.codeRequired')
  }
  if (!name.value.trim()) next.name = t('displayPrograms.validation.nameRequired')
  if (!displayTypeId.value) next.displayTypeId = t('displayPrograms.validation.typeRequired')
  if (!startDate.value) next.startDate = t('displayPrograms.validation.startRequired')
  if (!endDate.value) next.endDate = t('displayPrograms.validation.endRequired')
  if (startDate.value && endDate.value) {
    const end = dayjs(endDate.value).startOf('day')
    if (end.isBefore(dayjs(startDate.value).startOf('day'))) {
      next.endDate = t('displayPrograms.validation.endBeforeStart')
    } else if (locks.value.endDateFromToday && end.isBefore(dayjs().startOf('day'))) {
      next.endDate = t('displayPrograms.validation.endBeforeToday')
    }
  }
  if (frequencyMode.value === 'min_per_month') {
    const n = minPerMonth.value
    if (n === null || n === undefined || n < 1 || n > 31) {
      next.minPerMonth = t('displayPrograms.validation.minPerMonthRange')
    }
  }
  if (!minPhotos.value || minPhotos.value < 1 || minPhotos.value > 10) {
    next.minPhotos = t('displayPrograms.validation.minPhotosRange')
  }
  const hasRent = rentPerMonth.value !== null && rentPerMonth.value !== undefined
  const hasPct = minComplyPct.value !== null && minComplyPct.value !== undefined
  if (hasRent && !hasPct) next.minComply = t('displayPrograms.validation.minComplyRequired')
  if (hasRent && rentPerMonth.value! < 0) next.rent = t('displayPrograms.validation.rentInvalid')
  if (criteria.value.length > MAX_CRITERIA) {
    next.criteria = t('displayPrograms.criteria.max', { n: MAX_CRITERIA })
  } else if (criteriaErrors(criteria.value.map((c) => c.text)).some((e) => e !== undefined)) {
    next.criteria = t('displayPrograms.validation.criteriaInvalid')
  }
  errors.value = next
  return Object.keys(next).length === 0
}

function onSaveClick() {
  if (!validate()) return
  const state = currentState()
  if (props.mode === 'edit' && program) {
    emit('save', buildUpdatePayload(state, props.program?.version ?? program.version))
    return
  }
  emit('create', buildCreatePayload(state), (message) => {
    errors.value = { ...errors.value, code: message }
  })
}

const canCreate = computed(() => !!branchId.value && !!name.value.trim())

const saveLabel = computed(() =>
  props.mode === 'add' ? t('displayPrograms.actions.saveDraft') : t('displayPrograms.actions.save'),
)

// ---------------------------------------------------------------------------
// Status actions
// ---------------------------------------------------------------------------

const status = computed(() => program?.displayStatus)
const showDelete = computed(
  () => props.mode === 'edit' && props.canWrite && status.value === 'draft',
)
const showDuplicate = computed(() => props.mode === 'edit' && props.canWrite)
const showPublish = computed(
  () => props.mode === 'edit' && props.canPublish && status.value === 'draft',
)
const showUnpublish = computed(
  () => props.mode === 'edit' && props.canPublish && status.value === 'scheduled',
)
const showEndEarly = computed(
  () => props.mode === 'edit' && props.canPublish && status.value === 'active',
)

/** Why Publish is unavailable, or an empty string when it is. */
const publishDisabledReason = computed(() => {
  const blockers = publishBlockers({
    criteriaCount: criteria.value.length,
    photoCount: photos.value.length,
    participantCount: props.participantCount,
    endDate: endDate.value ? toApiDate(endDate.value) : '',
  })
  return blockers.length ? t(`displayPrograms.actions.publishBlocked.${blockers[0]}`) : ''
})

function onPublishClick() {
  // Unsaved changes are saved first, then the new version is published.
  if (isDirty.value) {
    if (!validate() || !program) return
    emit('publish', buildUpdatePayload(currentState(), props.program?.version ?? program.version))
    return
  }
  emit('publish', null)
}

function confirmThen(
  header: string,
  message: string,
  label: string,
  accept: () => void,
  danger = false,
) {
  confirm.require({
    group: confirmGroup,
    header,
    message,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label, ...(danger ? { severity: 'danger' } : {}) },
    accept,
  })
}

const onUnpublishClick = () =>
  confirmThen(
    t('displayPrograms.actions.unpublish'),
    t('displayPrograms.actions.unpublishConfirm'),
    t('displayPrograms.actions.unpublish'),
    () => emit('unpublish'),
  )

const onEndEarlyClick = () =>
  confirmThen(
    t('displayPrograms.actions.endEarly'),
    t('displayPrograms.actions.endEarlyConfirm'),
    t('displayPrograms.actions.endEarly'),
    () => emit('endEarly'),
  )

const onDeleteClick = () =>
  confirmThen(
    t('displayPrograms.actions.delete'),
    t('displayPrograms.actions.deleteConfirm'),
    t('displayPrograms.actions.delete'),
    () => emit('remove'),
    true,
  )

const metaLine = computed(() => {
  if (!program) return ''
  const parts = [
    t('displayPrograms.form.created', {
      by: program.createdByName ?? '—',
      at: dayjs(program.createdAt).format(DateFormat.DATE_TIME),
    }),
  ]
  if (program.updatedAt) {
    parts.push(
      t('displayPrograms.form.lastChanged', {
        by: program.updatedByName ?? '—',
        at: dayjs(program.updatedAt).format(DateFormat.DATE_TIME),
      }),
    )
  }
  return parts.join(' · ')
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  loadPrincipalOptions()
  await loadTypes()
  // Let the child components settle their initial values before the baseline is taken.
  await nextTick()
  savedSnapshot.value = JSON.stringify(currentState())
})

/** Uploads the photos picked before the program existed. Returns how many failed. */
async function flushPhotos(programId: number): Promise<number> {
  return (await gallery.value?.flushPending(programId)) ?? 0
}

defineExpose({
  flushPhotos,
  pendingPhotos: () => gallery.value?.pendingCount ?? 0,
  isDirty: () => isDirty.value,
})
</script>
