import { h, defineComponent, type VNode } from 'vue'

/**
 * Test-only stand-in for PrimeVue's DataTable. The real one invokes each <Column>'s `#body`
 * scoped slot per row itself, which a template-only stub can't forward, so this reads each
 * Column vnode's `body` slot straight off `slots.default()` and calls it per row — the same
 * mechanism DataTable uses. Same approach as ApPaymentOpenItemPicker.spec.ts.
 *
 * Renders a checkbox per row that emits `row-select` / `row-unselect`, a header checkbox that
 * emits `select-all-change`, and the `#empty` slot when there are no rows.
 */
export const DataTableStub = defineComponent({
  name: 'DataTable',
  props: ['value', 'selection', 'selectionMode', 'selectAll'],
  emits: ['row-select', 'row-unselect', 'select-all-change'],
  setup(props, { slots, emit }) {
    return () => {
      const columnVNodes = (slots.default?.() ?? []) as VNode[]
      const items = (props.value ?? []) as Array<{ _key?: string }>
      const selection = (props.selection ?? []) as Array<{ _key?: string }>
      const rows = items.map((item, index) => {
        const selected = selection.some((s) => s._key === item._key)
        const bodies = columnVNodes.map((col) => {
          const bodySlot = (col.children as Record<string, unknown> | null)?.body as
            | ((scope: { data: unknown; index: number }) => VNode[])
            | undefined
          return bodySlot ? bodySlot({ data: item, index }) : null
        })
        return h('div', { class: 'row', key: item._key ?? index }, [
          props.selectionMode
            ? h('input', {
                type: 'checkbox',
                class: 'row-checkbox',
                checked: selected,
                onChange: () => emit(selected ? 'row-unselect' : 'row-select', { data: item }),
              })
            : null,
          ...bodies,
        ])
      })
      const header = props.selectionMode
        ? h('input', {
            type: 'checkbox',
            class: 'select-all',
            checked: props.selectAll,
            onChange: () => emit('select-all-change', { checked: !props.selectAll }),
          })
        : null
      const empty = items.length === 0 && slots.empty ? slots.empty() : null
      return h('div', {}, [header, ...rows, empty])
    }
  },
})

export const commonStubs = {
  Message: { name: 'Message', template: '<div class="message"><slot /></div>' },
  Tag: {
    name: 'Tag',
    props: ['value', 'severity'],
    template: '<span class="tag" :data-severity="severity">{{ value }}</span>',
  },
  InputNumber: {
    name: 'InputNumber',
    props: ['modelValue', 'max'],
    emits: ['update:modelValue'],
    template:
      '<input class="allocation" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  DataTable: DataTableStub,
}
