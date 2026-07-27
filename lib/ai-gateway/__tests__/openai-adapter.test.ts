import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } }
  }),
}))

describe('openaiAdapter', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockCreate.mockReset()
    delete process.env.OPENAI_MODEL
    const OpenAIConstructor = (await import('openai')).default
    vi.mocked(OpenAIConstructor).mockClear()
  })

  it('providerId es "openai"', async () => {
    const { openaiAdapter } = await import('../openai-adapter')
    expect(openaiAdapter.providerId).toBe('openai')
  })

  it('normaliza una respuesta exitosa al formato interno, sin exponer la estructura del SDK', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'respuesta generada' } }],
      usage: { total_tokens: 123 },
    })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute('hola')

    expect(outcome.content).toBe('respuesta generada')
    expect(outcome.tokensConsumed).toBe(123)
    expect(typeof outcome.latencyMs).toBe('number')
    expect(typeof outcome.model).toBe('string')
  })

  it('usa el modelo por defecto cuando OPENAI_MODEL no está configurado', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute('hola')

    expect(outcome.model).toBe('gpt-4o-mini')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }))
  })

  it('usa el modelo de OPENAI_MODEL cuando está configurado, sin codificarlo en la lógica', async () => {
    process.env.OPENAI_MODEL = 'modelo-configurado-de-prueba'
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute('hola')

    expect(outcome.model).toBe('modelo-configurado-de-prueba')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'modelo-configurado-de-prueba' }))
  })

  it('normaliza cualquier fallo del SDK a ProviderAdapterError, sin dejar escapar la excepción original', async () => {
    mockCreate.mockRejectedValue(new Error('fallo bruto del SDK'))

    const { openaiAdapter } = await import('../openai-adapter')
    const { ProviderAdapterError } = await import('../provider-adapter')

    await expect(openaiAdapter.execute('hola')).rejects.toBeInstanceOf(ProviderAdapterError)
  })

  it('reutiliza una única instancia del cliente entre llamadas (cliente singleton)', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })
    const OpenAIConstructor = (await import('openai')).default

    const { openaiAdapter } = await import('../openai-adapter')
    await openaiAdapter.execute('primera')
    await openaiAdapter.execute('segunda')

    expect(OpenAIConstructor).toHaveBeenCalledTimes(1)
  })

  it('nunca expone contenido del prompt en el resultado más allá del propio contenido generado', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'respuesta' } }], usage: { total_tokens: 5 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute('prompt secreto del usuario')

    expect(Object.keys(outcome).sort()).toEqual(['content', 'latencyMs', 'model', 'tokensConsumed'])
  })
})
