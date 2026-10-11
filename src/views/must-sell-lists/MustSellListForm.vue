<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <Message v-if="mode === 'add' && configMissing" severity="warn" data-testid="config-missing">
      {{ t('mustSellLists.form.missingConfig') }}
      <RouterLink to="/configs?tab=msl" class="text-primary-500 ml-1 underline">
        {{ t('mustSellLists.form.missingConfigLink') }}
      </RouterLink>
    </Message>

    <template v-if="formEnabled">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="flex flex-col gap-6">
          <ResponsiveCard>
            <template #content>
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6">
                  <!-- Code -->
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">{{ t('mustSellLists.form.code') }}</label>
                    <template v-if="mode === 'add'">
                      <div class="mb-1 flex gap-2">
                        <Button
                          type="button"
                          :label="t('mustSellLists.form.codeAuto')"
                          :severity="codeMode === 'auto' ? 'primary' : 'secondary'"
                          size="small"
                          :disabled="!hasDefaultSeries || numberSeriesLoading"
                          @click="codeMode = 'auto'"
                        />
                        <Button
                          type="button"
                          :label="t('mustSellLists.form.codeManual')"
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
                          t('mustSellLists.form.codeAssignedOnSave')
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
                    <InputText v-else :value="list?.code" readonly class="w-full font-mono" />
                    <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
                  </div>

                  <!-- Branch -->
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">
                      {{ t('mustSellLists.form.branch') }}<span class="ml-0.5 text-red-500">*</span>
                    </label>
                    <InfiniteSelect
                      v-if="mode === 'add'"
                      v-model="branchId"
                      :fetch-fn="fetchBranches"
                      :option-label="branchLabel"
                      option-value="id"
                      :placeholder="t('mustSellLists.form.selectBranch')"
                      class="w-full"
                    />
                    <InputText v-else :value="list?.branchName" readonly class="w-full" />
                    <small v-if="errors.branchId" class="text-red-500">{{ errors.branchId }}</small>
                  </div>

                  <!-- Name -->
                  <div class="flex flex-col gap-1 md:col-span-2">
                    <label class="text-sm font-semibold">
                      {{ t('mustSellLists.form.name') }}<span class="ml-0.5 text-red-500">*</span>
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
                    <label class="text-sm font-semibold">
                      {{ t('mustSellLists.form.principal')
                      }}<span class="ml-0.5 text-red-500">*</span>
                    </label>
                    <Select
                      :model-value="principalOptionId"
                      :options="principalOptions"
                      option-label="label"
                      option-value="value"
                      :placeholder="t('mustSellLists.form.selectPrincipal')"
                      :disabled="readonly || locks.principal"
                      :invalid="!!errors.principalOptionId"
                      filter
                      class="w-full"
                      data-testid="principal-select"
                      @update:model-value="onPrincipalChange"
                    />
                    <small v-if="mode === 'edit' && locks.principal" class="text-surface-500">{{
                      t('mustSellLists.form.principalLocked')
                    }}</small>
                    <small v-if="errors.principalOptionId" class="text-red-500">{{
                      errors.principalOptionId
                    }}</small>
                  </div>

                  <!-- Scope level -->
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">{{ t('mustSellLists.form.level') }}</label>
                    <div>
                      <Tag v-if="level" :value="t(scopeLevelLabelKey(level))" severity="info" />
                    </div>
                    <small class="text-surface-500">{{ t('mustSellLists.form.levelHint') }}</small>
                  </div>

                  <!-- Dates -->
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">
                      {{ t('mustSellLists.form.startDate')
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
                      t('mustSellLists.form.startLocked')
                    }}</small>
                    <small v-if="errors.startDate" class="text-red-500">{{
                      errors.startDate
                    }}</small>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">
                      {{ t('mustSellLists.form.endDate')
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
                  <label class="text-sm font-semibold">{{ t('mustSellLists.form.notes') }}</label>
                  <Textarea
                    v-model="notes"
                    rows="2"
                    maxlength="500"
                    auto-resize
                    :disabled="readonly"
                    class="w-full"
                  />
                </div>

                <!-- Settings -->
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch
                      v-model="showInCanvass"
                      input-id="showInCanvass"
                      :disabled="readonly"
                    />
                    <label for="showInCanvass" class="text-sm font-semibold">{{
                      t('mustSellLists.form.showInCanvass')
                    }}</label>
                  </div>
                  <small class="text-surface-500">{{
                    t('mustSellLists.form.showInCanvassHint')
                  }}</small>
                </div>

                <Message
                  v-if="mode === 'edit' && list?.displayStatus === 'active'"
                  severity="info"
                  size="small"
                  variant="simple"
                >
                  {{ t('mustSellLists.form.activeNote') }}
                </Message>
                <p v-if="mode === 'edit' && metaLine" class="text-xs text-stone-500">
                  {{ metaLine }}
                </p>
              </div>
            </template>
          </ResponsiveCard>

          <MslScopeCard
            v-if="level"
            v-model:scope-all="scopeAll"
            v-model:values="scopeValues"
            :level="level"
            :readonly="readonly"
            :error="errors.scope"
            :toast-group="toastGroup"
          />

          <MslProductsTable
            v-model:items="items"
            :readonly="readonly"
            :need-principal="!principalOptionId"
            :error="errors.items"
            @add-product="isPickerShown = true"
            @add-from-category="isCategoryPickerShown = true"
          />
        </div>

        <div class="flex flex-col gap-6">
          <MslReachPanel
            :count="preview?.customerCount"
            :loading="previewLoading"
            :can-view="canViewCustomers"
            @view="isCustomersShown = true"
          />
          <MslOverlapPanel :overlaps="preview?.overlaps ?? []" :items="items" />
        </div>
      </div>

      <!-- Action bar -->
      <div
        class="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-2 py-3"
      >
        <p class="text-sm text-stone-600">
          {{
            t('mustSellLists.form.summary', {
              products: items.length,
              customers: preview?.customerCount ?? 0,
            })
          }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="showDelete"
            type="button"
            :label="t('mustSellLists.actions.delete')"
            severity="danger"
            outlined
            :disabled="isLoading"
            data-testid="action-delete"
            @click="onDeleteClick"
          />
          <Button
            v-if="showDuplicate"
            type="button"
            :label="t('mustSellLists.actions.duplicate')"
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
            :label="t('mustSellLists.actions.endEarly')"
            severity="contrast"
            :disabled="isLoading"
            data-testid="action-end-early"
            @click="onEndEarlyClick"
          />
          <Button
            v-if="showUnpublish"
            type="button"
            :label="t('mustSellLists.actions.unpublish')"
            severity="contrast"
            :disabled="isLoading"
            data-testid="action-unpublish"
            @click="onUnpublishClick"
          />
          <span v-if="showPublish" v-tooltip.top="publishDisabledReason">
            <Button
              type="button"
              :label="t('mustSellLists.actions.publish')"
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

    <MslProductPickerDialog
      v-if="isPickerShown && principalOptionId"
      :principal-option-id="principalOptionId"
      :exclude-ids="items.map((i) => i.productId)"
      :toast-group="toastGroup"
      @close="isPickerShown = false"
      @select="onAddProducts"
    />
    <MslCategoryPickerDialog
      v-if="isCategoryPickerShown && principalOptionId"
      :principal-option-id="principalOptionId"
      :toast-group="toastGroup"
      @close="isCategoryPickerShown = false"
      @select="onAddProducts"
    />
    <MslCustomersDialog
      v-if="branchId && level"
      :visible="isCustomersShown"
      :branch-id="branchId"
      :scope-level="level"
      :scope-all="scopeAll"
      :scope-value-ids="scopeValueIds"
      :toast-group="toastGroup"
      @close="isCustomersShown = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { MustSellListConfigService, MustSellListsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import { useAuthStore } from '@/stores'
import { branchLabel } from '@/utils/branchHelper'
import DateFormat from '@/constants/dateFormat'
import type {
  CreateMustSellListRequest,
  MslPreview,
  MslProductOption,
  MslScopeLevel,
  MslScopeValue,
  MustSellList,
  UpdateMustSellListRequest,
} from '@/types/mustSellList.type'
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
  fieldLocks,
  fromApiItem,
  fromProductOption,
  isValidMinQty,
  scopeLevelLabelKey,
  toApiDate,
  type FormState,
  type FormItem,
} from './mustSellListHelpers'
import MslCategoryPickerDialog from './components/MslCategoryPickerDialog.vue'
import MslCustomersDialog from './components/MslCustomersDialog.vue'
import MslOverlapPanel from './components/MslOverlapPanel.vue'
import MslProductPickerDialog from './components/MslProductPickerDialog.vue'
import MslProductsTable from './components/MslProductsTable.vue'
import MslReachPanel from './components/MslReachPanel.vue'
import MslScopeCard from './components/MslScopeCard.vue'

const props = withDefaults(
  defineProps<{
    mode: 'add' | 'edit'
    list?: MustSellList
    isLoading?: boolean
    /** No write permission, or the list has ended. */
    readonly?: boolean
    canWrite?: boolean
    canPublish?: boolean
    toastGroup: string
  }>(),
  { list: undefined, isLoading: false, readonly: false, canWrite: false, canPublish: false },
)

const emit = defineEmits<{
  create: [body: CreateMustSellListRequest, setCodeError: (message: string) => void]
  save: [body: UpdateMustSellListRequest]
  /** The payload is set when there are unsaved changes to save before publishing. */
  publish: [body: UpdateMustSellListRequest | null]
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
const confirmGroup = 'mustSellListForm'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const list = props.list
const {
  codeMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('must_sell_lists')
const code = ref('')

const branchId = ref<number | undefined>(
  list?.branchId ?? authStore.primaryBranchId ?? authStore.branchIds[0],
)
const name = ref(list?.name ?? '')
const principalOptionId = ref<number | undefined>(list?.principalOptionId)
const startDate = ref<Date | null>(
  list ? fromApiDate(list.startDate) : dayjs().startOf('day').toDate(),
)
const endDate = ref<Date | null>(list ? fromApiDate(list.endDate) : null)
const notes = ref(list?.notes ?? '')
const showInCanvass = ref(list?.showInCanvass ?? false)
const scopeAll = ref(list?.scopeAll ?? false)
const scopeValues = ref<MslScopeValue[]>(list?.scopeValues ? [...list.scopeValues] : [])
const items = ref<FormItem[]>((list?.items ?? []).map(fromApiItem))

const errors = ref<Record<string, string>>({})
const isPickerShown = ref(false)
const isCategoryPickerShown = ref(false)
const isCustomersShown = ref(false)

const fetchBranches = userBranchesFetcher(authStore.branchIds)

const locks = computed(() => fieldLocks(list?.displayStatus))
const scopeValueIds = computed(() => scopeValues.value.filter((v) => !v.deleted).map((v) => v.id))

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

/** Today, or the start date when it is later: the earliest an end date can be. */
const endMinDate = computed(() => {
  const today = dayjs().startOf('day')
  const start = startDate.value ? dayjs(startDate.value).startOf('day') : null
  if (locks.value.endDateFromToday) return (start && start.isAfter(today) ? start : today).toDate()
  return start?.toDate()
})

// ---------------------------------------------------------------------------
// Level: the branch config on create, the list's own afterwards
// ---------------------------------------------------------------------------

const configLevel = ref<MslScopeLevel | undefined>()
const configLoaded = ref(false)
const level = computed<MslScopeLevel | undefined>(() => list?.scopeLevel ?? configLevel.value)
const configMissing = computed(
  () => props.mode === 'add' && configLoaded.value && !configLevel.value,
)

async function loadConfig() {
  configLoaded.value = false
  configLevel.value = undefined
  const id = branchId.value
  if (!id) return
  try {
    const config = await MustSellListConfigService.getMyBranch(id)
    if (id !== branchId.value) return
    configLevel.value = config?.scopeLevel
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
// Principal: items are bound to it
// ---------------------------------------------------------------------------

function onPrincipalChange(value: number) {
  if (value === principalOptionId.value) return
  if (items.value.length === 0) {
    principalOptionId.value = value
    return
  }
  confirm.require({
    group: confirmGroup,
    header: t('mustSellLists.form.principalChangeHeader'),
    message: t('mustSellLists.form.principalChangeConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.actions.confirm') },
    accept: () => {
      principalOptionId.value = value
      items.value = []
    },
  })
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function onAddProducts(options: MslProductOption[]) {
  const existing = new Set(items.value.map((i) => i.productId))
  const fresh = options.filter((o) => !existing.has(o.productId))
  items.value = [...items.value, ...fresh.map(fromProductOption)]
  isPickerShown.value = false
  isCategoryPickerShown.value = false
  const skipped = options.length - fresh.length
  if (skipped > 0) {
    toast.add({
      severity: 'info',
      summary: t('mustSellLists.products.addedSkipped', { added: fresh.length, skipped }),
      life: 3000,
      group: props.toastGroup,
    })
  }
}

// ---------------------------------------------------------------------------
// Reach and overlap: one debounced preview of the unsaved state
// ---------------------------------------------------------------------------

const preview = ref<MslPreview | undefined>()
const previewLoading = ref(false)
let previewSeq = 0
let previewTimer: ReturnType<typeof setTimeout> | undefined

const hasScope = computed(() => scopeAll.value || scopeValueIds.value.length > 0)
const canViewCustomers = computed(() => !!branchId.value && !!level.value && hasScope.value)

async function loadPreview() {
  const seq = ++previewSeq
  if (!branchId.value || !level.value) return
  if (!hasScope.value) {
    preview.value = { customerCount: 0, overlaps: [] }
    previewLoading.value = false
    return
  }
  previewLoading.value = true
  try {
    const res = await MustSellListsService.preview(
      buildPreviewPayload(currentState(), level.value, list?.id),
    )
    // A late answer for a state no longer shown must not overwrite the current one.
    if (seq !== previewSeq) return
    preview.value = res
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

function currentState(): FormState {
  return {
    code: props.mode === 'add' && codeMode.value === 'manual' ? code.value : undefined,
    branchId: branchId.value,
    name: name.value,
    principalOptionId: principalOptionId.value ?? 0,
    startDate: startDate.value ? toApiDate(startDate.value) : '',
    endDate: endDate.value ? toApiDate(endDate.value) : '',
    notes: notes.value,
    scopeAll: scopeAll.value,
    scopeValueIds: scopeValueIds.value,
    showInCanvass: showInCanvass.value,
    items: items.value,
  }
}

const savedSnapshot = ref('')
const isDirty = computed(
  () => props.mode === 'edit' && JSON.stringify(currentState()) !== savedSnapshot.value,
)

watch(
  () => JSON.stringify(currentState()),
  () => {
    if (formEnabled.value) schedulePreview()
  },
)

function validate(): boolean {
  const next: Record<string, string> = {}
  if (props.mode === 'add' && !branchId.value) {
    next.branchId = t('mustSellLists.validation.branchRequired')
  }
  if (props.mode === 'add' && codeMode.value === 'manual' && !code.value.trim()) {
    next.code = t('mustSellLists.validation.codeRequired')
  }
  if (!name.value.trim()) next.name = t('mustSellLists.validation.nameRequired')
  if (!principalOptionId.value) {
    next.principalOptionId = t('mustSellLists.validation.principalRequired')
  }
  if (!startDate.value) next.startDate = t('mustSellLists.validation.startRequired')
  if (!endDate.value) next.endDate = t('mustSellLists.validation.endRequired')
  if (startDate.value && endDate.value) {
    const end = dayjs(endDate.value).startOf('day')
    if (end.isBefore(dayjs(startDate.value).startOf('day'))) {
      next.endDate = t('mustSellLists.validation.endBeforeStart')
    } else if (locks.value.endDateFromToday && end.isBefore(dayjs().startOf('day'))) {
      next.endDate = t('mustSellLists.validation.endBeforeToday')
    }
  }
  if (!hasScope.value) next.scope = t('mustSellLists.validation.scopeRequired')
  if (items.value.some((i) => !isValidMinQty(i.minQty))) {
    next.items = t('mustSellLists.products.minQtyInvalid')
  }
  errors.value = next
  return Object.keys(next).length === 0
}

function onSaveClick() {
  if (!validate()) return
  const state = currentState()
  if (props.mode === 'edit' && list) {
    emit('save', buildUpdatePayload(state, list.version))
    return
  }
  emit('create', buildCreatePayload(state), (message) => {
    errors.value = { ...errors.value, code: message }
  })
}

const canCreate = computed(() => !!branchId.value && !!level.value && !!name.value.trim())

const saveLabel = computed(() =>
  props.mode === 'add' ? t('mustSellLists.actions.saveDraft') : t('mustSellLists.actions.save'),
)

// ---------------------------------------------------------------------------
// Status actions
// ---------------------------------------------------------------------------

const status = computed(() => list?.displayStatus)
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
  if (items.value.length === 0) return t('mustSellLists.actions.publishNeedsProducts')
  if (!hasScope.value) return t('mustSellLists.actions.publishNeedsScope')
  if (endDate.value && dayjs(endDate.value).startOf('day').isBefore(dayjs().startOf('day'))) {
    return t('mustSellLists.actions.publishEndInPast')
  }
  return ''
})

function onPublishClick() {
  // Unsaved changes are saved first, then the new version is published.
  if (isDirty.value) {
    if (!validate() || !list) return
    emit('publish', buildUpdatePayload(currentState(), list.version))
    return
  }
  emit('publish', null)
}

function onUnpublishClick() {
  confirm.require({
    group: confirmGroup,
    header: t('mustSellLists.actions.unpublish'),
    message: t('mustSellLists.actions.unpublishConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('mustSellLists.actions.unpublish') },
    accept: () => emit('unpublish'),
  })
}

function onEndEarlyClick() {
  confirm.require({
    group: confirmGroup,
    header: t('mustSellLists.actions.endEarly'),
    message: t('mustSellLists.actions.endEarlyConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('mustSellLists.actions.endEarly') },
    accept: () => emit('endEarly'),
  })
}

function onDeleteClick() {
  confirm.require({
    group: confirmGroup,
    header: t('mustSellLists.actions.delete'),
    message: t('mustSellLists.actions.deleteConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('mustSellLists.actions.delete'), severity: 'danger' },
    accept: () => emit('remove'),
  })
}

const metaLine = computed(() => {
  if (!list) return ''
  const parts = [
    t('mustSellLists.form.created', {
      by: list.createdByName ?? '—',
      at: dayjs(list.createdAt).format(DateFormat.DATE_TIME),
    }),
  ]
  if (list.updatedAt) {
    parts.push(
      t('mustSellLists.form.lastChanged', {
        by: list.updatedByName ?? '—',
        at: dayjs(list.updatedAt).format(DateFormat.DATE_TIME),
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
  if (props.mode === 'add') await loadConfig()
  // Let the child components settle their initial values before the baseline is taken.
  await nextTick()
  savedSnapshot.value = JSON.stringify(currentState())
  if (formEnabled.value) loadPreview()
})

onBeforeUnmount(() => clearTimeout(previewTimer))
</script>
