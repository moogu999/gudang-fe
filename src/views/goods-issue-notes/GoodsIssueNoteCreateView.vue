<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="submitAcceptHandler" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('goodsIssueNotes.createTitle') }}
      </h1>
    </div>

    <!-- Header card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <!-- Picking List selector -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">
              {{ t('goodsIssueNotes.picker.title') }}
              <span class="ml-1 text-red-500">*</span>
            </label>
            <InfiniteSelect
              v-model="selectedPickingListId"
              option-label="no"
              option-value="id"
              :fetch-fn="(q) => GoodsIssueNotesService.listAvailablePickingLists(q)"
              :placeholder="t('goodsIssueNotes.picker.placeholder')"
              sort-by="no"
              sort-operator="asc"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ option.no }}</span>
                  <span class="text-xs text-stone-500">{{ option.deliveryNoteNo }}</span>
                </div>
              </template>
            </InfiniteSelect>
          </div>

          <!-- GIN Number mode -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">{{ t('goodsIssueNotes.numberMode.label') }}</label>
            <div class="flex gap-2">
              <Button
                type="button"
                :label="t('goodsIssueNotes.numberMode.auto')"
                :severity="numberMode === 'auto' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'auto'"
              />
              <Button
                type="button"
                :label="t('goodsIssueNotes.numberMode.manual')"
                :severity="numberMode === 'manual' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'manual'"
              />
            </div>
            <div v-if="numberMode === 'auto'" class="mt-1 flex flex-col gap-1">
              <InputText
                :value="previewLoading ? '' : previewNo"
                :placeholder="previewLoading ? t('common.messages.loading') : ''"
                readonly
                class="w-full sm:w-80"
              />
              <small class="text-surface-500">{{
                t('goodsIssueNotes.numberMode.assignedOnSave')
              }}</small>
            </div>
            <InputText
              v-else
              v-model="manualNo"
              class="mt-1 w-full sm:w-80"
              :placeholder="t('goodsIssueNotes.numberMode.manualPlaceholder')"
            />
          </div>

          <!-- Issue Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold" for="issueDate">
              {{ t('goodsIssueNotes.fields.issueDate') }}
            </label>
            <DatePicker
              id="issueDate"
              v-model="issueDate"
              date-format="dd/mm/yy"
              class="w-full"
              show-icon
            />
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold" for="ginNotes">
              {{ t('goodsIssueNotes.fields.notes') }}
            </label>
            <Textarea id="ginNotes" v-model="notes" rows="2" class="w-full" auto-resize />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Items preview (shown after a PL is selected) -->
    <template v-if="selectedPickingListId !== null">
      <div v-if="plLoading" class="mb-4 flex justify-center py-8">
        <i class="pi pi-spin pi-spinner text-primary text-3xl" />
      </div>

      <div v-else-if="plDetail" class="space-y-4">
        <ResponsiveCard v-for="section in groupedSections" :key="section.label">
          <template #content>
            <p class="mb-3 text-sm font-semibold text-stone-700">{{ section.label }}</p>
            <DataTable :value="section.items" class="text-sm" size="small">
              <Column :header="t('goodsIssueNotes.detail.product')">
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.productCode }}</span>
                    <span class="text-xs text-stone-500">{{ data.productName }}</span>
                  </div>
                </template>
              </Column>
              <Column :header="t('goodsIssueNotes.detail.warehouse')">
                <template #body="{ data }">{{ data.warehouseName }}</template>
              </Column>
              <Column :header="t('goodsIssueNotes.detail.quantity')">
                <template #body="{ data }">
                  <div class="flex flex-col gap-0.5">
                    <span>{{ formatTierQty(data) }}</span>
                    <span v-if="uomLabel(data)" class="text-xs text-stone-400">
                      {{ uomLabel(data) }}
                    </span>
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
              </template>
            </DataTable>
          </template>
        </ResponsiveCard>
      </div>
    </template>

    <!-- Actions -->
    <div class="mt-4 flex justify-end gap-3">
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        outlined
        @click="router.back()"
      />
      <Button
        :label="t('goodsIssueNotes.actions.submit')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmitClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import {
  GoodsIssueNotesService,
  PickingListsService,
  NumberSeriesService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { PickingListDetail, PickingListDetailItem } from '@/types'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const toastGroup = 'goodsIssueNoteCreate'

