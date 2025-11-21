<template>
  <div>
    <h1 class="mb-5 text-lg font-semibold md:text-2xl">Permissions</h1>

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
import DateFormat from '@/constants/dateFormat'
import TableComponent from '@/components/table/TableComponent.vue'
import type { Column } from '@/types/table.type'
import dayjs from 'dayjs'
import Card from 'primevue/card'
import { API_ENDPOINTS } from '@/constants/api'

// Table
const url = API_ENDPOINTS.GEN_PERMISSIONS

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
