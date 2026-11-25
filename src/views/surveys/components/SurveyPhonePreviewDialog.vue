<template>
  <Dialog
    :visible="true"
    :header="t('surveys.preview.title')"
    modal
    :style="{ width: '28rem' }"
    :breakpoints="{ '640px': '95vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex justify-center">
      <div
        class="flex h-[40rem] w-[22.5rem] max-w-full flex-col overflow-hidden rounded-[2rem] border-8 border-stone-800 bg-white"
        data-testid="phone-frame"
      >
        <div class="bg-[var(--p-primary-500)] px-4 py-3 text-white">
          <div class="text-xs opacity-80">{{ t('surveys.preview.customer') }}</div>
          <div class="font-semibold">{{ name || t('surveys.preview.untitled') }}</div>
        </div>

        <div class="flex-1 overflow-y-auto p-4" data-testid="phone-screen">
          <p v-if="!screen" class="py-10 text-center text-sm text-stone-500">
            {{ t('surveys.preview.nothing') }}
          </p>

          <!-- Regular: one question per screen -->
          <template v-else-if="screen.kind === 'question'">
            <div class="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span data-testid="phone-progress">
                {{ t('surveys.preview.progress', { n: screen.index + 1, total: screen.total }) }}
              </span>
              <Tag
                v-if="screen.question.isRequired"
                :value="t('surveys.required.required')"
                severity="warn"
              />
            </div>
            <h3 class="font-semibold">{{ screen.question.text || t('surveys.preview.noText') }}</h3>
            <p v-if="screen.question.helpText" class="mt-1 text-sm text-stone-500">
              {{ screen.question.helpText }}
            </p>

            <div class="mt-4 flex flex-col gap-2">
              <InputText v-if="screen.question.type === 'text'" disabled class="w-full" />

              <div v-else-if="screen.question.type === 'number'" class="flex flex-col gap-1">
                <InputText disabled class="w-full" />
                <small class="text-stone-500">{{ numberHint(screen.question) }}</small>
              </div>

              <div v-else-if="screen.question.type === 'yes_no'" class="flex gap-2">
                <Button
                  :label="t('common.labels.yes')"
                  severity="secondary"
                  outlined
                  class="flex-1"
                />
                <Button
                  :label="t('common.labels.no')"
                  severity="secondary"
                  outlined
                  class="flex-1"
                />
              </div>

              <template
                v-else-if="
                  screen.question.type === 'single_choice' ||
                  screen.question.type === 'multi_choice'
                "
              >
                <label
                  v-for="option in screen.question.options ?? []"
                  :key="option.clientKey"
                  class="flex items-center gap-2 rounded border border-stone-200 p-2 text-sm"
                >
                  <i
                    :class="
                      screen.question.type === 'single_choice' ? 'pi pi-circle' : 'pi pi-stop'
                    "
                    class="text-stone-400"
                  />
                  {{ option.label || '…' }}
                </label>
                <label
                  v-if="screen.question.choiceAllowOther"
                  class="flex items-center gap-2 rounded border border-dashed border-stone-300 p-2 text-sm"
                >
                  <i class="pi pi-pencil text-stone-400" />
                  {{ t('surveys.preview.other') }}
                </label>
              </template>

              <div v-else-if="screen.question.type === 'photo'" class="flex flex-wrap gap-2">
                <div
                  v-for="n in screen.question.photoMax ?? 1"
                  :key="n"
                  class="flex size-16 items-center justify-center rounded border border-dashed border-stone-300 text-stone-400"
                >
                  <i class="pi pi-camera" />
                </div>
              </div>

              <template v-else-if="screen.question.type === 'competitor_grid'">
                <p
                  v-if="gridRows(screen.question).length === 0"
                  class="text-sm text-stone-500"
                  data-testid="phone-grid-empty"
                >
                  {{ t('surveys.preview.gridEmpty') }}
                </p>
                <div
                  v-for="row in gridRows(screen.question)"
                  :key="row.competitorProductId"
                  class="rounded border border-stone-200 p-2 text-sm"
                  data-testid="phone-grid-row"
                >
                  <div class="font-semibold">{{ row.brandName }} · {{ row.name }}</div>
                  <div class="mt-1 flex flex-wrap gap-1 text-xs text-stone-500">
                    <span v-if="screen.question.grid?.askAvailability">
                      {{ t('surveys.grid.askAvailability') }}
                    </span>
                    <span v-if="screen.question.grid?.askPrice">{{
                      t('surveys.grid.askPrice')
                    }}</span>
                    <span v-if="screen.question.grid?.askPhoto">{{
                      t('surveys.grid.askPhoto')
                    }}</span>
                  </div>
                  <div
                    v-if="screen.question.grid?.askOurStorePrice && row.comparisonProduct"
                    class="mt-1 text-xs text-stone-600"
                    data-testid="phone-grid-comparison"
                  >
                    {{ t('surveys.preview.ourPrice', { name: row.comparisonProduct.name }) }}
                  </div>
                </div>
                <div
                  v-if="screen.question.grid?.allowUnlisted"
                  class="rounded border border-dashed border-stone-300 p-2 text-sm text-stone-500"
                >
                  <i class="pi pi-plus mr-1" />{{ t('surveys.preview.unlisted') }}
                </div>
              </template>
            </div>
          </template>

          <!-- Stock check: one screen -->
          <template v-else>
            <h3 class="font-semibold">{{ t('surveys.preview.stockTitle') }}</h3>
            <p class="mt-1 text-sm text-stone-500">{{ t('surveys.preview.stockHint') }}</p>
            <p v-if="screen.sampleCount > 0" class="mt-2 text-xs text-stone-500">
              {{ t('surveys.preview.stockSample') }}
            </p>
            <p v-else-if="screen.products.length === 0" class="mt-4 text-sm text-stone-500">
              {{ t('surveys.preview.stockEmpty') }}
            </p>

            <div class="mt-3 flex flex-col gap-3">
              <div
                v-for="row in stockRows(screen)"
                :key="row.key"
                class="rounded border border-stone-200 p-2 text-sm"
                data-testid="phone-stock-row"
              >
                <div class="font-semibold">{{ row.name }}</div>
                <div class="mt-2 flex gap-2">
                  <Button
                    :label="t('surveys.preview.available')"
                    size="small"
                    :severity="stockAnswer[row.key] === 'yes' ? 'primary' : 'secondary'"
                    :outlined="stockAnswer[row.key] !== 'yes'"
                    class="flex-1"
                    data-testid="phone-available"
                    @click="stockAnswer[row.key] = 'yes'"
                  />
                  <Button
                    :label="t('surveys.preview.notAvailable')"
                    size="small"
                    :severity="stockAnswer[row.key] === 'no' ? 'danger' : 'secondary'"
                    :outlined="stockAnswer[row.key] !== 'no'"
                    class="flex-1"
                    data-testid="phone-not-available"
                    @click="stockAnswer[row.key] = 'no'"
                  />
                </div>
                <div
                  v-if="stockAnswer[row.key] === 'yes' && (screen.askStore || screen.askDisplay)"
                  class="mt-2 flex flex-col gap-2"
                  data-testid="phone-qty"
                >
                  <div v-if="screen.askStore" class="flex items-center gap-2">
                    <span class="w-24 text-xs">
                      {{ t('surveys.stock.store') }}{{ screen.storeRequired ? ' *' : '' }}
                    </span>
                    <InputText disabled class="flex-1" size="small" />
                    <span class="text-xs text-stone-500">PCS ▾</span>
                  </div>
                  <div v-if="screen.askDisplay" class="flex items-center gap-2">
                    <span class="w-24 text-xs">{{ t('surveys.stock.display') }}</span>
                    <InputText disabled class="flex-1" size="small" />
                    <span class="text-xs text-stone-500">PCS ▾</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-stone-200 p-3">
          <template v-if="screen && screen.kind === 'question'">
            <Button
              type="button"
              :label="t('surveys.preview.back')"
              severity="secondary"
              size="small"
              :disabled="current === 0"
              data-testid="phone-back"
              @click="current--"
            />
            <Button
              type="button"
              :label="
                current === screens.length - 1
                  ? t('surveys.preview.finish')
                  : t('surveys.preview.next')
              "
              size="small"
              :disabled="current === screens.length - 1"
              data-testid="phone-next"
              @click="current++"
            />
          </template>
          <Button
            v-else-if="screen"
            type="button"
            :label="t('surveys.preview.continueToOrder')"
            size="small"
            class="w-full"
            disabled
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.actions.close')" @click="emit('close')" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import type { SurveyGridProduct, SurveyQuestion } from '@/types/survey.type'
import { previewScreens, type PreviewScreen, type SurveyFormState } from '../surveyHelpers'