const selectedPickingListId = ref<number | null>(null)
const issueDate = ref<Date>(new Date())
const notes = ref('')
const numberMode = ref<'auto' | 'manual'>('auto')
const manualNo = ref('')
const previewNo = ref('')
const previewLoading = ref(false)

const plDetail = ref<PickingListDetail | null>(null)
const plLoading = ref(false)
const submitting = ref(false)
const submitAcceptHandler = ref(async () => {})

interface Section {
  label: string
  items: PickingListDetailItem[]
}

const groupedSections = computed<Section[]>(() => {
  if (!plDetail.value) return []

  const sectionMap = new Map<string, PickingListDetailItem[]>()
  for (const item of plDetail.value.items) {
    const key = item.labelValue ?? '__uncategorized__'
    if (!sectionMap.has(key)) sectionMap.set(key, [])
    sectionMap.get(key)!.push(item)
  }

  const sections: Section[] = []
  const uncategorized: PickingListDetailItem[] = []

  for (const [key, items] of sectionMap.entries()) {
    if (key === '__uncategorized__') {
      uncategorized.push(...items)
    } else {
      sections.push({ label: key, items })
    }
  }

  sections.sort((a, b) => a.label.localeCompare(b.label))
  if (uncategorized.length > 0) {
    sections.push({ label: t('goodsIssueNotes.detail.uncategorized'), items: uncategorized })
  }

  return sections
})

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return decStr
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function formatTierQty(item: PickingListDetailItem): string {
  const levels = pinnedToLevels(item.pinnedUom)
  if (!levels || levels.length <= 1) return formatQty(item.quantity)
  return decomposeBaseQty(parseFloat(item.quantity), levels).join(' / ')
}

function uomLabel(item: PickingListDetailItem): string | undefined {
  const levels = pinnedToLevels(item.pinnedUom)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await NumberSeriesService.preview('goods_issue_notes')
    previewNo.value = res.code
  } catch {
    previewNo.value = ''
  } finally {
    previewLoading.value = false
  }
}

onMounted(loadPreview)

async function fetchPlDetail(id: number) {
  plLoading.value = true
  plDetail.value = null
  try {
    plDetail.value = await PickingListsService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    plLoading.value = false
  }
}

watch(selectedPickingListId, (id) => {
  if (id !== null) {
    fetchPlDetail(id)
  } else {
    plDetail.value = null
  }
})

function onSubmitClick() {
  if (selectedPickingListId.value === null) {
    toast.add({
      severity: 'warn',
      summary: t('goodsIssueNotes.messages.noPlSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  if (numberMode.value === 'manual' && !manualNo.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: t('goodsIssueNotes.messages.noManualNo'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  submitAcceptHandler.value = async () => {
    if (selectedPickingListId.value === null) return
    submitting.value = true
    try {
      const res = await GoodsIssueNotesService.create({
        no: numberMode.value === 'manual' ? manualNo.value.trim() : null,
        pickingListId: selectedPickingListId.value,
        issueDate: dayjs(issueDate.value).format('YYYY-MM-DD'),
        notes: notes.value.trim() || null,
      })
      toast.add(
        commonSuccessToast(t('goodsIssueNotes.messages.submitSuccess', { no: res.no }), toastGroup),
      )
      setTimeout(() => {
        router.push({ name: 'GoodsIssueNoteDetail', params: { id: res.goodsIssueNoteId } })
      }, 1200)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    } finally {
      submitting.value = false
    }
  }

  confirm.require({
    group: toastGroup,
    header: t('goodsIssueNotes.actions.submit'),
    message: t('goodsIssueNotes.messages.confirmSubmit'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('goodsIssueNotes.actions.submit'), severity: 'primary' },
  })
}
</script>
