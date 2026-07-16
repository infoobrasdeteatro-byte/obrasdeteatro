import { describe, it, expect } from 'vitest'
import { derivePriorityLevel } from '../priority'

describe('derivePriorityLevel', () => {
  it('refleja exactamente la complejidad estimada recibida', () => {
    expect(derivePriorityLevel('baja')).toBe('baja')
    expect(derivePriorityLevel('media')).toBe('media')
    expect(derivePriorityLevel('alta')).toBe('alta')
  })
})
