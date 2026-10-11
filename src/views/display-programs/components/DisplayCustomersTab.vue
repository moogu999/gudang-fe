<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />
    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('displayPrograms.customers.search')"
          data-testid="customers-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
      <SelectButton
        v-model="state"
        :options="stateOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        data-testid="customers-state"
      />
      <Button
        v-if="canAdd"
        type="button"
        :label="t('displayPrograms.customers.add')"
        icon="pi pi-plus"
        size="small"
        class="ml-auto"
        data-testid="customers-add"
        @click="isPickerShown = true"
      />
    </div>

    <DataTable
      :value="rows"
      data-key="id"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
    >
      <Column :header="t('displayPrograms.customers.columns.customer')">
        <template #body="{ data }">
          <div class="font-semibold">{{ data.customer.name }}</div>
          <div class="font-mono text-xs text-stone-500">
            {{ [data.customer.code, data.customer.city].filter(Boolean).join(' · ') }}
          </div>
        </template>
      </Column>
      <Column :header="t('displayPrograms.customers.columns.outletType')">
        <template #body="{ data }">{{ data.customer.outletType ?? '—' }}</template>
      </Column>
      <Column :header="t('displayPrograms.customers.columns.joined')">
        <template #body="{ data }">{{ formatDate(data.joinDate, locale) }}</template>
      </Column>
      <Column :header="t('displayPrograms.customers.columns.rent')">
        <template #body="{ data }">
          <span v-if="formatRent(data.effectiveRent, locale)">{{
            formatRent(data.effectiveRent, locale)
          }}</span>
          <span v-else class="text-stone-400">—</span>
          <Tag
            v-if="data.rentOverride !== undefined"
            :value="t('displayPrograms.customers.override')"
            severity="secondary"
            class="ml-2"
          />
        </template>
      </Column>
      <Column :header="t('displayPrograms.customers.columns.status')">
        <template #body="{ data }">
          <Tag
            v-if="data.exitDate === undefined"
            :value="t('displayPrograms.customers.active')"
            severity="success"
          />
          <Tag
            v-else
            :value="
              t('displayPrograms.customers.exited', { date: formatDate(data.exitDate, locale) })
            "
            severity="secondary"
          />
        </template>
      </Column>
      <Column v-if="canWrite && !ended" style="width: 4rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-ellipsis-v"
            severity="contrast"
            text
            rounded
            size="small"
            :aria-label="t('displayPrograms.list.moreActions')"
            data-testid="customer-menu"
            @click="(e: MouseEvent) => openRowMenu(e, data as DisplayParticipant)"
          />
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">
          {{ t('displayPrograms.customers.empty') }}
        </div>
      </template>
    </DataTable>

    <small v-if="canWrite && status === 'active'" class="text-surface-500 mt-2 block">{{
      t('displayPrograms.customers.useExit')
    }}</small>

    <DisplayCustomerPickerDialog
      v-if="isPickerShown"
      :program-id="programId"
      :start-date="startDate"
      :end-date="endDate"
      :saving="saving"
      :toast-group="toastGroup"
      @close="isPickerShown = false"
      @confirm="onAdd"
    />
    <DisplayParticipantDialog
      v-if="editing"
      :participant="editing"
      :start-date="startDate"
      :end-date="endDate"
      :saving="saving"
      @close="editing = undefined"
      @save="onUpdate"
    />
    <DisplayParticipantExitDialog
      v-if="exiting"
      :participant="exiting"
      :end-date="endDate"
      :saving="saving"
      @close="exiting = undefined"
      @confirm="onExit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import type { MenuItem } from 'primevue/menuitem'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { DisplayProgramsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type {
  DisplayParticipant,
  DisplayParticipantState,
  DisplayProgramDisplayStatus,
} from '@/types/displayProgram.type'
import { formatDate, formatRent } from '../displayProgramHelpers'
import { displayProgramErrorCode, translateDisplayProgramError } from '../displayProgramErrors'
import DisplayCustomerPickerDialog from './DisplayCustomerPickerDialog.vue'
import DisplayParticipantDialog from './DisplayParticipantDialog.vue'
import DisplayParticipantExitDialog from './DisplayParticipantExitDialog.vue'

const props = defineProps<{
  programId: number
  version: number
  status: DisplayProgramDisplayStatus
  startDate: string
  endDate: string
  canWrite: boolean
  toastGroup: string
}>()

