<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('goodsReturnNotes.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <!-- Header card -->
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.no')
              }}</span>
              <span class="font-medium">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.status')
              }}</span>
              <Tag
                class="w-fit"
                severity="success"
                :value="t(`goodsReturnNotes.status.${detail.status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.returnDate')
              }}</span>
              <span>{{ dayjs(detail.returnDate).format(DateFormat.DATE) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.driver')
              }}</span>
              <span>{{ detail.driverName }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.createdAt')
              }}</span>
              <span>{{ dayjs(detail.createdAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div v-if="detail.notes" class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('goodsReturnNotes.fields.notes')
              }}</span>
              <span class="whitespace-pre-line">{{ detail.notes }}</span>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <!-- Items grouped by source DO -->
      <div class="space-y-4">
        <ResponsiveCard v-for="section in groupedSections" :key="section.deliveryOrderNo">
          <template #content>
            <p class="mb-3 text-sm font-semibold text-stone-700">
              {{ t('goodsReturnNotes.detail.fromDo', { no: section.deliveryOrderNo }) }}
            </p>
            <DataTable :value="section.items" class="text-sm" size="small">
              <Column :header="t('goodsReturnNotes.detail.product')">
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.productCode }}</span>
                    <span class="text-xs text-stone-500">{{ data.productName }}</span>
                  </div>
                </template>
              </Column>
              <Column :header="t('goodsReturnNotes.detail.warehouse')">
                <template #body="{ data }">{{ data.warehouseName }}</template>
              </Column>
              <Column :header="t('goodsReturnNotes.detail.receivedQty')">
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

    <Message v-else-if="!isLoading" severity="error">
      {{ t('goodsReturnNotes.messages.notFound') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { GoodsReturnNotesService, commonErrorToast } from '@/services'
import type { GoodsReturnNoteDetail, GoodsReturnNoteItemLine } from '@/types'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'goodsReturnNoteDetail'
const detail = ref<GoodsReturnNoteDetail | null>(null)
const isLoading = ref(false)

interface Section {
  deliveryOrderNo: string
  items: GoodsReturnNoteItemLine[]
}

const groupedSections = computed<Section[]>(() => {
  if (!detail.value) return []

  const sectionMap = new Map<string, GoodsReturnNoteItemLine[]>()
  for (const item of detail.value.items) {
    if (!sectionMap.has(item.deliveryOrderNo)) sectionMap.set(item.deliveryOrderNo, [])
    sectionMap.get(item.deliveryOrderNo)!.push(item)
  }

  return Array.from(sectionMap.entries())
    .map(([deliveryOrderNo, items]) => ({ deliveryOrderNo, items }))
    .sort((a, b) => a.deliveryOrderNo.localeCompare(b.deliveryOrderNo))
})

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return decStr
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function formatTierQty(item: GoodsReturnNoteItemLine): string {
  const levels = pinnedToLevels(item.pinnedUom)
  if (!levels || levels.length <= 1) return formatQty(item.receivedQty)
  return decomposeBaseQty(parseFloat(item.receivedQty), levels).join(' / ')
}

function uomLabel(item: GoodsReturnNoteItemLine): string | undefined {
  const levels = pinnedToLevels(item.pinnedUom)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await GoodsReturnNotesService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/goods-return-notes')
    return
  }
  fetchDetail(id)
})
</script>
