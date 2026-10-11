<template>
  <div>
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <span class="text-sm font-semibold">{{ t('salesmanTargets.items.title') }}</span>
      <Tag
        :value="t('salesmanTargets.items.level', { level: t(`salesmanTargets.levels.${level}`) })"
        severity="secondary"
      />
      <Button
        v-if="!readonly"
        type="button"
        icon="pi pi-plus"
        :label="t('salesmanTargets.items.addItem')"
        size="small"
        severity="secondary"
        outlined
        @click="emit('add')"
      />
    </div>

    <p v-if="items.length === 0" class="text-sm text-stone-500">
      {{ t('salesmanTargets.items.empty') }}
    </p>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="item in items"
        :key="item.key"
        class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1"
      >
        <Tag
          :value="item.productId ? t('salesmanTargets.items.kindProduct') : t('salesmanTargets.items.kindCategory')"
          :severity="item.productId ? 'secondary' : 'info'"
        />
        <span
          v-tooltip.top="skuTooltip(item)"
          class="text-sm font-medium"
          :class="{ 'cursor-help': !!item.skuCount }"
        >
          {{ itemLabel(item) }}
        </span>
        <Tag
          v-if="source === 'internal' && item.categoryOptionId"
          :value="item.principalName ?? t('salesmanTargets.items.allPrincipals')"
          severity="secondary"
        />

        <Select
          v-if="item.units.length > 1 && !readonly"
          v-model="item.uomId"
          :options="item.units"
          option-label="symbol"
          option-value="uomId"
          size="small"
          class="min-w-20"
          :aria-label="t('salesmanTargets.items.unit')"
        />
        <span
          v-else
          v-tooltip.top="lockedTooltip"
          class="cursor-help text-xs text-stone-500"
          data-testid="locked-unit"
        >
          {{ unitText(item) }}
        </span>

        <Button
          v-if="!readonly"
          type="button"
          icon="pi pi-times"
          severity="secondary"
          text
          rounded
          size="small"
          :aria-label="t('salesmanTargets.items.remove')"
          @click="emit('remove', item)"
        />
      </div>
    </div>

    <p
      v-for="item in itemsWithOverlap"
      :key="`also-${item.key}`"
      class="mt-1 text-xs text-stone-500"
    >
      {{
        t('salesmanTargets.items.alsoIn', {
          item: itemLabel(item),
          others: item.alsoIn.map(labelOfKey).join(', '),
        })
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import type { TargetLevel, TargetSource } from '@/types/salesmanTarget.type'
import { itemLabel, type FormItem } from '../salesmanTargetGrid'

const props = defineProps<{
  level: TargetLevel
  source: TargetSource
  readonly: boolean
}>()

const items = defineModel<FormItem[]>('items', { required: true })

const emit = defineEmits<{
  add: []
  remove: [item: FormItem]
}>()

const { t } = useI18n()

const itemsWithOverlap = computed(() => items.value.filter((i) => i.alsoIn.length > 0))

const lockedTooltip = computed(() =>
  props.level === 'category'
    ? t('salesmanTargets.items.lockedBaseUnit')
    : t('salesmanTargets.items.baseUnitOnly'),
)

function labelOfKey(key: string): string {
  const item = items.value.find((i) => i.key === key)
  if (!item) return ''
  const principal =
    props.source === 'internal' && item.categoryOptionId
      ? ` · ${item.principalName ?? t('salesmanTargets.items.allPrincipals')}`
      : ''
  return `${itemLabel(item)}${principal}`
}

function unitText(item: FormItem): string {
  const current = item.units.find((u) => u.uomId === item.uomId) ?? item.units.find((u) => u.isBase)
  return current?.symbol ?? t('salesmanTargets.items.baseUnit')
}

function skuTooltip(item: FormItem): string {
  if (!item.categoryOptionId || !item.skuCount) return ''
  const sample = (item.skuSample ?? []).join(', ')
  return t('salesmanTargets.items.skuTooltip', { n: item.skuCount, sample })
}
</script>