const emit = defineEmits<{
  /** A write succeeded; the program has this version now. */
  changed: [version: number]
  /** The program changed under this view. */
  stale: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'displayCustomersTabConfirm'

const pageSize = 10
const search = ref('')
const state = ref<DisplayParticipantState>('open')
const rows = ref<DisplayParticipant[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const saving = ref(false)

const isPickerShown = ref(false)
const editing = ref<DisplayParticipant | undefined>()
const exiting = ref<DisplayParticipant | undefined>()

const ended = computed(() => props.status === 'ended')
const canAdd = computed(() => props.canWrite && !ended.value)

const stateOptions = computed(() =>
  (['open', 'exited', 'all'] as DisplayParticipantState[]).map((s) => ({
    label: t(`displayPrograms.customers.state.${s}`),
    value: s,
  })),
)

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const res = await DisplayProgramsService.participants(props.programId, {
      q: search.value.trim() || undefined,
      state: state.value,
      limit: pageSize,
      offset: p * pageSize,
    })
    rows.value = res.data ?? []
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(translateDisplayProgramError(e, t), props.toastGroup))
  } finally {
    loading.value = false
  }
}

watch(state, () => fetchPage(0))

onMounted(async () => {
  // nextTick: the program id arrives through props, so let them settle before the first read.
  await nextTick()
  fetchPage(0)
})

// ---------------------------------------------------------------------------
// Writes: each carries the version, and each answers with the next one
// ---------------------------------------------------------------------------

async function run(action: () => Promise<number>, message: string): Promise<boolean> {
  saving.value = true
  try {
    const version = await action()
    emit('changed', version)
    toast.add(commonSuccessToast(message, props.toastGroup))
    await fetchPage(page.value)
    return true
  } catch (e) {
    if (displayProgramErrorCode(e) === 'DISPLAY_PROGRAM_STALE') emit('stale')
    else toast.add(commonErrorToast(translateDisplayProgramError(e, t), props.toastGroup))
    return false
  } finally {
    saving.value = false
  }
}

async function onAdd(body: { customerIds: number[]; joinDate: string; rentOverride?: string }) {
  let skipped = 0
  const ok = await run(async () => {
    const res = await DisplayProgramsService.addParticipants(props.programId, {
      version: props.version,
      ...body,
    })
    skipped = res.skippedCustomerIds?.length ?? 0
    return res.version
  }, t('displayPrograms.messages.customersAdded'))
  if (!ok) return
  isPickerShown.value = false
  if (skipped > 0) {
    toast.add({
      severity: 'info',
      summary: t('displayPrograms.customers.skipped', { n: skipped }),
      life: 5000,
      group: props.toastGroup,
    })
  }
}

async function onUpdate(body: { joinDate: string; rentOverride?: string }) {
  const target = editing.value
  if (!target) return
  const ok = await run(
    async () =>
      (
        await DisplayProgramsService.updateParticipant(props.programId, target.id, {
          version: props.version,
          ...body,
        })
      ).version,
    t('displayPrograms.messages.customerUpdated'),
  )
  if (ok) editing.value = undefined
}

async function onExit(exitDate: string) {
  const target = exiting.value
  if (!target) return
  const ok = await run(
    async () =>
      (
        await DisplayProgramsService.exitParticipant(props.programId, target.id, {
          version: props.version,
          exitDate,
        })
      ).version,
    t('displayPrograms.messages.customerExited'),
  )
  if (ok) exiting.value = undefined
}

function onRemove(row: DisplayParticipant) {
  confirm.require({
    group: confirmGroup,
    header: t('displayPrograms.customers.remove'),
    message: t('displayPrograms.customers.removeConfirm', { name: row.customer.name }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('displayPrograms.customers.remove'), severity: 'danger' },
    accept: () =>
      run(
        async () =>
          (await DisplayProgramsService.removeParticipant(props.programId, row.id, props.version))
            .version,
        t('displayPrograms.messages.customerRemoved'),
      ),
  })
}

// ---------------------------------------------------------------------------
// Row menu
// ---------------------------------------------------------------------------

const rowMenu = ref()
const menuRow = ref<DisplayParticipant | undefined>()

const rowMenuItems = computed<MenuItem[]>(() => {
  const row = menuRow.value
  if (!row) return []
  const items: MenuItem[] = [
    {
      label: t('displayPrograms.customers.edit'),
      icon: 'pi pi-pen-to-square',
      command: () => (editing.value = row),
    },
  ]
  if (row.exitDate === undefined && props.status === 'active') {
    items.push({
      label: t('displayPrograms.customers.exit'),
      icon: 'pi pi-sign-out',
      command: () => (exiting.value = row),
    })
  }
  // Once the program is active a customer can only exit, so the days it was in still count.
  if (props.status === 'draft' || props.status === 'scheduled') {
    items.push({
      label: t('displayPrograms.customers.remove'),
      icon: 'pi pi-trash',
      command: () => onRemove(row),
    })
  }
  return items
})

function openRowMenu(event: MouseEvent, row: DisplayParticipant) {
  menuRow.value = row
  nextTick(() => rowMenu.value?.toggle(event))
}

/** Lets the parent re-read the table after it reloaded the program. */
defineExpose({ reload: () => fetchPage(page.value) })
</script>
