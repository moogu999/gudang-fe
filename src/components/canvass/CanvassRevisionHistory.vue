<template>
  <div class="space-y-2" data-testid="revision-history">
    <div
      v-for="rev in sorted"
      :key="rev.revision"
      class="rounded border border-stone-200 p-3 text-sm"
    >
      <div class="mb-1 flex items-center gap-2">
        <Tag
          severity="secondary"
          :value="t('canvassLoadings.labels.revision', { n: rev.revision })"
        />
        <Tag
          v-if="rev.revision === loading.revision && loading.status !== 'draft'"
          severity="info"
          :value="t('canvassLoadings.labels.current')"
        />
      </div>
      <ul class="text-stone-600">
        <li v-for="l in rev.lines" :key="l.productId">
          {{ l.productCode }} · {{ l.productName }} —
          <span class="font-medium">{{ formatBaseQty(l.quantity, l.pinnedUom) }}</span>
          <span v-if="uomLabel(l.pinnedUom)" class="block text-xs text-stone-400">{{
            uomLabel(l.pinnedUom)
          }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import type { CanvassLoading } from '@/types/canvassLoading.type'
import { formatBaseQty, uomLabel } from '@/utils/canvassHelpers'

const props = defineProps<{ loading: CanvassLoading }>()
const { t } = useI18n()

const sorted = computed(() =>
  [...(props.loading.revisions ?? [])].sort((a, b) => b.revision - a.revision),
)
</script>
