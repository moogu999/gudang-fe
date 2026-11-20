<template>
  <Panel :header="header" class="mb-3" data-testid="rejection-panel">
    <p class="mb-1 text-sm text-stone-500">
      {{ dayjs(rejection.rejectedAt).format(DateFormat.DATE_TIME) }}
      <template v-if="rejection.rejectedByEmail"> · {{ rejection.rejectedByEmail }}</template>
    </p>
    <p class="mb-3 text-sm whitespace-pre-line">
      <span class="font-semibold">{{ t('canvass.rejection.note') }}:</span> {{ rejection.note }}
    </p>
    <DataTable :value="rejection.lines" size="small" class="text-sm">
      <Column field="productCode" :header="t('canvass.fields.productCode')" />
      <Column field="productName" :header="t('canvass.fields.product')" />
      <Column :header="t('canvass.rejection.documentQty')">
        <template #body="{ data }">
          <Tag
            v-if="data.documentQty === undefined"
            severity="warn"
            :value="t('canvass.rejection.extra')"
          />
          <span v-else>{{ formatBaseQty(data.documentQty) }}</span>
        </template>
      </Column>
      <Column :header="t('canvass.rejection.physicalQty')">
        <template #body="{ data }">
          <span
            :class="
              data.documentQty !== undefined && toQty(data.documentQty) !== toQty(data.physicalQty)
                ? 'font-semibold text-red-600'
                : ''
            "
            >{{ formatBaseQty(data.physicalQty) }}</span
          >
        </template>
      </Column>
    </DataTable>
  </Panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Panel from 'primevue/panel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DateFormat from '@/constants/dateFormat'
import type { CanvassRejection } from '@/types/canvassLoading.type'
import { formatBaseQty, toQty } from '@/utils/canvassHelpers'

const props = defineProps<{ rejection: CanvassRejection }>()
const { t } = useI18n()

const header = computed(() => t('canvass.rejection.title', { revision: props.rejection.revision }))
</script>
