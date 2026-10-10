/**
 * Employee type names the application's logic depends on.
 *
 * Types are matched by name, not id: `employee_types` is editable master data,
 * so a seeded type's id differs between databases. Renaming one of these types
 * breaks every check that reads it, so keep the literals here, in one place.
 */
export const EMPLOYEE_TYPE_NAMES = {
  SALESMAN: 'Salesman',
  CANVASS: 'Canvass',
  SALES_SUPERVISOR: 'Sales Supervisor',
} as const

export type EmployeeTypeName = (typeof EMPLOYEE_TYPE_NAMES)[keyof typeof EMPLOYEE_TYPE_NAMES]
