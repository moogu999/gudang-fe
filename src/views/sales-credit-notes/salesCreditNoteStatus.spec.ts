import { describe, it, expect } from 'vitest'
import { appliedSeverity, appliedStatus } from './salesCreditNoteStatus'

describe('appliedStatus', () => {
  it('is none when nothing has been applied', () => {
    expect(appliedStatus('0.00', '1000.00')).toBe('none')
    expect(appliedStatus(undefined, '1000')).toBe('none')
  })
  it('is partial between zero and the total', () => {
    expect(appliedStatus('0.01', '1000.00')).toBe('partial')
    expect(appliedStatus('999.99', '1000.00')).toBe('partial')
  })
  it('is full once the whole total is applied', () => {
    expect(appliedStatus('1000.00', '1000.00')).toBe('full')
  })
})

describe('appliedSeverity', () => {
  it('maps none/partial/full to warn/info/success', () => {
    expect(appliedSeverity('none')).toBe('warn')
    expect(appliedSeverity('partial')).toBe('info')
    expect(appliedSeverity('full')).toBe('success')
  })
})
