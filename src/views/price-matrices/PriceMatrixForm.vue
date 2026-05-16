<template>
  <div class="flex flex-col gap-4">
    <!-- Header card -->
    <ResponsiveCard>
      <template #content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('priceMatrix.fields.code') }} *</label>
            <InputText
              v-model="form.code"
              :disabled="isView"
              :class="{ 'p-invalid': errors.code }"
              autocomplete="off"
            />
            <small v-if="errors.code" class="text-red-500">{{ errors.code }}</small>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('priceMatrix.fields.description') }}</label>
            <InputText v-model="form.description" :disabled="isView" autocomplete="off" />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Criteria picker card -->
    <ResponsiveCard>
      <template #content>
        <h2 class="mb-3 text-base font-semibold">{{ t('priceMatrix.fields.criteria') }}</h2>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('priceMatrix.labels.selectCriteria') }}</label>
          <MultiSelect
            v-model="selectedCriteriaTypeIds"
            :options="criteriaTypes"
            option-label="label"
            option-value="id"
            :selection-limit="5"
            :disabled="isView"
            :placeholder="t('priceMatrix.labels.selectCriteria')"
            display="chip"
            class="w-full"
            @update:model-value="onCriteriaChange"
          />
          <small v-if="errors.criteria" class="text-red-500">{{ errors.criteria }}</small>
        </div>

        <!-- Criteria order -->
        <div v-if="form.criteria.length > 0" class="mt-3 flex flex-wrap gap-2">
          <div
            v-for="(crit, idx) in form.criteria"
            :key="crit.criteriaTypeId"
            class="flex items-center gap-1 rounded border bg-gray-50 px-2 py-1 text-sm"
          >
            <span class="text-gray-500">{{ idx + 1 }}.</span>
            <span>{{ getCriteriaLabel(crit.criteriaTypeId) }}</span>
            <div v-if="!isView" class="flex gap-0.5">
              <Button
                icon="pi pi-arrow-up"
                text
                size="small"
                :disabled="idx === 0"
                :aria-label="t('common.actions.moveUp')"
                @click="moveCriteria(idx, -1)"
              />
              <Button
                icon="pi pi-arrow-down"
                text
                size="small"
                :disabled="idx === form.criteria.length - 1"
                :aria-label="t('common.actions.moveDown')"
                @click="moveCriteria(idx, 1)"
              />
            </div>
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Rules card -->
    <ResponsiveCard>
      <template #content>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ t('priceMatrix.fields.rules') }}</h2>
          <Button
            v-if="!isView"
            :label="t('priceMatrix.labels.addRule')"
            icon="pi pi-plus"
            size="small"
            :disabled="form.criteria.length === 0"
            @click="addRule"
          />
        </div>

        <small v-if="errors.rules" class="mb-2 block text-red-500">{{ errors.rules }}</small>

        <div
          v-if="form.rules.length === 0"
          class="rounded border p-4 text-center text-sm text-gray-500"
        >
          {{ t('table.noItems') }}
        </div>

        <div v-else class="overflow-x-auto">
          <DataTable :value="form.rules" size="small">
            <!-- Dynamic criteria columns -->
            <Column
              v-for="crit in form.criteria"
              :key="crit.criteriaTypeId"
              :header="getCriteriaLabel(crit.criteriaTypeId)"
              style="min-width: 180px"
            >
              <template #body="{ index }">
                <div class="flex items-center gap-1">
                  <!-- Wildcard mode: show "Any" tag + button to specify -->
                  <template
                    v-if="
                      form.rules[index].values[getCriteriaValueIndex(index, crit.criteriaTypeId)]
                        ?.valueId === null
                    "
                  >
                    <Tag
                      :value="t('priceMatrix.labels.wildcard')"
                      severity="secondary"
                      class="text-xs"
                    />
                    <Button
                      v-if="!isView"
                      icon="pi pi-pencil"
                      text
                      size="small"
                      :aria-label="t('priceMatrix.labels.specify')"
                      @click="setWildcard(index, crit.criteriaTypeId, false)"
                    />
                  </template>
                  <!-- Specified value mode -->
                  <template v-else>
                    <InfiniteSelect
                      v-if="!isView"
                      option-label="name"
                      option-value="id"
                      :fetch-fn="(query) => getCriteriaFetchFn(crit.criteriaTypeId)(query)"
                      :initial-option="
                        form.rules[index].values[getCriteriaValueIndex(index, crit.criteriaTypeId)]
                          ?._initialValue
                      "
                      :model-value="
                        form.rules[index].values[getCriteriaValueIndex(index, crit.criteriaTypeId)]
                          ?.valueId
                      "
                      sort-by="name"
                      sort-operator="asc"
                      class="flex-1"
                      @update:model-value="
                        (v) => setRuleValue(index, crit.criteriaTypeId, v as number | null)
                      "
                      @select-option="(opt) => setRuleValueOption(index, crit.criteriaTypeId, opt)"
                    />
                    <span v-else class="text-sm">
                      {{
                        form.rules[index].values[getCriteriaValueIndex(index, crit.criteriaTypeId)]
                          ?._initialValue?.name ?? '—'
                      }}
                    </span>
                    <Button
                      v-if="!isView"
                      icon="pi pi-times"
                      text
                      size="small"
                      severity="secondary"
                      :aria-label="t('priceMatrix.labels.setWildcard')"
                      @click="setWildcard(index, crit.criteriaTypeId, true)"
                    />
                  </template>
                </div>
              </template>
            </Column>

            <!-- Result column -->
            <Column :header="t('priceMatrix.fields.result')" style="min-width: 260px">
              <template #body="{ index }">
                <div class="flex flex-col gap-1">
                  <!-- Result type toggle (edit mode) -->
                  <SelectButton
                    v-if="!isView"
                    v-model="form.rules[index].resultType"
                    :options="[
                      { label: t('priceMatrix.labels.resultTypePriceList'), value: 'price_list' },
                      { label: t('priceMatrix.labels.resultTypePromotion'), value: 'promotion' },
                    ]"
                    option-label="label"
                    option-value="value"
                    size="small"
                    class="w-full"
                    @update:model-value="onResultTypeChange(index)"
                  />
                  <!-- View mode: result type label -->
                  <span v-else class="text-xs text-gray-500">
                    {{
                      form.rules[index].resultType === 'price_list'
                        ? t('priceMatrix.labels.resultTypePriceList')
                        : t('priceMatrix.labels.resultTypePromotion')
                    }}
                  </span>

                  <!-- Price list select -->
                  <template v-if="form.rules[index].resultType === 'price_list'">
                    <InfiniteSelect
                      v-if="!isView"
                      option-label="code"
                      option-value="id"
                      :fetch-fn="(query) => PriceListsService.list(query)"
                      :initial-option="form.rules[index]._initialPriceList"
                      :model-value="form.rules[index].priceListId"
                      sort-by="code"
                      sort-operator="asc"
                      class="w-full"
                      @update:model-value="(v) => (form.rules[index].priceListId = v as number)"
                      @select-option="(opt) => (form.rules[index]._initialPriceList = opt)"
                    />
                    <span v-else class="text-sm">
                      {{ form.rules[index]._initialPriceList?.code ?? '—' }}
                    </span>
                  </template>

                  <!-- Promotion select -->
                  <template v-else>
                    <InfiniteSelect
                      v-if="!isView"
                      option-label="code"
                      option-value="id"
                      :fetch-fn="(query) => PromotionsService.list(query)"
                      :initial-option="form.rules[index]._initialPromotion"
                      :model-value="form.rules[index].promotionId"
                      sort-by="code"
                      sort-operator="asc"
                      class="w-full"
                      @update:model-value="(v) => (form.rules[index].promotionId = v as number)"
                      @select-option="(opt) => (form.rules[index]._initialPromotion = opt)"
                    />
                    <span v-else class="text-sm">
                      {{ form.rules[index]._initialPromotion?.code ?? '—' }}
                    </span>
                  </template>
                </div>
              </template>
            </Column>

            <!-- Remove action column -->
            <Column v-if="!isView" style="width: 4rem">
              <template #body="{ index }">
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  size="small"
                  :aria-label="t('priceMatrix.labels.removeRule')"
                  @click="removeRule(index)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Footer actions -->
    <div v-if="!isView" class="flex justify-end gap-3">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button :label="t('common.actions.save')" :loading="isLoading" @click="onSave" />
    </div>
    <div v-else class="flex justify-end gap-3">
      <Button :label="t('common.actions.back')" severity="secondary" @click="emit('cancel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CriteriaTypesService } from '@/services/criteria-types.service'
