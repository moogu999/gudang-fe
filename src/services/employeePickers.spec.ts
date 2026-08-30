import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// InfiniteSelect builds the generic dialect (`search`, `page`), which
// /v1/employees does not read -- it answers 200 with the unfiltered list
// instead. `listForSelect` is the translation, and every picker has to go
// through it; five call sites were left on the raw `list()` when it was
// introduced, so the drift is worth a test rather than another review pass.
describe('employee pickers', () => {
  it('fetch through listForSelect, never through list', () => {
    const offenders: string[] = []

    for (const file of vueFiles(join(__dirname, '..'))) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (line.includes('fetch-fn') && /EmployeesService\.list\s*\(/.test(line)) {
            offenders.push(`${file}:${i + 1}`)
          }
        })
    }

    expect(offenders).toEqual([])
  })
})

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}
