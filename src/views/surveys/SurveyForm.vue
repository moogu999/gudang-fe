<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <Message v-if="mode === 'add' && configMissing" severity="warn" data-testid="config-missing">
      {{ t('surveys.form.missingConfig') }}
      <RouterLink to="/configs?tab=survey" class="text-primary-500 ml-1 underline">
        {{ t('surveys.form.missingConfigLink') }}
      </RouterLink>
    </Message>

    <template v-if="formEnabled">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p v-if="mode === 'edit' && metaLine" class="text-xs text-stone-500">{{ metaLine }}</p>
        <span v-else />
        <Button
          type="button"
          :label="t('surveys.actions.previewPhone')"
          icon="pi pi-mobile"
          severity="secondary"
          outlined
          size="small"
          data-testid="action-preview"
          @click="isPreviewShown = true"
        />
      </div>

      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="settings">{{ t('surveys.tabs.settings') }}</Tab>
          <Tab value="content" data-testid="tab-content">
            {{ type === 'regular' ? t('surveys.tabs.questions') : t('surveys.tabs.stock') }}
            <Badge
              v-if="type === 'regular'"
              :value="questions.length"
              severity="secondary"
              class="ml-2"
            />
          </Tab>
          <Tab v-if="mode === 'edit'" value="history">{{ t('surveys.tabs.history') }}</Tab>
        </TabList>
        <TabPanels>
          <!-- Settings -->
          <TabPanel value="settings">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div class="flex flex-col gap-6">
                <ResponsiveCard>
                  <template #content>
                    <div class="flex flex-col gap-4">
                      <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">{{ t('surveys.form.type') }}</label>
                        <SurveyTypeCards v-model:type="type" :disabled="mode === 'edit'" />
                      </div>

                      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
                        <!-- Code -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">{{ t('surveys.form.code') }}</label>
                          <template v-if="mode === 'add'">
                            <div class="mb-1 flex gap-2">
                              <Button
                                type="button"
                                :label="t('surveys.form.codeAuto')"
                                :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                                size="small"
                                :disabled="!hasDefaultSeries || numberSeriesLoading"
                                @click="codeMode = 'auto'"
                              />
                              <Button
                                type="button"
                                :label="t('surveys.form.codeManual')"
                                :severity="codeMode === 'manual' ? 'primary' : 'secondary'"
                                size="small"
                                @click="codeMode = 'manual'"
                              />
                            </div>
                            <template v-if="codeMode === 'auto'">
                              <InputText
                                :value="numberSeriesLoading ? '' : previewCode"
                                :placeholder="
                                  numberSeriesLoading ? t('common.messages.loading') : ''
                                "
                                readonly
                                class="w-full font-mono"
                              />
                              <small class="text-surface-500">{{
                                t('surveys.form.codeAssignedOnSave')
                              }}</small>
                            </template>
                            <InputText
                              v-else
                              v-model="code"
                              autocomplete="off"
                              class="w-full font-mono"
                              :invalid="!!errors.code"
                              data-testid="code-input"
                            />
                          </template>
                          <InputText
                            v-else
                            :value="survey?.code"
                            readonly
                            class="w-full font-mono"
                          />
                          <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
                        </div>

                        <!-- Branch -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">
                            {{ t('surveys.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
                          </label>
                          <InfiniteSelect
                            v-if="mode === 'add'"
                            v-model="branchId"
                            :fetch-fn="fetchBranches"
                            :option-label="branchLabel"
                            option-value="id"
                            :placeholder="t('surveys.form.selectBranch')"
                            class="w-full"
                          />
                          <InputText v-else :value="survey?.branchName" readonly class="w-full" />
                          <small v-if="errors.branchId" class="text-red-500">{{
                            errors.branchId
                          }}</small>
                        </div>

                        <!-- Name -->
                        <div class="flex flex-col gap-1 md:col-span-2">
                          <label class="text-sm font-semibold">
                            {{ t('surveys.form.name') }}<span class="ml-0.5 text-red-500">*</span>
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
                            t('surveys.form.principal')
                          }}</label>
                          <Select
                            :model-value="principalOptionId"
                            :options="principalOptions"
                            option-label="label"
                            option-value="value"
                            :placeholder="t('surveys.form.internal')"
                            :disabled="readonly || locks.principal"
                            show-clear
                            filter
                            class="w-full"
                            data-testid="principal-select"
                            @update:model-value="
                              (v: number | null) => (principalOptionId = v ?? undefined)
                            "
                          />
                          <small
                            v-if="mode === 'edit' && locks.principal"
                            class="text-surface-500"
                            >{{ t('surveys.form.principalLocked') }}</small
                          >
                          <small v-else class="text-surface-500">{{
                            t('surveys.form.principalHint')
                          }}</small>
                        </div>

                        <!-- Scope level -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">{{ t('surveys.form.level') }}</label>
                          <div>
                            <Tag
                              v-if="level"
                              :value="t(scopeLevelLabelKey(level))"
                              severity="info"
                            />
                          </div>
                          <small class="text-surface-500">{{ t('surveys.form.levelHint') }}</small>
                        </div>

                        <!-- Dates -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">
                            {{ t('surveys.form.startDate')
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
                          <small
                            v-if="mode === 'edit' && locks.startDate"
                            class="text-surface-500"
                            >{{ t('surveys.form.startLocked') }}</small
                          >
                          <small v-if="errors.startDate" class="text-red-500">{{
                            errors.startDate
                          }}</small>
                        </div>
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">
                            {{ t('surveys.form.endDate')
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
                          <small v-if="errors.endDate" class="text-red-500">{{
                            errors.endDate
                          }}</small>
                        </div>

                        <!-- Frequency -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">{{
                            t('surveys.form.frequency')
                          }}</label>
                          <SelectButton
                            v-model="frequency"
                            :options="frequencyOptions"
                            option-label="label"
                            option-value="value"
                            :allow-empty="false"
                            :disabled="readonly || locks.frequency"
                            data-testid="frequency"
                          />
                          <small class="text-surface-500">{{
                            t('surveys.form.frequencyHint')
                          }}</small>
                        </div>

                        <!-- Required -->
                        <div class="flex flex-col gap-1">
                          <label class="text-sm font-semibold">{{
                            t('surveys.form.required')
                          }}</label>
                          <SelectButton
                            v-model="isRequired"
                            :options="requiredOptions"
                            option-label="label"
                            option-value="value"
                            :allow-empty="false"
                            :disabled="readonly || locks.isRequired"
                            data-testid="required"
                          />
                          <small class="text-surface-500">{{ requiredHint }}</small>
                        </div>
                      </div>

                      <!-- Notes -->
                      <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">{{ t('surveys.form.notes') }}</label>
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
                        v-if="mode === 'edit' && survey?.displayStatus === 'active'"
                        severity="info"
                        size="small"
                        variant="simple"
                      >
                        {{ t('surveys.form.activeNote') }}
                      </Message>
                    </div>
                  </template>
                </ResponsiveCard>

                <SurveyScopeCard
                  v-if="level"
                  v-model:scope-all="scopeAll"
                  v-model:values="scopeValues"
                  v-model:sales-teams="salesTeams"
                  :level="level"
                  :branch-id="branchId"
                  :readonly="readonly"
                  :error="errors.scope"
                  :toast-group="toastGroup"
                />
              </div>

              <div class="flex flex-col gap-6">
                <SurveyReachPanel
                  :customers="preview?.customerCount"
                  :salesmen="preview?.salesmanCount"
                  :loading="previewLoading"
                  :can-view="canViewCustomers"
                  @view="isCustomersShown = true"
                />
              </div>
            </div>
          </TabPanel>

          <!-- Questions / products and columns -->
          <TabPanel value="content">
            <SurveyQuestionsTab
              v-if="type === 'regular'"
              v-model:questions="questions"
              :content-locked="locks.content"
              :readonly="readonly"
              :errors="questionErrors"
              :highlight-key="highlightKey"
              :toast-group="toastGroup"
              :confirm-group="confirmGroup"
              @grid-loaded="onGridLoaded"
            />
            <SurveyStockCheckTab
              v-else-if="stock"
              v-model:stock="stock"
              :principal-option-id="principalOptionId"
              :principal-name="principalName"
              :active-msl-count="preview?.activeMslCount"
              :content-locked="locks.content"
              :readonly="readonly"
              :mismatch-ids="mismatchIds"
              :error="errors.stock"
              :toast-group="toastGroup"
            />
          </TabPanel>

          <TabPanel v-if="mode === 'edit'" value="history">
            <ResponsiveCard>
              <template #content>
                <slot name="history" />
              </template>
            </ResponsiveCard>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <!-- Action bar -->
      <div
        class="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-2 py-3"
      >
        <p class="text-sm text-stone-600">{{ summary }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="showDelete"
            type="button"
            :label="t('surveys.actions.delete')"
            severity="danger"
            outlined
            :disabled="isLoading"
            data-testid="action-delete"
            @click="onDeleteClick"
          />
          <Button
            v-if="showDuplicate"
            type="button"
            :label="t('surveys.actions.duplicate')"
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
            :label="t('surveys.actions.endEarly')"
            severity="contrast"
            :disabled="isLoading"
            data-testid="action-end-early"
            @click="onEndEarlyClick"
          />
          <Button
            v-if="showUnpublish"
            type="button"
            :label="t('surveys.actions.unpublish')"
            severity="contrast"
            :disabled="isLoading"
            data-testid="action-unpublish"
            @click="onUnpublishClick"
          />
          <span v-if="showPublish" v-tooltip.top="publishDisabledReason">
            <Button
              type="button"
              :label="t('surveys.actions.publish')"
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
    </template>

    <MslCustomersDialog
      v-if="branchId && level"
      :visible="isCustomersShown"
      :branch-id="branchId"
      :scope-level="level"
      :scope-all="scopeAll"
      :scope-value-ids="scopeValueIds"
      :fetcher="fetchCustomers"
      :toast-group="toastGroup"
      @close="isCustomersShown = false"
    />
    <SurveyPhonePreviewDialog
      v-if="isPreviewShown"
      :state="currentState()"
      :name="name"
      :grid-products="gridProducts"
      @close="isPreviewShown = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { SurveyConfigService, SurveysService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import type { MslCustomerQuery } from '@/types/mustSellList.type'
import type {
  CreateSurveyRequest,
  Survey,
  SurveyConfig,
  SurveyFrequency,
  SurveyGridProduct,
  SurveyPreview,
  SurveyQuestion,
  SurveySalesTeamRef,
  SurveyScopeLevel,
  SurveyScopeValue,
  SurveyType,
  UpdateSurveyRequest,
} from '@/types/survey.type'
import {
  NO_LABEL,
  fromApiDate,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import {
  buildCreatePayload,
  buildPreviewPayload,
  buildUpdatePayload,
  fromApiQuestion,
  fromApiStockCheck,
  lockedFields,
  newStockForm,
  publishBlockers,
  scopeLevelLabelKey,
  toApiDate,
  validateQuestions,
  type StockFormState,
  type SurveyFormState,
} from './surveyHelpers'
import { errorLocation } from './surveyErrors'
import MslCustomersDialog from '../must-sell-lists/components/MslCustomersDialog.vue'
import SurveyPhonePreviewDialog from './components/SurveyPhonePreviewDialog.vue'
import SurveyQuestionsTab from './components/SurveyQuestionsTab.vue'
import SurveyReachPanel from './components/SurveyReachPanel.vue'
import SurveyScopeCard from './components/SurveyScopeCard.vue'
import SurveyStockCheckTab from './components/SurveyStockCheckTab.vue'
import SurveyTypeCards from './components/SurveyTypeCards.vue'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    survey?: Survey
    isLoading?: boolean
    /** No write permission, or the survey has ended. */
    readonly?: boolean
    canWrite?: boolean
    canPublish?: boolean
    toastGroup: string
  }>(),
  { survey: undefined, isLoading: false, readonly: false, canWrite: false, canPublish: false },
)

const emit = defineEmits<{
  create: [body: CreateSurveyRequest, setCodeError: (message: string) => void]
  save: [body: UpdateSurveyRequest]
  /** The payload is set when there are unsaved changes to save before publishing. */
  publish: [body: UpdateSurveyRequest | null]
  unpublish: []
  endEarly: []
  duplicate: []
  remove: []
  cancel: []
}>()

/** The open tab; the edit view owns it so a save (which remounts the form) keeps it. */
const tab = defineModel<string>('tab', { default: 'settings' })

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'surveyForm'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const survey = props.survey
const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('surveys')
const code = ref('')

const type = ref<SurveyType>(survey?.type ?? 'regular')
const branchId = ref<number | undefined>(
  survey?.branchId ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const name = ref(survey?.name ?? '')
const principalOptionId = ref<number | undefined>(survey?.principalOptionId)
const startDate = ref<Date | null>(
  survey ? fromApiDate(survey.startDate) : dayjs().startOf('day').toDate(),
)
const endDate = ref<Date | null>(survey ? fromApiDate(survey.endDate) : null)
const notes = ref(survey?.notes ?? '')
const frequency = ref<SurveyFrequency>(survey?.frequency ?? 'once_per_period')
const isRequired = ref(survey?.isRequired ?? false)
const scopeAll = ref(survey?.scopeAll ?? false)
const scopeValues = ref<SurveyScopeValue[]>(survey?.scopeValues ? [...survey.scopeValues] : [])
const salesTeams = ref<SurveySalesTeamRef[]>(survey?.salesTeams ? [...survey.salesTeams] : [])
const questions = ref<SurveyQuestion[]>((survey?.questions ?? []).map(fromApiQuestion))
const stock = ref<StockFormState | undefined>(
  survey?.stockCheck ? fromApiStockCheck(survey.stockCheck) : newStockForm(false),
)

const errors = ref<Record<string, string>>({})
const questionErrors = ref<Record<string, string[]>>({})
const highlightKey = ref<string | undefined>()
const mismatchIds = ref<number[]>([])
const gridProducts = ref<Record<string, SurveyGridProduct[]>>({})
const isCustomersShown = ref(false)
const isPreviewShown = ref(false)

const fetchBranches = userBranchesFetcher(authStore.branchIds)
const fetchCustomers = (query: MslCustomerQuery) => SurveysService.customers(query)

const locks = computed(() => lockedFields(survey?.displayStatus))
const scopeValueIds = computed(() => scopeValues.value.filter((v) => !v.deleted).map((v) => v.id))
const salesTeamIds = computed(() => salesTeams.value.map((x) => x.id))

const principalOptions = ref<{ label: string; value: number }[]>([])
const principalName = computed(
  () =>
    principalOptions.value.find((o) => o.value === principalOptionId.value)?.label ??
    survey?.principalName,
)
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

const frequencyOptions = computed(() =>
  (['once_per_period', 'every_visit'] as SurveyFrequency[]).map((v) => ({
    label: t(`surveys.frequency.${v}`),
    value: v,
  })),
)
const requiredOptions = computed(() => [
  { label: t('surveys.required.required'), value: true },
  { label: t('surveys.required.optional'), value: false },
])

/** Today, or the start date when it is later: the earliest an end date can be. */
const endMinDate = computed(() => {
  const today = dayjs().startOf('day')
  const start = startDate.value ? dayjs(startDate.value).startOf('day') : null
  if (locks.value.endDateFromToday) return (start && start.isAfter(today) ? start : today).toDate()
  return start?.toDate()
})

// ---------------------------------------------------------------------------
// The branch config: level on create, defaults and the Required hint
// ---------------------------------------------------------------------------

const config = ref<SurveyConfig | null>(null)
const configLoaded = ref(false)
const level = computed<SurveyScopeLevel | undefined>(
  () => survey?.scopeLevel ?? config.value?.scopeLevel,
)
const configMissing = computed(() => props.mode === 'add' && configLoaded.value && !config.value)

const requiredHint = computed(() => {
  const mode = config.value?.requiredMode
  return mode ? t(`surveys.form.requiredHint.${mode}`) : ''
})

async function loadConfig() {
  configLoaded.value = false
  config.value = null
  const id = branchId.value
  if (!id) return
  try {
    const loaded = await SurveyConfigService.getMyBranch(id)
    if (id !== branchId.value) return
    config.value = loaded
    // A new stock check starts from the branch's default; nothing has been edited yet.
    if (props.mode === 'add') stock.value = newStockForm(loaded?.stockCheckQtyDefault ?? false)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
  configLoaded.value = true
}

const formEnabled = computed(() => {
  if (props.mode === 'edit') return true
  return !!level.value && !!branchId.value
})

// ---------------------------------------------------------------------------
// Reach: one debounced preview of the unsaved scope
// ---------------------------------------------------------------------------

const preview = ref<SurveyPreview | undefined>()
const previewLoading = ref(false)
let previewSeq = 0
let previewTimer: ReturnType<typeof setTimeout> | undefined

const hasScope = computed(() => scopeAll.value || scopeValueIds.value.length > 0)
const canViewCustomers = computed(() => !!branchId.value && !!level.value && hasScope.value)

async function loadPreview() {
  const seq = ++previewSeq
  if (!branchId.value || !level.value) return
  previewLoading.value = true
  try {
    const res = await SurveysService.preview(
      buildPreviewPayload(currentState(), level.value, survey?.id),
    )
    // A late answer for a state no longer shown must not overwrite the current one.
    if (seq !== previewSeq) return
    preview.value = hasScope.value ? res : { ...res, customerCount: 0 }
  } catch {
    if (seq === previewSeq) preview.value = undefined
  } finally {
    if (seq === previewSeq) previewLoading.value = false
  }
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(loadPreview, 500)
}

// ---------------------------------------------------------------------------
// Payload, validation and dirty tracking
// ---------------------------------------------------------------------------

function currentState(): SurveyFormState {
  return {
    code: props.mode === 'add' && codeMode.value === 'manual' ? code.value : undefined,
    branchId: branchId.value,
    type: type.value,
    name: name.value,
    principalOptionId: principalOptionId.value,
    startDate: startDate.value ? toApiDate(startDate.value) : '',
    endDate: endDate.value ? toApiDate(endDate.value) : '',
    notes: notes.value,
    frequency: frequency.value,
    isRequired: isRequired.value,
    scopeAll: scopeAll.value,
    scopeValueIds: scopeValueIds.value,
    salesTeamIds: salesTeamIds.value,
    questions: questions.value,
    stock: stock.value,
  }
}

const savedSnapshot = ref('')
const isDirty = computed(
  () => props.mode === 'edit' && JSON.stringify(currentState()) !== savedSnapshot.value,
)

// Only what the preview reads: typing a question must not refetch the reach.
watch(
  () =>
    JSON.stringify([
      branchId.value,
      principalOptionId.value,
      scopeAll.value,
      scopeValueIds.value,
      salesTeamIds.value,
    ]),
  () => {
    if (formEnabled.value) schedulePreview()
  },
)

// Once a save was refused, keep the question errors in step with the edits.
let showQuestionErrors = false
watch(
  questions,
  () => {
    if (showQuestionErrors && !locks.value.content)
      questionErrors.value = validateQuestions(questions.value)
    highlightKey.value = undefined
  },
  { deep: true },
)

function validate(): boolean {
  const next: Record<string, string> = {}
  if (props.mode === 'add' && !branchId.value) {
    next.branchId = t('surveys.validation.branchRequired')
  }
  if (props.mode === 'add' && codeMode.value === 'manual' && !code.value.trim()) {
    next.code = t('surveys.validation.codeRequired')
  }
  if (!name.value.trim()) next.name = t('surveys.validation.nameRequired')
  if (!startDate.value) next.startDate = t('surveys.validation.startRequired')
  if (!endDate.value) next.endDate = t('surveys.validation.endRequired')
  if (startDate.value && endDate.value) {
    const end = dayjs(endDate.value).startOf('day')
    if (end.isBefore(dayjs(startDate.value).startOf('day'))) {
      next.endDate = t('surveys.validation.endBeforeStart')
    } else if (locks.value.endDateFromToday && end.isBefore(dayjs().startOf('day'))) {
      next.endDate = t('surveys.validation.endBeforeToday')
    }
  }
  if (scopeAll.value && scopeValueIds.value.length > 0) {
    next.scope = t('surveys.validation.scopeBoth')
  }
  errors.value = next

  showQuestionErrors = true
  const qErrors =
    type.value === 'regular' && !locks.value.content ? validateQuestions(questions.value) : {}
  questionErrors.value = qErrors

  const settingsInvalid = Object.keys(next).length > 0
  const contentInvalid = Object.keys(qErrors).length > 0
  if (settingsInvalid) tab.value = 'settings'
  else if (contentInvalid) {
    tab.value = 'content'
    const firstKey = questions.value.find((q) => qErrors[q.clientKey])?.clientKey
    if (firstKey) scrollToQuestion(firstKey)
  }
  return !settingsInvalid && !contentInvalid
}

function scrollToQuestion(clientKey: string) {
  highlightKey.value = clientKey
  nextTick(() =>
    setTimeout(
      () =>
        document
          .getElementById(`question-${clientKey}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100,
    ),
  )
}

function onSaveClick() {
  if (!validate()) return
  const state = currentState()
  if (props.mode === 'edit' && survey) {
    emit('save', buildUpdatePayload(state, survey.version))
    return
  }
  emit('create', buildCreatePayload(state), (message) => {
    errors.value = { ...errors.value, code: message }
    tab.value = 'settings'
  })
}

/** Points the form at what the API rejected: the question card or the product rows. */
function applyError(e: unknown) {
  const location = errorLocation(e)
  mismatchIds.value = location.productIds ?? []
  let key: string | undefined
  if (location.questionIndex !== undefined) key = questions.value[location.questionIndex]?.clientKey
  if (location.questionId !== undefined) {
    key = questions.value.find((q) => q.id === location.questionId)?.clientKey
  }
  if (key || mismatchIds.value.length) tab.value = 'content'
  if (key) scrollToQuestion(key)
}
defineExpose({ applyError })

const canCreate = computed(() => !!branchId.value && !!level.value && !!name.value.trim())

const saveLabel = computed(() =>
  props.mode === 'add' ? t('surveys.actions.saveDraft') : t('surveys.actions.save'),
)

const summary = computed(() => {
  const content =
    type.value === 'regular'
      ? t('surveys.form.summaryQuestions', { n: questions.value.length }, questions.value.length)
      : stock.value?.source === 'products'
        ? t(
            'surveys.form.summaryProducts',
            { n: stock.value.products.length },
            stock.value.products.length,
          )
        : t('surveys.form.summaryMsl')
  return t('surveys.form.summary', {
    content,
    customers: preview.value?.customerCount ?? 0,
    salesmen: preview.value?.salesmanCount ?? 0,
  })
})

// ---------------------------------------------------------------------------
// Status actions
// ---------------------------------------------------------------------------

function onGridLoaded(clientKey: string, products: SurveyGridProduct[]) {
  gridProducts.value = { ...gridProducts.value, [clientKey]: products }
}

const status = computed(() => survey?.displayStatus)
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
  const gridKeys = questions.value
    .filter((q) => q.type === 'competitor_grid')
    .map((q) => q.clientKey)
  const keys = publishBlockers({
    type: type.value,
    hasScope: hasScope.value,
    endDate: endDate.value ? toApiDate(endDate.value) : '',
    questionCount: questions.value.length,
    // A grid reports its products once loaded; unknown is not empty.
    hasEmptyGrid: gridKeys.some(
      (k) => gridProducts.value[k] !== undefined && gridProducts.value[k].length === 0,
    ),
    stockSource: stock.value?.source,
    stockProductCount: stock.value?.products.length ?? 0,
  })
  return keys.map((k) => t(k)).join(' ')
})

function onPublishClick() {
  // Unsaved changes are saved first, then the new version is published.
  if (isDirty.value) {
    if (!validate() || !survey) return
    emit('publish', buildUpdatePayload(currentState(), survey.version))
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
    t('surveys.actions.unpublish'),
    t('surveys.actions.unpublishConfirm'),
    t('surveys.actions.unpublish'),
    () => emit('unpublish'),
  )
const onEndEarlyClick = () =>
  confirmThen(
    t('surveys.actions.endEarly'),
    t('surveys.actions.endEarlyConfirm'),
    t('surveys.actions.endEarly'),
    () => emit('endEarly'),
  )
const onDeleteClick = () =>
  confirmThen(
    t('surveys.actions.delete'),
    t('surveys.actions.deleteConfirm'),
    t('surveys.actions.delete'),
    () => emit('remove'),
    true,
  )

const metaLine = computed(() => {
  if (!survey) return ''
  const parts = [
    t('surveys.form.created', {
      by: survey.createdByName ?? '—',
      at: dayjs(survey.createdAt).format(DateFormat.DATE_TIME),
    }),
  ]
  if (survey.updatedAt) {
    parts.push(
      t('surveys.form.lastChanged', {
        by: survey.updatedByName ?? '—',
        at: dayjs(survey.updatedAt).format(DateFormat.DATE_TIME),
      }),
    )
  }
  return parts.join(' · ')
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

watch(branchId, () => {
  if (props.mode === 'add') loadConfig()
})

onMounted(async () => {
  loadPrincipalOptions()
  await loadConfig()
  // Let the child components settle their initial values before the baseline is taken.
  await nextTick()
  savedSnapshot.value = JSON.stringify(currentState())
  if (formEnabled.value) loadPreview()
})

onBeforeUnmount(() => clearTimeout(previewTimer))
</script>
