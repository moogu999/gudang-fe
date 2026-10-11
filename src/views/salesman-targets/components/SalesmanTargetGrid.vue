<template>
  <div>
    <!-- Toolbar -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-sm font-semibold">{{ t('salesmanTargets.grid.title') }}</span>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <Button
          v-if="canSplit"
          type="button"
          :label="t('salesmanTargets.grid.splitEvenly')"
          icon="pi pi-equals"
          size="small"
          severity="secondary"
          outlined
          @click="onSplitClick"
        />
        <Button
          v-for="group in jumpGroups"
          :key="group"
          type="button"
          :label="t(`salesmanTargets.grid.groups.${group}`)"
          size="small"
          severity="secondary"
          text
          @click="scrollToGroup(group)"
        />
        <Button
          v-if="!readonly"
          type="button"
          :label="t('salesmanTargets.grid.addSalesman')"
          icon="pi pi-user-plus"
          size="small"
          @click="emit('addLine')"
        />
      </div>
    </div>

    <p v-if="modelLines.length === 0" class="py-6 text-center text-sm text-stone-500">
      {{ t('salesmanTargets.grid.empty') }}
    </p>

    <!-- Capture phase: the grid reads pasted blocks itself, so a cell's own paste handler never sees them. -->
    <div
      v-else
      ref="scroller"
      class="overflow-x-auto rounded border border-stone-200"
      @paste.capture="onPaste"
    >
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-stone-50">
          <tr>
            <th
              rowspan="2"
              class="sticky left-0 z-10 min-w-56 border-r border-b border-stone-200 bg-stone-50 px-3 py-2 text-left font-semibold"
            >
              {{ t('salesmanTargets.grid.salesman') }}
            </th>
            <th
              v-if="types.hasValue"
              data-group="value"
              class="border-r border-b border-stone-200 px-3 py-2 text-center font-semibold"
            >
              {{ t('salesmanTargets.grid.groups.value') }}
            </th>
            <th
              v-if="types.hasQty && items.length"
              data-group="qty"
              :colspan="items.length"
              class="border-r border-b border-stone-200 px-3 py-2 text-center font-semibold"
            >
              {{ t('salesmanTargets.grid.groups.qty') }}
            </th>
            <th
              v-if="types.hasEffectiveCall || types.hasActiveOutlet"
              data-group="call"
              :colspan="Number(types.hasEffectiveCall) + Number(types.hasActiveOutlet)"
              class="border-b border-stone-200 px-3 py-2 text-center font-semibold"
            >
              {{ t('salesmanTargets.grid.groups.call') }}
            </th>
            <th v-if="!readonly" rowspan="2" class="w-12 border-b border-stone-200" />
          </tr>
          <tr>
            <th
              v-for="col in cols"
              :key="colKey(col)"
              class="min-w-36 border-r border-b border-stone-200 px-3 py-2 text-right font-medium"
            >
              <template v-if="col.kind === 'value'">
                <div>{{ t('salesmanTargets.grid.valueHeader') }}</div>
                <div class="text-xs font-normal text-stone-500">
                  {{
                    source === 'internal'
                      ? t('salesmanTargets.source.allProducts')
                      : t('salesmanTargets.grid.valueBasis')
                  }}
                </div>
              </template>
              <template v-else-if="col.kind === 'qty'">
                <div>{{ itemLabel(col.item) }}</div>
                <div class="text-xs font-normal text-stone-500">
                  <template v-if="source === 'internal' && col.item.categoryOptionId">
                    {{ col.item.principalName ?? t('salesmanTargets.items.allPrincipals') }} ·
                  </template>
                  {{ unitSymbol(col.item) }}
                </div>
              </template>
              <template v-else-if="col.kind === 'ec'">
                <div>{{ t('salesmanTargets.grid.ec') }}</div>
                <div class="text-xs font-normal text-stone-500">
                  {{ t('salesmanTargets.grid.ecHint') }}
                </div>
              </template>
              <template v-else>
                <div>{{ t('salesmanTargets.grid.oa') }}</div>
                <div class="text-xs font-normal text-stone-500">
                  {{ t('salesmanTargets.grid.oaHint') }}
                </div>
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, r) in modelLines" :key="line.key" class="hover:bg-stone-50">
            <td
              class="sticky left-0 z-10 border-r border-b border-stone-200 bg-white px-3 py-2 align-top"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ line.employeeName }}</span>
                <Tag
                  v-if="!line.employeeActive"
                  :value="t('salesmanTargets.grid.inactive')"
                  severity="warn"
                />
                <Tag v-if="line.isNew" :value="t('salesmanTargets.grid.new')" severity="info" />
              </div>
              <div class="text-xs text-stone-500">{{ subInfo(line) }}</div>
            </td>
            <td
              v-for="(col, c) in cols"
              :key="colKey(col)"
              class="border-r border-b border-stone-200 px-2 py-1 text-right"
            >
              <InputNumber
                :data-cell="`${r}:${c}`"
                :model-value="cellValue(line, col)"
                :locale="locale"
                :min="0"
                :min-fraction-digits="0"
                :max-fraction-digits="maxFraction(col)"
                :disabled="readonly"
                size="small"
                input-class="w-32 text-right"
                @update:model-value="(v: number | null) => setCell(line, col, v)"
                @keydown.enter.prevent="focusCell(r + 1, c)"
              />
            </td>
            <td v-if="!readonly" class="border-b border-stone-200 px-1 text-center">
              <Button
                type="button"
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                :aria-label="t('salesmanTargets.grid.removeLine')"
                @click="onRemoveClick(line)"
              />
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-stone-50 font-medium">
          <tr>
            <td class="sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2">
              {{ t('salesmanTargets.grid.totalAllocation') }}
            </td>
            <td
              v-for="col in cols"
              :key="colKey(col)"
              class="border-r border-stone-200 px-3 py-2 text-right"
            >
              {{ totalText(col) }}
            </td>
            <td v-if="!readonly" />
          </tr>
          <template v-if="showGap">
            <tr>
              <td class="sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2">
                {{ t('salesmanTargets.grid.principalTarget') }}
              </td>
              <td
                v-for="col in cols"
                :key="colKey(col)"
                class="border-r border-stone-200 px-3 py-2 text-right"
              >
                {{ col.kind === 'value' ? fmt(principalTargetValue ?? 0) : '—' }}
              </td>
              <td v-if="!readonly" />
            </tr>
            <tr>
              <td class="sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2">
                {{ t('salesmanTargets.grid.gap') }}
              </td>
              <td
                v-for="col in cols"
                :key="colKey(col)"
                class="border-r border-stone-200 px-3 py-2 text-right"
                :class="gapClass"
              >
                {{ col.kind === 'value' ? gapText : '—' }}
              </td>
              <td v-if="!readonly" />
            </tr>
          </template>
        </tfoot>
      </table>
    </div>

    <Message
      v-if="gap && gap.amount !== 0"
      severity="warn"
      size="small"
      variant="simple"
      class="mt-3"
    >
      {{
        t(gap.amount < 0 ? 'salesmanTargets.grid.gapShort' : 'salesmanTargets.grid.gapOver', {
          amount: fmt(Math.abs(gap.amount)),
          pct: fmt(Math.abs(gap.pct), 1),
        })
      }}
    </Message>
    <Message v-if="untargetedCount > 0" severity="info" size="small" variant="simple" class="mt-2">
      {{ t('salesmanTargets.grid.noTargetYet', { n: untargetedCount }) }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { TargetSource } from '@/types/salesmanTarget.type'
import {
  columnTotals,
  itemLabel,
  lineHasValues,
  parseTsv,
  principalGap,
  splitEvenly,
  toBase,
  toDisplay,
  unitOf,
  type FormItem,
  type FormLine,
  type FormTypes,
} from '../salesmanTargetGrid'
import { formatNumber } from '../salesmanTargetHelpers'

type GridCol = { kind: 'value' } | { kind: 'qty'; item: FormItem } | { kind: 'ec' } | { kind: 'oa' }

const props = defineProps<{
  items: FormItem[]
  types: FormTypes
  source: TargetSource
  principalTargetValue: number | null
  readonly: boolean
  toastGroup: string
  confirmGroup: string
}>()

const emit = defineEmits<{ addLine: [] }>()

const modelLines = defineModel<FormLine[]>('lines', { required: true })

const { t, locale } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const scroller = ref<HTMLElement | null>(null)

const cols = computed<GridCol[]>(() => {
  const result: GridCol[] = []
  if (props.types.hasValue) result.push({ kind: 'value' })
  if (props.types.hasQty) for (const item of props.items) result.push({ kind: 'qty', item })
  if (props.types.hasEffectiveCall) result.push({ kind: 'ec' })
  if (props.types.hasActiveOutlet) result.push({ kind: 'oa' })
  return result
})

function colKey(col: GridCol): string {
  return col.kind === 'qty' ? `qty-${col.item.key}` : col.kind
}

const jumpGroups = computed(() => {
  const groups: string[] = []
  if (props.types.hasValue) groups.push('value')
  if (props.types.hasQty && props.items.length) groups.push('qty')
  if (props.types.hasEffectiveCall || props.types.hasActiveOutlet) groups.push('call')
  return groups.length > 1 ? groups : []
})

function fmt(n: number, maxFraction = 0): string {
  return formatNumber(n, locale.value, maxFraction)
}

function unitSymbol(item: FormItem): string {
  const unit = unitOf(item)
  if (unit) return unit.symbol
  return item.units.find((u) => u.isBase)?.symbol ?? t('salesmanTargets.items.baseUnit')
}

function subInfo(line: FormLine): string {
  const carried =
    props.source === 'internal' && line.principals.length
      ? line.principals.join(', ')
      : line.teamCodes.join(', ')
  return [line.employeeCode, carried].filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function maxFraction(col: GridCol): number {
  if (col.kind === 'qty') return unitOf(col.item) ? 4 : 0
  return 0
}

function cellValue(line: FormLine, col: GridCol): number | null {
  if (col.kind === 'value') return line.targetValue
  if (col.kind === 'ec') return line.effectiveCall
  if (col.kind === 'oa') return line.activeOutlet
  return toDisplay(line.cells[col.item.key], unitOf(col.item))
}

/** Writes a cell. An empty value removes the cell; it never becomes 0. */
function setCell(line: FormLine, col: GridCol, value: number | null) {
  if (col.kind === 'value') line.targetValue = value
  else if (col.kind === 'ec') line.effectiveCall = value === null ? null : Math.round(value)
  else if (col.kind === 'oa') line.activeOutlet = value === null ? null : Math.round(value)
  else {
    const base = toBase(value, unitOf(col.item))
    if (base === undefined) delete line.cells[col.item.key]
    else line.cells[col.item.key] = base
  }
}

function focusCell(r: number, c: number) {
  scroller.value?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"] input`)?.focus()
}

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------

function onPaste(e: ClipboardEvent) {
  const cell = (e.target as HTMLElement | null)?.closest('[data-cell]')
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!cell || !text || props.readonly) return
  e.preventDefault()
  e.stopPropagation()

  const [startRow, startCol] = (cell.getAttribute('data-cell') ?? '0:0').split(':').map(Number)
  let outside = 0
  let invalid = 0
  parseTsv(text).forEach((row, i) =>
    row.forEach((value, j) => {
      const line = modelLines.value[startRow + i]
      const col = cols.value[startCol + j]
      if (!line || !col) {
        outside++
        return
      }
      if (value === 'invalid') {
        invalid++
        return
      }
      setCell(line, col, value)
    }),
  )

  if (outside > 0) {
    toast.add({
      severity: 'warn',
      summary: t('salesmanTargets.grid.pasteIgnored', { n: outside }),
      life: 4000,
      group: props.toastGroup,
    })
  }
  if (invalid > 0) {
    toast.add({
      severity: 'warn',
      summary: t('salesmanTargets.grid.pasteInvalid', { n: invalid }),
      life: 4000,
      group: props.toastGroup,
    })
  }
}

// ---------------------------------------------------------------------------
// Totals and gap
// ---------------------------------------------------------------------------

const totals = computed(() =>
  columnTotals(
    modelLines.value,
    props.items.map((i) => i.key),
  ),
)

function totalText(col: GridCol): string {
  if (col.kind === 'value') return fmt(totals.value.value)
  if (col.kind === 'ec') return fmt(totals.value.effectiveCall)
  if (col.kind === 'oa') return fmt(totals.value.activeOutlet)
  const shown = toDisplay(String(totals.value.qty[col.item.key] ?? 0), unitOf(col.item))
  return fmt(shown ?? 0, unitOf(col.item) ? 2 : 0)
}

const gap = computed(() =>
  props.source === 'principal' && props.types.hasValue
    ? principalGap(totals.value.value, props.principalTargetValue)
    : null,
)
const showGap = computed(() => gap.value !== null)
const gapText = computed(() => {
  if (!gap.value) return ''
  const sign = gap.value.amount > 0 ? '+' : gap.value.amount < 0 ? '−' : ''
  return `${sign}${fmt(Math.abs(gap.value.amount))} (${fmt(Math.abs(gap.value.pct), 1)}%)`
})
const gapClass = computed(() => (gap.value && gap.value.amount !== 0 ? 'text-amber-600' : ''))

/** Salesmen with nothing entered in any active column. */
const untargetedCount = computed(
  () =>
    modelLines.value.filter(
      (l) =>
        (!props.types.hasValue || l.targetValue === null) &&
        (!props.types.hasEffectiveCall || l.effectiveCall === null) &&
        (!props.types.hasActiveOutlet || l.activeOutlet === null) &&
        (!props.types.hasQty || props.items.every((i) => l.cells[i.key] === undefined)),
    ).length,
)

// ---------------------------------------------------------------------------
// Split evenly, remove, jump
// ---------------------------------------------------------------------------

const canSplit = computed(
  () =>
    !props.readonly &&
    props.source === 'principal' &&
    props.types.hasValue &&
    (props.principalTargetValue ?? 0) > 0 &&
    modelLines.value.length > 0,
)

function applySplit() {
  const shares = splitEvenly(props.principalTargetValue ?? 0, modelLines.value.length)
  modelLines.value.forEach((line, i) => (line.targetValue = shares[i]))
}

function onSplitClick() {
  if (modelLines.value.every((l) => l.targetValue === null)) {
    applySplit()
    return
  }
  confirm.require({
    group: props.confirmGroup,
    header: t('salesmanTargets.grid.splitEvenly'),
    message: t('salesmanTargets.grid.splitConfirm'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
    accept: applySplit,
  })
}

function removeLine(line: FormLine) {
  modelLines.value = modelLines.value.filter((l) => l.key !== line.key)
}

function onRemoveClick(line: FormLine) {
  if (!lineHasValues(line)) {
    removeLine(line)
    return
  }
  confirm.require({
    group: props.confirmGroup,
    header: t('salesmanTargets.grid.removeLine'),
    message: t('salesmanTargets.grid.removeLineConfirm', { name: line.employeeName }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.confirmation.no'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.confirmation.yes') },
    accept: () => removeLine(line),
  })
}

function scrollToGroup(group: string) {
  scroller.value
    ?.querySelector(`[data-group="${group}"]`)
    ?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
}
</script>