const props = defineProps<{
  /** The form as it stands, saved or not. */
  state: Pick<SurveyFormState, 'type' | 'questions' | 'stock'>
  name: string
  /** What each grid question would ask about, by question client key. */
  gridProducts: Record<string, SurveyGridProduct[]>
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const screens = computed(() => previewScreens(props.state))
const current = ref(0)
const screen = computed<PreviewScreen | undefined>(() => screens.value[current.value])

// Questions can be removed while the dialog is open (it is modal, but state is live).
watch(screens, (list) => {
  if (current.value > list.length - 1) current.value = Math.max(0, list.length - 1)
})

const stockAnswer = reactive<Record<string, 'yes' | 'no'>>({})

function stockRows(s: Extract<PreviewScreen, { kind: 'stock' }>) {
  const real = s.products.map((p) => ({ key: `p-${p.id}`, name: p.name }))
  const sample = Array.from({ length: s.sampleCount }, (_, i) => ({
    key: `sample-${i}`,
    name: t('surveys.preview.sampleProduct', { n: i + 1 }),
  }))
  return [...real, ...sample]
}

function gridRows(q: SurveyQuestion): SurveyGridProduct[] {
  return props.gridProducts[q.clientKey] ?? []
}

function numberHint(q: SurveyQuestion): string {
  const parts: string[] = []
  if (q.numberMin) parts.push(t('surveys.preview.min', { n: q.numberMin }))
  if (q.numberMax) parts.push(t('surveys.preview.max', { n: q.numberMax }))
  if (!q.numberAllowDecimal) parts.push(t('surveys.preview.wholeOnly'))
  return parts.join(' · ')
}
</script>
