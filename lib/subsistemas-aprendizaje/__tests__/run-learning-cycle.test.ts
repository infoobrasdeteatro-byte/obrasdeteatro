import { describe, it, expect } from 'vitest'
import { runLearningCycle } from '../run-learning-cycle'

describe('runLearningCycle', () => {
  it('nunca ejecuta nada real en esta versión (executed siempre false)', async () => {
    const result = await runLearningCycle()

    expect(result.executed).toBe(false)
  })

  it('devuelve siempre el mismo motivo, fijo y determinista', async () => {
    const first = await runLearningCycle()
    const second = await runLearningCycle()

    expect(first.reason).toBe(second.reason)
    expect(typeof first.reason).toBe('string')
    expect(first.reason.length).toBeGreaterThan(0)
  })

  it('nunca lanza excepción', async () => {
    await expect(runLearningCycle()).resolves.toBeDefined()
  })
})
