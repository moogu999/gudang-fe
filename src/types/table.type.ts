/** A value a column can be filtered to, offered as a choice in its filter menu. */
export type ColumnFilterOption = {
  label: string
  value: string | number | boolean
}

export type Column = {
  field: string
  header: string
  exportable: boolean
  sortable: boolean
  class?: string
  filterable: boolean
  underlyingField?: string
  hideOnMobile?: boolean
  /**
   * Turns the column's filter into a picker over these values.
   *
   * Without it the filter menu shows a read-only box that only fills in when a
   * row is selected first — unusable for a column whose values are not free
   * text, like a boolean status.
   */
  filterOptions?: ColumnFilterOption[]
}
