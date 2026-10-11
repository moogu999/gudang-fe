<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <ResponsiveCard>
      <template #content>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
            <!-- Code -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('salesmanTargets.form.code') }}</label>
              <template v-if="mode === 'add'">
                <div class="mb-1 flex gap-2">
                  <Button
                    type="button"
                    :label="t('salesmanTargets.form.codeAuto')"
                    :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                    size="small"
                    :disabled="!hasDefaultSeries || numberSeriesLoading"
                    @click="codeMode = 'auto'"
                  />
                  <Button
                    type="button"
                    :label="t('salesmanTargets.form.codeManual')"
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
                    t('salesmanTargets.form.codeAssignedOnSave')
                  }}</small>
                </template>
                <InputText
                  v-else
                  v-model="code"
                  autocomplete="off"
                  class="w-full font-mono"
                  :invalid="!!errors.code"
                />
              </template>
              <InputText v-else :value="target?.code" readonly class="w-full font-mono" />
              <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
            </div>

            <!-- Period -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">
                {{ t('salesmanTargets.form.period') }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <MonthPicker
                v-model="period"
                :disabled="mode === 'edit'"
                :invalid="!!errors.period"
                class="w-full"
              />
              <small v-if="errors.period" class="text-red-500">{{ errors.period }}</small>
            </div>

            <!-- Branch -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">
                {{ t('salesmanTargets.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <InfiniteSelect
                v-if="mode === 'add'"
                v-model="branchId"
                :fetch-fn="fetchBranches"
                :option-label="branchLabel"
                option-value="id"
                :placeholder="t('salesmanTargets.form.selectBranch')"
                class="w-full"
              />
              <InputText v-else :value="target?.branchName" readonly class="w-full" />
              <small v-if="errors.branchId" class="text-red-500">{{ errors.branchId }}</small>
            </div>

            <!-- Source -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('salesmanTargets.form.source') }}</label>
              <SelectButton
                v-if="mode === 'add'"
                v-model="source"
                :options="sourceOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
              />
              <InputText
                v-else
                :value="t(`salesmanTargets.source.${source}`)"
                readonly
                class="w-full"
              />
              <small class="text-surface-500">{{
                t(`salesmanTargets.source.help.${source}`)
              }}</small>
            </div>

            <!-- Principal -->
            <div v-if="source === 'principal'" class="flex flex-col gap-1">
              <label class="text-sm font-semibold">
                {{ t('salesmanTargets.form.principal') }}<span class="ml-0.5 text-red-500">*</span>
              </label>
              <Select
                v-if="mode === 'add'"
                v-model="principalOptionId"
                :options="principalOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('salesmanTargets.form.selectPrincipal')"
                filter
                class="w-full"
                :invalid="!!errors.principalOptionId"
              />
              <InputText v-else :value="target?.principalName" readonly class="w-full" />
              <small v-if="errors.principalOptionId" class="text-red-500">{{
                errors.principalOptionId
              }}</small>
            </div>

            <!-- Principal target -->
            <div v-if="source === 'principal' && types.hasValue" class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{
                t('salesmanTargets.form.principalTarget')
              }}</label>
              <InputNumber
                v-model="principalTargetValue"
                :locale="locale"
                :min="0"
                :min-fraction-digits="0"
                :max-fraction-digits="2"
                prefix="Rp "
                :disabled="readonly"
                show-clear
                class="w-full"
                input-class="w-full"
              />
              <small class="text-surface-500">{{
                t('salesmanTargets.form.principalTargetHint')
              }}</small>
            </div>

            <!-- Level -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold">{{ t('salesmanTargets.form.level') }}</label>
              <div>
                <Tag
                  v-if="level"
                  :value="t(`salesmanTargets.levels.${level}`)"
                  :severity="level === 'category' ? 'info' : 'secondary'"
                />
                <span v-else class="text-sm text-stone-400">—</span>
              </div>
              <small class="text-surface-500">{{ t('salesmanTargets.form.levelHint') }}</small>
            </div>
          </div>

          <!-- Target types -->
          <div class="flex flex-col gap-2">
            <span class="text-sm font-semibold">{{ t('salesmanTargets.form.types') }}</span>
            <div class="flex flex-wrap gap-x-6 gap-y-2">
              <label v-for="kind in typeKinds" :key="kind" class="flex items-center gap-2 text-sm">
                <Checkbox
                  :model-value="types[kind]"
                  binary
                  :disabled="readonly || (types[kind] && enabledTypeCount === 1)"
                  @update:model-value="(v: boolean) => onToggleType(kind, v)"
                />
                {{ t(`salesmanTargets.form.typeLabels.${kind}`) }}
              </label>
            </div>
            <small class="text-surface-500">{{ t('salesmanTargets.form.valueBasis') }}</small>
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('salesmanTargets.form.notes') }}</label>
            <Textarea v-model="notes" rows="2" auto-resize :disabled="readonly" class="w-full" />
          </div>

          <!-- Create-mode guards -->
          <Message
            v-if="mode === 'add' && configMissing"
            severity="warn"
            size="small"
            variant="simple"
          >
            {{ t('salesmanTargets.form.missingConfig') }}
            <RouterLink to="/configs?tab=stg" class="text-primary-500 ml-1 underline">
              {{ t('salesmanTargets.form.missingConfigLink') }}
            </RouterLink>
          </Message>
          <Message
            v-if="mode === 'add' && existingTargetId"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ t('salesmanTargets.form.existingTarget') }}
            <RouterLink
              :to="`/salesman-targets/${existingTargetId}/edit`"
              class="text-primary-500 ml-1 underline"
            >
              {{ t('salesmanTargets.form.openExisting') }}
            </RouterLink>
          </Message>

          <p v-if="mode === 'edit' && metaLine" class="text-xs text-stone-500">{{ metaLine }}</p>
        </div>
      </template>
    </ResponsiveCard>

    <ResponsiveCard v-if="formEnabled" class="mt-6">
      <template #content>
        <div class="flex flex-col gap-6">
          <TargetItemChips
            v-if="types.hasQty && level"
            v-model:items="items"
            :level="level"
            :source="source"
            :readonly="readonly"
            @add="isPickerShown = true"
            @remove="onRemoveItem"
          />

          <SalesmanTargetGrid
            v-model:lines="lines"
            :items="items"
            :types="types"
            :source="source"
            :principal-target-value="principalTargetValue"
            :readonly="readonly"
            :toast-group="toastGroup"
            :confirm-group="confirmGroup"
            @add-line="isAddLineShown = true"
          />
        </div>
      </template>
    </ResponsiveCard>

    <!-- Action bar -->
    <div
      class="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-2 py-3"
    >
      <p class="text-sm text-stone-600">
        {{
          t('salesmanTargets.form.summary', {
            salesmen: lines.length,
            items: types.hasQty ? items.length : 0,
            categories: categoryCount,
            products: productCount,
          })
        }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="showDelete"
          type="button"
          :label="t('salesmanTargets.actions.delete')"
          severity="danger"
          outlined
          :disabled="isLoading"
          @click="onDeleteClick"
        />
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="emit('cancel')"
        />
        <span v-if="showClose" v-tooltip.top="closeTooltip">
          <Button
            type="button"
            :label="t('salesmanTargets.actions.close')"
            severity="contrast"
            :disabled="isLoading || !canClose"
            @click="onCloseClick"
          />
        </span>
        <span
          v-if="showActivate"
          v-tooltip.top="lines.length === 0 ? t('salesmanTargets.actions.activateNeedsLines') : ''"
        >
          <Button
            type="button"
            :label="t('salesmanTargets.actions.activate')"
            severity="success"
            :disabled="isLoading || lines.length === 0"
            @click="onActivateClick"
          />
        </span>
        <Button
          v-if="!readonly"
          type="button"
          :label="isLoading ? '' : saveLabel"
          :icon="isLoading ? 'pi pi-spinner pi-spin' : ''"
          :disabled="isLoading || (mode === 'add' && !canCreate)"
          @click="onSaveClick"
        />
      </div>
    </div>

    <TargetItemPickerDialog
      v-if="branchId && level"
      :visible="isPickerShown"
      :branch-id="branchId"
      :level="level"
      :source="source"
      :principal-option-id="principalOptionId"
      :existing="items"
      @close="isPickerShown = false"
      @add="onAddItems"
    />
    <SalesmanTargetAddLineDialog
      v-if="candidateQuery"
      :visible="isAddLineShown"
      :query="candidateQuery"
      :existing-employee-ids="lines.map((l) => l.employeeId)"
      :toast-group="toastGroup"
      @close="isAddLineShown = false"
      @add="onAddLines"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ConfirmDialog from 'primevue/confirmdialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { SalesmanTargetConfigService, SalesmanTargetsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import type {
  CreateSalesmanTargetRequest,
  SalesmanTarget,
  SalesmanTargetCandidate,
  SalesmanTargetCandidateQuery,
  TargetLevel,
  TargetSource,
  UpdateSalesmanTargetRequest,
} from '@/types/salesmanTarget.type'
import {
  NO_LABEL,
  loadLabelFilterOptions,
  userBranchesFetcher,
} from '../sales-teams/salesTeamHelpers'
import {
  buildPayload,
  fromApiItem,
  lineHasValues,
  type FormItem,
  type FormLine,
  type FormTypes,
} from './salesmanTargetGrid'
import { fromApiPeriod, hasPeriodEnded, periodEnd, toApiPeriod } from './salesmanTargetHelpers'
import MonthPicker from './components/MonthPicker.vue'
import SalesmanTargetGrid from './components/SalesmanTargetGrid.vue'
import SalesmanTargetAddLineDialog from './components/SalesmanTargetAddLineDialog.vue'
import TargetItemChips from './components/TargetItemChips.vue'
import TargetItemPickerDialog from './components/TargetItemPickerDialog.vue'

