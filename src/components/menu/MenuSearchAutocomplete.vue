<template>
  <AutoComplete
    v-model="model"
    :suggestions="suggestions"
    option-label="label"
    :placeholder="t('navigation.searchMenu')"
    :complete-on-focus="true"
    :delay="100"
    :scroll-height="scrollHeight"
    :autofocus="autofocus"
    class="w-full"
    input-class="w-full !pl-10"
    @complete="emit('complete', $event)"
    @option-select="emit('optionSelect', $event)"
  >
    <template #option="{ option }">
      <div class="flex items-center gap-3">
        <span :class="[option.icon, 'text-stone-500']" />
        <div class="flex flex-col">
          <span>{{ option.label }}</span>
          <small v-if="option.section" class="text-stone-500">{{ option.section }}</small>
        </div>
      </div>
    </template>
    <template #empty>
      <div class="px-3 py-2 text-stone-500">{{ t('navigation.searchNoResults') }}</div>
    </template>
  </AutoComplete>
</template>

<script setup lang="ts">
import AutoComplete, { type AutoCompleteOptionSelectEvent } from 'primevue/autocomplete'
import { useI18n } from 'vue-i18n'
import type { MenuSearchResult } from '@/composables'

const { t } = useI18n()

/**
 * Shared menu search box used by both the desktop header and the mobile search
 * drawer. The only per-instance differences (scroll height, autofocus) are props.
 */
const model = defineModel<string | MenuSearchResult | null>()

withDefaults(
  defineProps<{
    /** Suggestions to display in the dropdown. */
    suggestions: MenuSearchResult[]
    /** Max height of the suggestions panel (e.g. '20rem', '60vh'). */
    scrollHeight: string
    /** Whether to focus the input on mount (used by the mobile drawer). */
    autofocus?: boolean
  }>(),
  {
    autofocus: false,
  },
)

const emit = defineEmits<{
  complete: [event: { query: string }]
  optionSelect: [event: AutoCompleteOptionSelectEvent]
}>()
</script>