import { PriceListsService } from '@/services/price-lists.service'
import { PromotionsService } from '@/services/promotions.service'
import { BranchesService } from '@/services/branches.service'
import { CompaniesService } from '@/services/companies.service'
import { SalesOrganizationsService } from '@/services/salesOrganizations.service'
import { ProductLabelDefinitionsService } from '@/services/productLabelDefinitions.service'
import { CustomerLabelDefinitionsService } from '@/services/customerLabelDefinitions.service'
import ApiService from '@/services/api'
import type { Base } from '@/types/api.type'
import type {
  CriteriaType,
  PriceMatrix,
  CreatePriceMatrixDto,
  UpdatePriceMatrixDto,
} from '@/types/price-matrix.type'
import { commonErrorToast } from '@/services/toast'

type FormMode = 'create' | 'edit' | 'view'

interface InitialValue {
  id: number
  name: string
  code?: string
}

interface RuleValueForm {
  criteriaTypeId: number
  valueId: number | null
  _initialValue?: InitialValue
}

interface RuleForm {
  id?: number
  resultType: 'price_list' | 'promotion'
  priceListId: number | undefined
  promotionId: number | undefined
  values: RuleValueForm[]
  _initialPriceList?: { id: number; code: string }
  _initialPromotion?: { id: number; code: string }
}