type TypeKind = keyof FormTypes

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    target?: SalesmanTarget
    isLoading?: boolean
    /** No write permission, or the document is closed. */
    readonly?: boolean
    canActivate?: boolean
    toastGroup: string
  }>(),
  { target: undefined, isLoading: false, readonly: false, canActivate: false },
)

const emit = defineEmits<{
  create: [body: CreateSalesmanTargetRequest]
  save: [body: UpdateSalesmanTargetRequest]
  /** The payload is set when there are unsaved changes to save before activating. */
  activate: [body: UpdateSalesmanTargetRequest | null]
  close: []
  remove: []
  cancel: []
}>()

const { t, locale } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'salesmanTargetForm'

const typeKinds: TypeKind[] = ['hasValue', 'hasQty', 'hasEffectiveCall', 'hasActiveOutlet']

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const target = props.target
const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('salesman_targets')
const code = ref('')

const branchId = ref<number | undefined>(
  target?.branchId ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const period = ref<Date | null>(
  target ? fromApiPeriod(target.period) : dayjs().startOf('month').toDate(),
)
// Local refs, not form state: a SelectButton doesn't repaint on programmatic writes.
const source = ref<TargetSource>(target?.source ?? 'principal')
const principalOptionId = ref<number | undefined>(target?.principalOptionId)
const principalTargetValue = ref<number | null>(
  target?.principalTargetValue !== undefined ? Number(target.principalTargetValue) : null,
)
const types = ref<FormTypes>({
  hasValue: target?.hasValue ?? true,
  hasQty: target?.hasQty ?? true,
  hasEffectiveCall: target?.hasEffectiveCall ?? false,
  hasActiveOutlet: target?.hasActiveOutlet ?? false,
})
const notes = ref(target?.notes ?? '')
const items = ref<FormItem[]>(target ? target.items.map((i) => fromApiItem(i, target.items)) : [])
const lines = ref<FormLine[]>(
  target
    ? target.lines.map((l) => ({
        key: `line-${l.id}`,
        id: l.id,
        employeeId: l.employeeId,
        employeeCode: l.employeeCode,
        employeeName: l.employeeName,
        employeeTypeName: l.employeeTypeName,
        employeeActive: l.employeeActive,
        teamCodes: l.teamCodes ?? [],
        principals: [],
        isNew: false,
        targetValue: l.targetValue !== undefined ? Number(l.targetValue) : null,
        effectiveCall: l.effectiveCall ?? null,
        activeOutlet: l.activeOutlet ?? null,
        cells: { ...(l.cells ?? {}) },
      }))
    : [],
)

// An item's `alsoIn` is a list of item ids; the form refers to items by key.
const errors = ref<Record<string, string>>({})
const isPickerShown = ref(false)
const isAddLineShown = ref(false)

const fetchBranches = userBranchesFetcher(authStore.branchIds)

const sourceOptions = computed(() => [
  { label: t('salesmanTargets.source.principal'), value: 'principal' as TargetSource },
  { label: t('salesmanTargets.source.internal'), value: 'internal' as TargetSource },
])

const principalOptions = ref<{ label: string; value: number }[]>([])
async function loadPrincipalOptions() {
  try {
    const options = await loadLabelFilterOptions('principal', '')
    principalOptions.value = options
      .filter((o) => o.value !== NO_LABEL)
      .map((o) => ({ label: o.label, value: o.value as number }))
  } catch {
    // The principal picker just stays empty.
  }
}

const enabledTypeCount = computed(() => typeKinds.filter((k) => types.value[k]).length)

// ---------------------------------------------------------------------------
// Level: the branch config on create, the document's own afterwards
// ---------------------------------------------------------------------------

const configLevel = ref<TargetLevel | undefined>()
const configLoaded = ref(false)
const level = computed<TargetLevel | undefined>(() => target?.targetLevel ?? configLevel.value)
const configMissing = computed(
  () => props.mode === 'add' && configLoaded.value && !configLevel.value,
)
const existingTargetId = ref<number | undefined>()

async function loadConfig() {
  configLoaded.value = false
  configLevel.value = undefined
  const id = branchId.value
  if (!id) return
  try {
    const config = await SalesmanTargetConfigService.getMyBranch(id)
    if (id !== branchId.value) return
    configLevel.value = config?.targetLevel
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
  configLoaded.value = true
}

/** Everything below the header needs a level and no clashing document. */
const formEnabled = computed(() => {
  if (props.mode === 'edit') return true
  return !!level.value && !existingTargetId.value && !!branchId.value
})

// ---------------------------------------------------------------------------
// Create: key fields, duplicate check and salesmen prefill
// ---------------------------------------------------------------------------

interface AppliedKey {
  branchId?: number
  period: Date | null
  source: TargetSource
  principalOptionId?: number
}
let applied: AppliedKey = {
  branchId: branchId.value,
  period: period.value,
  source: source.value,
  principalOptionId: principalOptionId.value,
}
let reverting = false

function candidateToLine(c: SalesmanTargetCandidate): FormLine {
  return {
    key: `emp-${c.employeeId}`,
    employeeId: c.employeeId,
    employeeCode: c.code,
    employeeName: c.name,
    employeeTypeName: c.typeName,
    employeeActive: true,
    teamCodes: c.teamCodes,
    principals: c.principals,
    isNew: true,
    targetValue: null,
    effectiveCall: null,
    activeOutlet: null,
    cells: {},
  }
}

/** The candidates query, once the key fields allow one. */
const candidateQuery = computed<SalesmanTargetCandidateQuery | undefined>(() => {
  if (!branchId.value || !period.value) return undefined
  if (source.value === 'principal' && !principalOptionId.value) return undefined
  return {
    branchId: branchId.value,
    period: toApiPeriod(period.value),
    source: source.value,
    principalOptionId: source.value === 'principal' ? principalOptionId.value : undefined,
    excludeTargetId: target?.id,
  }
})

async function loadCandidates() {
  const query = candidateQuery.value
  if (!query) {
    existingTargetId.value = undefined
    lines.value = []
    return
  }
  try {
    const res = await SalesmanTargetsService.candidates(query)
    // A late answer for a key no longer selected must not overwrite the current one.
    if (JSON.stringify(query) !== JSON.stringify(candidateQuery.value)) return
    existingTargetId.value = res.existingTargetId
    if (res.existingTargetId) {
      lines.value = []
      return
    }
    // Keep what was entered for salesmen who are still candidates.
    const previous = new Map(lines.value.map((l) => [l.employeeId, l]))
    lines.value = res.data.map((c) => previous.get(c.employeeId) ?? candidateToLine(c))
    toast.add({
      severity: 'info',
      summary: t(
        source.value === 'principal'
          ? 'salesmanTargets.form.prefillPrincipal'
          : 'salesmanTargets.form.prefillInternal',
        { n: lines.value.length },
      ),
      life: 3000,
      group: props.toastGroup,
    })
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  }
}

function snapshotKey() {
  applied = {
    branchId: branchId.value,
    period: period.value,
    source: source.value,
    principalOptionId: principalOptionId.value,
  }
}

async function revertKey() {
  reverting = true
  branchId.value = applied.branchId
  period.value = applied.period
  source.value = applied.source
  principalOptionId.value = applied.principalOptionId
  await nextTick()
  reverting = false
}

async function applyKey(structuralChange: boolean) {
  snapshotKey()
  if (structuralChange) {
    items.value = []
    lines.value = []
  }
  await loadCandidates()
}

async function onKeyChange() {
  if (reverting || props.mode !== 'add') return
  // The branch, source and principal decide which items and salesmen are valid at all.
  const structural =
    branchId.value !== applied.branchId ||
    source.value !== applied.source ||
    principalOptionId.value !== applied.principalOptionId

  if (structural && (items.value.length > 0 || lines.value.some(lineHasValues))) {
    confirm.require({
      group: confirmGroup,
      header: t('salesmanTargets.form.reloadHeader'),
      message: t('salesmanTargets.form.reloadMessage'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('common.confirmation.yes') },
      accept: () => applyKey(true),
      reject: revertKey,
    })
    return
  }
  await applyKey(structural)
}

// Registered first, so the change handler below already sees the cleared principal.
watch(source, (value) => {
  if (value === 'internal') principalOptionId.value = undefined
})
watch([branchId, period, source, principalOptionId], onKeyChange)
watch(branchId, () => {
  if (props.mode === 'add' && !reverting) loadConfig()
})

// ---------------------------------------------------------------------------
// Target types
// ---------------------------------------------------------------------------

function valuesInType(kind: TypeKind): number {
  if (kind === 'hasValue') return lines.value.filter((l) => l.targetValue !== null).length
  if (kind === 'hasEffectiveCall') return lines.value.filter((l) => l.effectiveCall !== null).length
  if (kind === 'hasActiveOutlet') return lines.value.filter((l) => l.activeOutlet !== null).length
  return lines.value.reduce((n, l) => n + Object.keys(l.cells).length, 0)
}

function onToggleType(kind: TypeKind, checked: boolean) {
  if (checked || valuesInType(kind) === 0) {
    types.value = { ...types.value, [kind]: checked }
    return
  }
  confirm.require({
    group: confirmGroup,
    header: t('salesmanTargets.form.clearTypeHeader'),
    message: t('salesmanTargets.form.clearTypeMessage', {
      n: valuesInType(kind),
      type: t(`salesmanTargets.form.typeLabels.${kind}`),
    }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
    accept: () => (types.value = { ...types.value, [kind]: false }),
  })
}

// ---------------------------------------------------------------------------
// Items and salesmen
// ---------------------------------------------------------------------------

function onAddItems(added: FormItem[]) {
  items.value = [...items.value, ...added]
  isPickerShown.value = false
}

function removeItem(item: FormItem) {
  items.value = items.value
    .filter((i) => i.key !== item.key)
    .map((i) => ({ ...i, alsoIn: i.alsoIn.filter((k) => k !== item.key) }))
  for (const line of lines.value) delete line.cells[item.key]
}

function onRemoveItem(item: FormItem) {
  if (!lines.value.some((l) => l.cells[item.key] !== undefined)) {
    removeItem(item)
    return
  }
  confirm.require({
    group: confirmGroup,
    header: t('salesmanTargets.items.removeHeader'),
    message: t('salesmanTargets.items.removeConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
    accept: () => removeItem(item),
  })
}

function onAddLines(candidates: SalesmanTargetCandidate[]) {
  const have = new Set(lines.value.map((l) => l.employeeId))
  lines.value = [
    ...lines.value,
    ...candidates.filter((c) => !have.has(c.employeeId)).map(candidateToLine),
  ]
  isAddLineShown.value = false
}

const categoryCount = computed(() => items.value.filter((i) => i.categoryOptionId).length)
const productCount = computed(() => items.value.filter((i) => i.productId).length)

// ---------------------------------------------------------------------------
// Payload, dirty state and actions
// ---------------------------------------------------------------------------

function currentPayload(): UpdateSalesmanTargetRequest {
  return buildPayload(
    target?.version ?? 0,
    types.value,
    principalTargetValue.value,
    notes.value,
    items.value,
    lines.value,
    source.value,
    level.value ?? 'category',
  )
}

const savedSnapshot = ref('')
const isDirty = computed(() => JSON.stringify(currentPayload()) !== savedSnapshot.value)

const canCreate = computed(() => formEnabled.value && !configMissing.value)
const showActivate = computed(
  () => props.mode === 'edit' && target?.status === 'draft' && props.canActivate,
)
const showClose = computed(
  () => props.mode === 'edit' && target?.status === 'active' && props.canActivate,
)
const showDelete = computed(
  () => props.mode === 'edit' && target?.status === 'draft' && !props.readonly,
)
const saveLabel = computed(() => {
  if (props.mode === 'add' || target?.status === 'draft')
    return t('salesmanTargets.actions.saveDraft')
  return t('salesmanTargets.actions.saveChanges')
})

const canClose = computed(() => !!target && hasPeriodEnded(target.period) && !isDirty.value)
const closeTooltip = computed(() => {
  if (!target) return ''
  if (!hasPeriodEnded(target.period)) {
    return t('salesmanTargets.actions.closeAvailableAfter', {
      date: dayjs(periodEnd(target.period)).format(DateFormat.DATE),
    })
  }
  return isDirty.value ? t('salesmanTargets.actions.closeSaveFirst') : ''
})

function validate(): boolean {
  const next: Record<string, string> = {}
  if (props.mode === 'add') {
    if (codeMode.value === 'manual' && !code.value.trim()) {
      next.code = t('salesmanTargets.validation.codeRequired')
    }
    if (!branchId.value) next.branchId = t('salesmanTargets.validation.branchRequired')
    if (!period.value) next.period = t('salesmanTargets.validation.periodRequired')
    if (source.value === 'principal' && !principalOptionId.value) {
      next.principalOptionId = t('salesmanTargets.validation.principalRequired')
    }
  }
  errors.value = next
  return Object.keys(next).length === 0
}

function onSaveClick() {
  if (!validate()) return
  const body = currentPayload()
  if (props.mode === 'edit') {
    emit('save', body)
    return
  }
  const { version, ...rest } = body
  void version
  emit('create', {
    ...rest,
    code: codeMode.value === 'manual' ? code.value.trim() : undefined,
    branchId: branchId.value!,
    period: toApiPeriod(period.value!),
    source: source.value,
    principalOptionId: source.value === 'principal' ? principalOptionId.value : undefined,
  })
}

function confirmThen(headerKey: string, messageKey: string, accept: () => void) {
  confirm.require({
    group: confirmGroup,
    header: t(headerKey),
    message: t(messageKey),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
    accept,
  })
}

function onActivateClick() {
  confirmThen('salesmanTargets.actions.activate', 'salesmanTargets.actions.activateConfirm', () =>
    emit('activate', isDirty.value ? currentPayload() : null),
  )
}

function onCloseClick() {
  confirmThen('salesmanTargets.actions.close', 'salesmanTargets.actions.closeConfirm', () =>
    emit('close'),
  )
}

function onDeleteClick() {
  confirmThen('salesmanTargets.actions.delete', 'salesmanTargets.actions.deleteConfirm', () =>
    emit('remove'),
  )
}

const metaLine = computed(() => {
  if (!target) return ''
  const parts = [
    t('salesmanTargets.form.createdBy', {
      user: target.createdByName ?? '—',
      date: dayjs(target.createdAt).format(DateFormat.DATE_TIME),
    }),
  ]
  if (target.activatedAt) {
    parts.push(
      t('salesmanTargets.form.activatedBy', {
        user: target.activatedByName ?? '—',
        date: dayjs(target.activatedAt).format(DateFormat.DATE_TIME),
      }),
    )
  }
  if (target.closedAt) {
    parts.push(
      t('salesmanTargets.form.closedBy', {
        user: target.closedByName ?? '—',
        date: dayjs(target.closedAt).format(DateFormat.DATE_TIME),
      }),
    )
  }
  return parts.join(' · ')
})

onMounted(async () => {
  // After the state above has settled, so a fresh form isn't dirty.
  savedSnapshot.value = JSON.stringify(currentPayload())
  if (props.mode === 'add') {
    await Promise.all([loadPrincipalOptions(), loadConfig()])
    await loadCandidates()
  }
})
</script>
