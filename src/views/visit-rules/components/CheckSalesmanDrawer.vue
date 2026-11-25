<template>
  <Drawer
    :visible="visible"
    position="right"
    class="!w-full md:!w-[44rem]"
    :header="t('visitRules.drawer.title')"
    @update:visible="(v: boolean) => emit('update:visible', v)"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <SelectButton
          v-model="modeFilter"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
        />
        <InfiniteSelect
          :key="`${modeFilter}-${typeId}`"
          :model-value="employeeId"
          :fetch-fn="fetchEmployees"
          :option-label="employeeLabel"
          option-value="id"
          :placeholder="t('visitRules.drawer.pick')"
          class="min-w-64 flex-1"
          data-testid="drawer-employee"
          @update:model-value="onPick"
        />
      </div>

      <Message v-if="hasUnsaved" severity="info" size="small">
        {{ t('visitRules.drawer.unsavedNote') }}
      </Message>

      <div v-if="loading" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
      </div>
      <Message v-else-if="errorText" severity="warn" data-testid="drawer-error">
        {{ errorText }}
      </Message>
      <p v-else-if="!result" class="py-6 text-center text-sm text-stone-500">
        {{ t('visitRules.drawer.empty') }}
      </p>
      <template v-else>
        <div class="text-sm" data-testid="drawer-header">
          <span class="font-semibold">
            {{ result.employee.code ? `${result.employee.code} — ` : '' }}{{ result.employee.name }}
          </span>
          <span class="text-stone-500">
            · {{ result.team ? result.team.name : t('visitRules.drawer.noTeam') }} ·
            {{ t(`visitRules.modes.${result.employee.mode}`) }}
          </span>
        </div>
        <table class="w-full text-sm" data-testid="drawer-table">
          <thead>
            <tr class="text-left text-xs tracking-wide text-stone-500 uppercase">
              <th class="px-2 py-2">{{ t('visitRules.columns.activity') }}</th>
              <th class="px-2 py-2">{{ t('visitRules.drawer.effective') }}</th>
              <th class="px-2 py-2">{{ t('visitRules.columns.setIn') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in result.rules"
              :key="row.key"
              class="border-b border-stone-200"
              :data-testid="`effective-${row.key}`"
            >
              <td class="px-2 py-2">{{ t(`visitRules.rules.${row.key}.name`) }}</td>
              <td class="px-2 py-2">
                <span v-if="row.source === 'n/a'" class="text-stone-400">
                  {{
                    t('visitRules.drawer.notApplicable', {
                      mode: t(`visitRules.modes.${result.employee.mode}Long`),
                    })
                  }}
                </span>
                <span v-else-if="row.level">{{ levelText(row) }}</span>
              </td>
              <td class="px-2 py-2">
                <Tag
                  v-if="row.source !== 'n/a'"
                  :value="t(`visitRules.sources.${row.source}`)"
                  :severity="sourceSeverity(row.source)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Drawer from 'primevue/drawer'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { EmployeeTypesService, EmployeesService, VisitRulesService } from '@/services'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import { ApiError } from '@/types/api.type'
import type { Employee, EmployeeType } from '@/types/employee.type'
import type {
  EffectiveRuleRow,
  EffectiveRules,
  VisitRuleMode,
  VisitRuleSource,
} from '@/types/visitRule.type'
import { levelLabelKey } from '../visitRuleHelpers'

defineProps<{ visible: boolean; hasUnsaved?: boolean }>()
const emit = defineEmits<{ 'update:visible': [visible: boolean] }>()

const { t, te } = useI18n()

const modeFilter = ref<VisitRuleMode>('taking_order')
const employeeId = ref<number | undefined>(undefined)
const result = ref<EffectiveRules | null>(null)
const loading = ref(false)
const errorText = ref('')
const types = ref<EmployeeType[]>([])

const modeOptions = computed(() => [
  { value: 'taking_order' as VisitRuleMode, label: t('visitRules.modes.taking_orderLong') },
  { value: 'canvass' as VisitRuleMode, label: t('visitRules.modes.canvassLong') },
])

const typeId = computed(() => {
  const name =
    modeFilter.value === 'canvass' ? EMPLOYEE_TYPE_NAMES.CANVASS : EMPLOYEE_TYPE_NAMES.SALESMAN
  return types.value.find((x) => x.name === name)?.id
})

// Only active, finished employees of the chosen type.
const fetchEmployees = computed(() => (q?: string) => {
  const parts = [EmployeesService.toListQuery(q), 'isActive=true', 'isDraft=false']
  if (typeId.value) parts.push(`employeeTypeId=${typeId.value}`)
  return EmployeesService.list(parts.filter(Boolean).join('&'))
})

function employeeLabel(e: Employee): string {
  return e.nip ? `${e.nip} — ${e.name}` : e.name
}

function levelText(row: EffectiveRuleRow): string {
  if (!row.level) return ''
  const label = t(levelLabelKey(row.style, row.level))
  if (row.paramKind === 'allow_check_all') {
    return `${label} · ${t(row.allowCheckAll === false ? 'visitRules.checkAll.off' : 'visitRules.checkAll.on')}`
  }
  return row.paramKind === 'radius_m' && row.level !== 'off' && row.radiusM != null
    ? `${label} · ${row.radiusM} ${t('visitRules.radius.unit')}`
    : label
}

function sourceSeverity(source: VisitRuleSource): 'secondary' | 'info' | 'warn' | 'success' {
  if (source === 'team') return 'warn'
  if (source === 'employee') return 'success'
  if (source === 'company') return 'info'
  return 'secondary'
}

async function onPick(value: unknown) {
  const id = typeof value === 'number' ? value : undefined
  employeeId.value = id
  result.value = null
  errorText.value = ''
  if (!id) return
  loading.value = true
  try {
    const res = await VisitRulesService.getEffective(id)
    if (id === employeeId.value) result.value = res
  } catch (e) {
    if (e instanceof ApiError && e.code && te(`visitRules.errors.${e.code}`)) {
      errorText.value = t(`visitRules.errors.${e.code}`)
    } else {
      errorText.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    loading.value = false
  }
}

watch(modeFilter, () => {
  employeeId.value = undefined
  result.value = null
  errorText.value = ''
})

onMounted(async () => {
  try {
    types.value = (await EmployeeTypesService.list()).data
  } catch {
    // The picker then lists every employee; the API rejects a non-field one with a message.
  }
})
</script>