const props = defineProps<{
  mode: FormMode
  priceMatrix?: PriceMatrix
  isLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [dto: CreatePriceMatrixDto | UpdatePriceMatrixDto]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()

const isView = computed(() => props.mode === 'view')

const criteriaTypes = ref<CriteriaType[]>([])
const selectedCriteriaTypeIds = ref<number[]>([])

const form = ref({
  code: '',
  description: '',
  criteria: [] as { criteriaTypeId: number; position: number }[],
  rules: [] as RuleForm[],
})

const errors = ref({ code: '', criteria: '', rules: '' })

onMounted(async () => {
  try {
    const result = await CriteriaTypesService.list()
    criteriaTypes.value = result.data
  } catch (e) {
    toast.add(commonErrorToast(e, 'priceMatrixForm'))
  }

  if (props.priceMatrix) {
    form.value.code = props.priceMatrix.code
    form.value.description = props.priceMatrix.description ?? ''
    form.value.criteria = props.priceMatrix.criteria
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ criteriaTypeId: c.criteriaTypeId, position: c.position }))

    selectedCriteriaTypeIds.value = form.value.criteria.map((c) => c.criteriaTypeId)

    form.value.rules = props.priceMatrix.rules.map((rule) => ({
      id: rule.id,
      resultType: rule.resultType,
      priceListId: rule.priceListId ?? undefined,
      promotionId: rule.promotionId ?? undefined,
      _initialPriceList:
        rule.priceListCode && rule.priceListId
          ? { id: rule.priceListId, code: rule.priceListCode }
          : undefined,
      _initialPromotion:
        rule.promotionCode && rule.promotionId
          ? { id: rule.promotionId, code: rule.promotionCode }
          : undefined,
      values: form.value.criteria.map((crit) => {
        const rv = rule.values.find((v) => v.criteriaTypeId === crit.criteriaTypeId)
        return {
          criteriaTypeId: crit.criteriaTypeId,
          valueId: rv ? rv.valueId : null,
          _initialValue:
            rv?.valueId && rv.valueLabel ? { id: rv.valueId, name: rv.valueLabel } : undefined,
        }
      }),
    }))
  }
})

