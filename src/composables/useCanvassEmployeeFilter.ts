import { computed, onMounted, ref } from 'vue'
import { EmployeeTypesService } from '@/services'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import FilterOperator from '@/constants/filterOperator'

/**
 * Filter that narrows an employee picker to Canvass employees. Employee types are
 * master data matched by name, so the id is looked up once on mount; until it
 * arrives `ready` is false and the picker should not be offered yet.
 */
export function useCanvassEmployeeFilter() {
  const canvassTypeId = ref<number | null>(null)

  onMounted(async () => {
    try {
      const types = (await EmployeeTypesService.list()).data
      canvassTypeId.value = types.find((x) => x.name === EMPLOYEE_TYPE_NAMES.CANVASS)?.id ?? null
    } catch {
      canvassTypeId.value = null
    }
  })

  const filters = computed(() =>
    canvassTypeId.value === null
      ? []
      : [
          {
            filterBy: 'employeeTypeId',
            filterOperator: FilterOperator.EQUAL,
            filterValue: String(canvassTypeId.value),
          },
          { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
        ],
  )

  return { canvassTypeId, filters, ready: computed(() => canvassTypeId.value !== null) }
}
