<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[56rem] text-sm" data-testid="visit-rule-table">
      <thead>
        <tr class="text-left text-xs tracking-wide text-stone-500 uppercase">
          <th class="px-3 py-2">{{ t('visitRules.columns.activity') }}</th>
          <th class="px-3 py-2">{{ t('visitRules.columns.mode') }}</th>
          <th class="px-3 py-2">
            {{ t(mode === 'team' ? 'visitRules.columns.teamRule' : 'visitRules.columns.rule') }}
          </th>
          <th v-if="mode === 'team'" class="px-3 py-2">{{ t('visitRules.columns.default') }}</th>
          <th class="px-3 py-2">{{ t('visitRules.columns.parameter') }}</th>
          <th class="px-3 py-2">{{ t('visitRules.columns.setIn') }}</th>
        </tr>
      </thead>
      <tbody v-for="group in groups" :key="group.key">
        <tr class="bg-stone-100">
          <td :colspan="mode === 'team' ? 6 : 5" class="px-3 py-1.5 text-xs font-semibold">
            {{ t(`visitRules.categories.${group.key}`) }}
          </td>
        </tr>
        <tr
          v-for="row in group.rows"
          :key="row.key"
          :class="[
            'border-b border-stone-200 align-top',
            isOverridden(row) ? 'bg-yellow-50' : '',
          ]"
          :data-testid="`rule-${row.key}`"
        >
          <td class="px-3 py-2">
            <div class="font-medium">{{ t(`visitRules.rules.${row.key}.name`) }}</div>
            <div class="text-xs text-stone-500">
              {{ t(`visitRules.rules.${row.key}.description`) }}
            </div>
          </td>
          <td class="px-3 py-2 whitespace-nowrap">
            <Tag
              v-if="row.appliesTakingOrder"
              :value="t('visitRules.modes.taking_order')"
              severity="secondary"
              class="mr-1"
            />
            <Tag
              v-if="row.appliesCanvass"
              :value="t('visitRules.modes.canvass')"
              severity="secondary"
            />
          </td>

          <!-- Rule -->
          <td class="px-3 py-2">
            <div v-if="row.locked" class="flex items-center gap-2">
              <RuleLevelSelector
                :model-value="row.defaultLevel"
                :level-style="row.style"
                :allowed-levels="row.allowedLevels"
                disabled
              />
              <i
                v-tooltip.top="
                  t('visitRules.lockedHint', {
                    level: t(levelLabelKey(row.style, row.defaultLevel)),
                  })
                "
                class="pi pi-lock text-stone-400"
              />
            </div>
            <template v-else-if="mode === 'company'">
              <RuleLevelSelector
                :model-value="valueOf(row).level"
                :level-style="row.style"
                :allowed-levels="row.allowedLevels"
                :disabled="readonly"
                @update:model-value="(l) => setLevel(row, l)"
              />
            </template>
            <template v-else>
              <div class="flex flex-wrap items-center gap-2">
                <SelectButton
                  :model-value="isOverridden(row) ? 'override' : 'follow'"
                  :options="followOptions"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  :disabled="readonly"
                  size="small"
                  :data-testid="`follow-${row.key}`"
                  @update:model-value="(v) => toggleOverride(row, v === 'override')"
                />
                <RuleLevelSelector
                  v-if="isOverridden(row)"
                  :model-value="valueOf(row).level"
                  :level-style="row.style"
                  :allowed-levels="row.allowedLevels"
                  :disabled="readonly"
                  @update:model-value="(l) => setLevel(row, l)"
                />
              </div>
            </template>
          </td>

          <td v-if="mode === 'team'" class="px-3 py-2 text-stone-600">
            {{ inheritedText(row) }}
          </td>

          <!-- Parameter -->
          <td class="px-3 py-2">
            <template v-if="row.paramKind === 'radius_m'">
              <div v-if="mode === 'company' || isOverridden(row)" class="flex flex-col gap-1">
                <InputGroup class="w-36">
                  <InputNumber
                    :model-value="valueOf(row).radiusM ?? null"
                    :min="0"
                    :max="99999"
                    :use-grouping="false"
                    :disabled="readonly || valueOf(row).level === 'off'"
                    :invalid="errorKeys.includes(row.key)"
                    input-class="w-20"
                    :data-testid="`radius-${row.key}`"
                    @update:model-value="(v) => setRadius(row, v)"
                  />
                  <InputGroupAddon>{{ t('visitRules.radius.unit') }}</InputGroupAddon>
                </InputGroup>
                <small v-if="errorKeys.includes(row.key)" class="text-red-500">
                  {{ t('visitRules.radius.invalid') }}
                </small>
              </div>
              <span v-else class="text-stone-400">—</span>
            </template>
            <span v-else class="text-stone-400">—</span>
          </td>

          <td class="px-3 py-2 text-xs text-stone-500">
            {{ t(`visitRules.rules.${row.key}.setIn`) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import type {
  CompanyRuleRow,
  TeamRuleRow,
  VisitRuleLevel,
  VisitRuleValue,
} from '@/types/visitRule.type'
import RuleLevelSelector from './RuleLevelSelector.vue'
import { groupByCategory, levelLabelKey, withLevel, type ValueMap } from '../visitRuleHelpers'

type Row = CompanyRuleRow | TeamRuleRow

/**
 * `company` mode edits a value for every rule; `team` mode edits a sparse override map on top of the
 * inherited values. `modelValue` is the working value map either way.
 */
const props = defineProps<{
  mode: 'company' | 'team'
  rows: Row[]
  modelValue: ValueMap
  readonly?: boolean
  errorKeys?: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [values: ValueMap] }>()

const { t } = useI18n()

const errorKeys = computed(() => props.errorKeys ?? [])
const groups = computed(() => groupByCategory(props.rows))
const followOptions = computed(() => [
  { value: 'follow', label: t('visitRules.actions.followDefault') },
  { value: 'override', label: t('visitRules.actions.override') },
])

function isOverridden(row: Row): boolean {
  return props.mode === 'team' && props.modelValue[row.key] != null
}

function inheritedOf(row: Row): VisitRuleValue {
  if ('inherited' in row) return row.inherited
  return { level: row.defaultLevel, radiusM: row.defaultRadiusM }
}

function valueOf(row: Row): VisitRuleValue {
  const v = props.modelValue[row.key]
  if (v) return v
  return props.mode === 'team' ? inheritedOf(row) : { level: row.defaultLevel }
}

function inheritedText(row: Row): string {
  const v = inheritedOf(row)
  const label = t(levelLabelKey(row.style, v.level))
  return row.paramKind && v.level !== 'off' && v.radiusM != null
    ? `${label} · ${v.radiusM} ${t('visitRules.radius.unit')}`
    : label
}

function put(key: string, value: VisitRuleValue | undefined) {
  const next = { ...props.modelValue }
  if (value) next[key] = value
  else delete next[key]
  emit('update:modelValue', next)
}

function setLevel(row: Row, level: VisitRuleLevel) {
  put(row.key, withLevel(row, level, valueOf(row)))
}

function setRadius(row: Row, radius: number | null) {
  put(row.key, { ...valueOf(row), radiusM: radius ?? undefined })
}

/** Switching to Override seeds the override from the inherited value. */
function toggleOverride(row: Row, override: boolean) {
  if (override === isOverridden(row)) return
  if (!override) return put(row.key, undefined)
  const { level, radiusM } = inheritedOf(row)
  put(row.key, { level, ...(radiusM != null ? { radiusM } : {}) })
}
</script>