function getCriteriaLabel(criteriaTypeId: number): string {
  return criteriaTypes.value.find((c) => c.id === criteriaTypeId)?.label ?? String(criteriaTypeId)
}

function getCriteriaType(criteriaTypeId: number): CriteriaType | undefined {
  return criteriaTypes.value.find((c) => c.id === criteriaTypeId)
}

function getCriteriaFetchFn(
  criteriaTypeId: number,
): (query: string) => Promise<Base<{ id: number; name: string; code?: string }>> {
  const ct = getCriteriaType(criteriaTypeId)
  if (!ct)
    return (q) =>
      BranchesService.list(q) as Promise<Base<{ id: number; name: string; code?: string }>>

  switch (ct.code) {
    case 'company':
      return (q) =>
        CompaniesService.list(q) as Promise<Base<{ id: number; name: string; code?: string }>>
    case 'branch':
      return (q) =>
        BranchesService.list(q) as Promise<Base<{ id: number; name: string; code?: string }>>
    case 'sales_organization':
      return (q) =>
        SalesOrganizationsService.list(q) as Promise<
          Base<{ id: number; name: string; code?: string }>
        >
    case 'product_label':
      return (q) =>
        ProductLabelDefinitionsService.list(q) as Promise<
          Base<{ id: number; name: string; code?: string }>
        >
    case 'customer_label':
      return (q) =>
        CustomerLabelDefinitionsService.list(q) as Promise<
          Base<{ id: number; name: string; code?: string }>
        >
    default:
      return (q) => {
        const url = q ? `/gen/v1/${ct.sourceTable}?${q}` : `/gen/v1/${ct.sourceTable}`
        return ApiService.get<Base<{ id: number; name: string; code?: string }>>(url)
      }
  }
}

function getCriteriaValueIndex(ruleIndex: number, criteriaTypeId: number): number {
  return form.value.rules[ruleIndex].values.findIndex((v) => v.criteriaTypeId === criteriaTypeId)
}

function onCriteriaChange(newIds: number[]) {
  // Rebuild criteria list preserving existing order, appending new ones
  const existingOrdered = form.value.criteria.filter((c) => newIds.includes(c.criteriaTypeId))
  const addedIds = newIds.filter((id) => !form.value.criteria.some((c) => c.criteriaTypeId === id))
  const nextPos = existingOrdered.length + 1
  const newCriteria = [
    ...existingOrdered,
    ...addedIds.map((id, i) => ({ criteriaTypeId: id, position: nextPos + i })),
  ].map((c, i) => ({ ...c, position: i + 1 }))

  form.value.criteria = newCriteria
  selectedCriteriaTypeIds.value = newCriteria.map((c) => c.criteriaTypeId)

  // Reconcile each rule's values
  for (const rule of form.value.rules) {
    const newValues: RuleValueForm[] = newCriteria.map((crit) => {
      const existing = rule.values.find((v) => v.criteriaTypeId === crit.criteriaTypeId)
      return existing ?? { criteriaTypeId: crit.criteriaTypeId, valueId: null }
    })
    rule.values = newValues
  }
}

function moveCriteria(idx: number, dir: -1 | 1) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= form.value.criteria.length) return
  const arr = form.value.criteria.slice()
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
  form.value.criteria = arr.map((c, i) => ({ ...c, position: i + 1 }))
}

