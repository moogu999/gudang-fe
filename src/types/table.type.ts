export type Column = {
  field: string
  header: string
  exportable: boolean
  sortable: boolean
  class?: string
  filterable: boolean
  underlyingField?: string
  hideOnMobile?: boolean
}
