import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } }
  }),
}))

/**
 * Peticion minima al adaptador. El techo de generacion es obligatorio por
 * contrato: no existe forma de invocar al adaptador sin declararlo.
 */
function peticion(prompt: string, maxOutputTokens = 1024) {
  return { prompt, maxOutputTokens }
}

describe('openaiAdapter', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockCreate.mockReset()
    delete process.env.OPENAI_MODEL
    process.env.OPENAI_API_KEY = 'test-openai-key'
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
    const outcome = await openaiAdapter.execute(peticion('hola'))

    expect(outcome.content).toBe('respuesta generada')
    expect(outcome.tokensConsumed).toBe(123)
    expect(typeof outcome.latencyMs).toBe('number')
    expect(typeof outcome.model).toBe('string')
  })

  it('usa el modelo por defecto cuando OPENAI_MODEL no está configurado', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute(peticion('hola'))

    expect(outcome.model).toBe('gpt-4o-mini')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }))
  })

  it('usa el modelo de OPENAI_MODEL cuando está configurado, sin codificarlo en la lógica', async () => {
    process.env.OPENAI_MODEL = 'modelo-configurado-de-prueba'
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute(peticion('hola'))

    expect(outcome.model).toBe('modelo-configurado-de-prueba')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'modelo-configurado-de-prueba' }))
  })

  it('normaliza cualquier fallo del SDK a ProviderAdapterError, sin dejar escapar la excepción original', async () => {
    mockCreate.mockRejectedValue(new Error('fallo bruto del SDK'))

    const { openaiAdapter } = await import('../openai-adapter')
    const { ProviderAdapterError } = await import('../provider-adapter')

    await expect(openaiAdapter.execute(peticion('hola'))).rejects.toBeInstanceOf(ProviderAdapterError)
  })

  it('reutiliza una única instancia del cliente entre llamadas (cliente singleton)', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })
    const OpenAIConstructor = (await import('openai')).default

    const { openaiAdapter } = await import('../openai-adapter')
    await openaiAdapter.execute(peticion('primera'))
    await openaiAdapter.execute(peticion('segunda'))

    expect(OpenAIConstructor).toHaveBeenCalledTimes(1)
  })

  it('nunca expone contenido del prompt en el resultado más allá del propio contenido generado', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'respuesta' } }], usage: { total_tokens: 5 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute(peticion('prompt secreto del usuario'))

    expect(Object.keys(outcome).sort()).toEqual([
      'content',
      'inputTokens',
      'latencyMs',
      'model',
      'outputTokens',
      'tokensConsumed',
      'truncated',
    ])
  })

  it('lanza ProviderAdapterError cuando OPENAI_API_KEY está ausente, sin construir el cliente', async () => {
    delete process.env.OPENAI_API_KEY

    const { openaiAdapter } = await import('../openai-adapter')
    const { ProviderAdapterError } = await import('../provider-adapter')
    const OpenAIConstructor = (await import('openai')).default

    await expect(openaiAdapter.execute(peticion('hola'))).rejects.toBeInstanceOf(ProviderAdapterError)
    expect(OpenAIConstructor).not.toHaveBeenCalled()

    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('lanza ProviderAdapterError cuando OPENAI_API_KEY está vacía o solo contiene espacios, sin construir el cliente', async () => {
    process.env.OPENAI_API_KEY = '   '

    const { openaiAdapter } = await import('../openai-adapter')
    const { ProviderAdapterError } = await import('../provider-adapter')
    const OpenAIConstructor = (await import('openai')).default

    await expect(openaiAdapter.execute(peticion('hola'))).rejects.toBeInstanceOf(ProviderAdapterError)
    expect(OpenAIConstructor).not.toHaveBeenCalled()

    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('construye el cliente con normalidad cuando OPENAI_API_KEY tiene un valor no vacío', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } })

    const { openaiAdapter } = await import('../openai-adapter')
    const outcome = await openaiAdapter.execute(peticion('hola'))

    expect(outcome.content).toBe('ok')
  })
})

/**
 * BLOQUE 1 — techo de tokens de salida.
 *
 * Lo que se comprueba no es que el numero sea 1024, sino que el numero
 * VIENE DE FUERA: un adaptador que eligiera su propio techo volveria a
 * dejar la longitud de la respuesta -- y por tanto el coste -- fuera de
 * control en cuanto se registrase un proveedor mas.
 */