function addRule() {
  form.value.rules.push({
    resultType: 'price_list',
    priceListId: undefined,
    promotionId: undefined,
    values: form.value.criteria.map((crit) => ({
      criteriaTypeId: crit.criteriaTypeId,
      valueId: null,
    })),
  })
}

function onResultTypeChange(ruleIndex: number) {
  form.value.rules[ruleIndex].priceListId = undefined
  form.value.rules[ruleIndex].promotionId = undefined
  form.value.rules[ruleIndex]._initialPriceList = undefined
  form.value.rules[ruleIndex]._initialPromotion = undefined
}

function removeRule(index: number) {
  form.value.rules.splice(index, 1)
}

function setWildcard(ruleIndex: number, criteriaTypeId: number, toWildcard: boolean) {
  const vi = getCriteriaValueIndex(ruleIndex, criteriaTypeId)
  if (vi === -1) return
  const rv = form.value.rules[ruleIndex].values[vi]
  if (toWildcard) {
    rv.valueId = null
    rv._initialValue = undefined
  } else {
    // switching to "specify" — leave valueId as null until user picks
    rv.valueId = undefined as unknown as null
    rv._initialValue = undefined
  }
}

function setRuleValue(ruleIndex: number, criteriaTypeId: number, value: number | null) {
  const vi = getCriteriaValueIndex(ruleIndex, criteriaTypeId)
  if (vi !== -1) form.value.rules[ruleIndex].values[vi].valueId = value
}

function setRuleValueOption(
  ruleIndex: number,
  criteriaTypeId: number,
  opt: { id: number; name: string; code?: string },
) {
  const vi = getCriteriaValueIndex(ruleIndex, criteriaTypeId)
  if (vi !== -1) {
    form.value.rules[ruleIndex].values[vi]._initialValue = {
      id: opt.id,
      name: opt.name,
      code: opt.code,
    }
  }
}

function buildRuleKey(rule: RuleForm): string {
  const valuesKey = rule.values
    .map((v) => `${v.criteriaTypeId}:${v.valueId ?? ''}`)
    .sort()
    .join('|')
  return `${valuesKey}::${rule.resultType}`
}

function validate(): boolean {
  errors.value = { code: '', criteria: '', rules: '' }
  let valid = true

  if (!form.value.code.trim()) {
    errors.value.code = t('priceMatrix.validation.codeRequired')
    valid = false
  }

  if (form.value.criteria.length === 0) {
    errors.value.criteria = t('priceMatrix.validation.criteriaRequired')
    valid = false
  }

  if (form.value.rules.length === 0) {
    errors.value.rules = t('priceMatrix.validation.rulesRequired')
    valid = false
  }

  if (valid) {
    const missingResult = form.value.rules.some((rule) =>
      rule.resultType === 'price_list' ? !rule.priceListId : !rule.promotionId,
    )
    if (missingResult) {
      errors.value.rules = t('priceMatrix.errors.missingValue')
      valid = false
    }
  }

  if (valid) {
    const keys = form.value.rules.map(buildRuleKey)
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size < keys.length) {
      errors.value.rules = t('priceMatrix.errors.duplicateCombination')
      valid = false
    }
  }

  return valid
}

function onSave() {
  if (!validate()) return

  const dto: CreatePriceMatrixDto = {
    code: form.value.code.trim(),
    description: form.value.description || null,
    criteria: form.value.criteria.map((c) => ({
      criteriaTypeId: c.criteriaTypeId,
      position: c.position,
    })),
    rules: form.value.rules.map((rule) => ({
      resultType: rule.resultType,
      priceListId: rule.resultType === 'price_list' ? (rule.priceListId ?? null) : null,
      promotionId: rule.resultType === 'promotion' ? (rule.promotionId ?? null) : null,
      values: rule.values.map((v) => ({
        criteriaTypeId: v.criteriaTypeId,
        valueId: v.valueId ?? null,
      })),
    })),
  }

  emit('submit', dto)
}
</script>
