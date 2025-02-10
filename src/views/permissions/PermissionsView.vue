<template>
  <div>
    <h1 class="text-lg font-semibold md:text-2xl mb-5">Permissions</h1>
    <Card>
      <template #content>
        <TableComponent :url="url" :columns="columns">
          <template #content="{ col, data }">
            <span v-if="col.header === 'Created At'">{{
              dayjs(data[col.field]).format(DateFormat.DATE_TIME)
            }}</span>
          </template>
        </TableComponent>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import DateFormat from '@/common/enum/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import type { Column } from '@/components/table/table.type'
import dayjs from 'dayjs'
import Card from 'primevue/card'

// Table
const url = '/gen/v1/permissions'

const columns: Column[] = [
  {
    field: 'name',
    header: 'Name',
    exportable: true,
    sortable: true,
    filterable: true,
  },
  {
    field: 'description',
    header: 'Description',
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-50',
  },
  {
    field: 'createdAt',
    header: 'Created At',
    exportable: true,
    sortable: true,
    filterable: false,
    class: 'min-w-45',
  },
]
</script>