describe('openaiAdapter — techo de generacion (Bloque 1)', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockCreate.mockReset()
    delete process.env.OPENAI_MODEL
    process.env.OPENAI_API_KEY = 'test-openai-key'
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 10, prompt_tokens: 8, completion_tokens: 2 },
    })
  })

  it('traslada al SDK el techo recibido, sin alterarlo', async () => {
    const { openaiAdapter } = await import('../openai-adapter')

    await openaiAdapter.execute(peticion('hola', 1024))

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ max_completion_tokens: 1024 }))
  })

  it('OBEDECE: un techo distinto se traslada tal cual, el adaptador no impone el suyo', async () => {
    const { openaiAdapter } = await import('../openai-adapter')

    await openaiAdapter.execute(peticion('hola', 256))

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ max_completion_tokens: 256 }))
  })

  it('NUNCA ejecuta sin techo: toda llamada al SDK lo lleva y es positivo', async () => {
    const { openaiAdapter } = await import('../openai-adapter')

    await openaiAdapter.execute(peticion('hola'))

    const [argumentos] = mockCreate.mock.calls[0]
    expect(argumentos).toHaveProperty('max_completion_tokens')
    expect(argumentos.max_completion_tokens).toBeGreaterThan(0)
  })

  it('el prompt sigue viajando intacto junto al techo', async () => {
    const { openaiAdapter } = await import('../openai-adapter')

    await openaiAdapter.execute(peticion('texto de la peticion'))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'texto de la peticion' }] })
    )
  })
})


/**
 * BLOQUE 5C — truncamiento observable.
 *
 * El techo del Bloque 1 se aplicaba, pero cuando mordia no quedaba rastro:
 * el usuario recibia una frase cortada a mitad y el sistema la daba por
 * completa. Estas pruebas custodian la unica pregunta que importa aqui --
 * si la respuesta esta entera --, no cuanto costo.
 */
describe('openaiAdapter — truncamiento (Bloque 5C)', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockCreate.mockReset()
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  function respuesta(finishReason: string | undefined) {
    return {
      choices: [{ message: { content: 'respuesta' }, finish_reason: finishReason }],
      usage: { total_tokens: 5, prompt_tokens: 3, completion_tokens: 2 },
    }
  }

  it('finish_reason="length" es truncamiento', async () => {
    mockCreate.mockResolvedValue(respuesta('length'))
    const { openaiAdapter } = await import('../openai-adapter')

    expect((await openaiAdapter.execute(peticion('hola'))).truncated).toBe(true)
  })

  it('finish_reason="stop" NO es truncamiento: es el final normal', async () => {
    mockCreate.mockResolvedValue(respuesta('stop'))
    const { openaiAdapter } = await import('../openai-adapter')

    expect((await openaiAdapter.execute(peticion('hola'))).truncated).toBe(false)
  })

  it('CUALQUIER otra causa NO es truncamiento: describen otra cosa', async () => {
    // Confundirlas haria que la metrica midiera una mezcla de causas y
    // dejara de servir para decidir un techo.
    const { openaiAdapter } = await import('../openai-adapter')

    for (const causa of ['content_filter', 'tool_calls', 'function_call', undefined]) {
      mockCreate.mockResolvedValue(respuesta(causa))
      expect((await openaiAdapter.execute(peticion('hola'))).truncated, String(causa)).toBe(false)
    }
  })

  it('el contenido generado llega INTACTO aunque este truncado', async () => {
    // Se avisa de que falta texto; nunca se altera, recorta ni completa el
    // que si llego.
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'una frase a medio ter' }, finish_reason: 'length' }],
      usage: { total_tokens: 5 },
    })
    const { openaiAdapter } = await import('../openai-adapter')

    const outcome = await openaiAdapter.execute(peticion('prompt del usuario'))

    expect(outcome.content).toBe('una frase a medio ter')
    expect(outcome.truncated).toBe(true)
  })

  it('el prompt sigue viajando sin alterar, y el techo recibido sigue aplicandose', async () => {
    mockCreate.mockResolvedValue(respuesta('length'))
    const { openaiAdapter } = await import('../openai-adapter')

    await openaiAdapter.execute(peticion('prompt exacto del usuario', 777))

    const [enviado] = mockCreate.mock.calls[0]
    expect(enviado.messages[0].content).toBe('prompt exacto del usuario')
    // Observar el truncamiento no toca la politica de techo (Bloque 1).
    expect(enviado.max_completion_tokens).toBe(777)
  })
})
