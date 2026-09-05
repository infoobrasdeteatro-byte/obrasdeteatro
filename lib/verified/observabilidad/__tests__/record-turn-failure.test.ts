import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { recordMetric } from '@/lib/telemetria'
import { recordTurnFailure } from '../record-turn-failure'
import type { TurnFailure } from '../types'

vi.mock('@/lib/telemetria', () => ({ recordMetric: vi.fn() }))

const FALLO: TurnFailure = {
  turnId: 'turn-1',
  error: new Error('el RPC de contabilidad no responde'),
  executionCount: 0,
  reservationId: 'res-1',
  closure: 'liberada',
}

/** La metrica emitida, ya desempaquetada. */
function metrica() {
  const llamada = vi.mocked(recordMetric).mock.calls[0]
  return llamada ? llamada[1] : null
}

let registro: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.mocked(recordMetric).mockReset().mockResolvedValue(true)
  registro = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  registro.mockRestore()
})

/**
 * P1-C — QUE QUEDA CUANDO UN TURNO SE ROMPE.
 *
 * Antes no quedaba nada: ni `turnId`, ni causa, ni reserva. El turno solo
 * existia como un 500 en los registros de la plataforma.
 */
describe('recordTurnFailure — rastro del turno fallido (P1-C)', () => {
  it('1 · emite UNA metrica del turno sobre el mecanismo ya existente', async () => {
    await recordTurnFailure('profile-1', FALLO)

    expect(recordMetric).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordMetric).mock.calls[0][0]).toBe('profile-1')
    expect(metrica()?.name).toBe('scenaia.turn.failed')
  })

  it('2 · el TURNO queda identificado, con la misma etiqueta que el resto de sus metricas', async () => {
    await recordTurnFailure('profile-1', FALLO)

    // `requestId` y no un nombre propio: es lo que permite reunir el fallo
    // con todo lo demas que se observo del mismo turno.
    expect(metrica()?.tags).toMatchObject({ requestId: 'turn-1' })
  })

  it('3 · la RESERVA se conserva cuando existe, y se dice cuando no', async () => {
    await recordTurnFailure('profile-1', FALLO)
    expect(metrica()?.tags).toMatchObject({ reservationId: 'res-1' })

    vi.mocked(recordMetric).mockClear()
    await recordTurnFailure('profile-1', { ...FALLO, reservationId: null })
    expect(metrica()?.tags).toMatchObject({ reservationId: 'ninguno' })
  })

  it('4 · la CLASE del error viaja; el mensaje NO', async () => {
    await recordTurnFailure('profile-1', FALLO)

    expect(metrica()?.tags).toMatchObject({ errorName: 'Error' })
    // El limite de privacidad de esta capa es duro: el mensaje de una
    // excepcion puede arrastrar texto de la peticion, y por eso no sale.
    expect(JSON.stringify(metrica())).not.toContain('el RPC de contabilidad no responde')
  })

  it('4b · un AggregateError -- turno roto Y cierre fallido -- se distingue', async () => {
    await recordTurnFailure('profile-1', {
      ...FALLO,
      error: new AggregateError([new Error('a'), new Error('b')], 'ambos'),
      closure: 'fallo_al_cerrar',
    })

    expect(metrica()?.tags).toMatchObject({ errorName: 'AggregateError', closure: 'fallo_al_cerrar' })
  })

  it('4c · lo que no es un Error no inventa una clase a partir de su contenido', async () => {
    await recordTurnFailure('profile-1', { ...FALLO, error: 'un texto suelto' })

    expect(metrica()?.tags).toMatchObject({ errorName: 'desconocido' })
    expect(JSON.stringify(metrica())).not.toContain('un texto suelto')
  })

  it('5 · NO SE REGISTRA UNA EJECUCION IA QUE NO OCURRIO', async () => {
    await recordTurnFailure('profile-1', FALLO)

    // Ninguna metrica de la familia del proveedor: esto es un hecho del
    // turno, no de una llamada.
    expect(metrica()?.name).not.toMatch(/^ai_gateway\./)
    // Y se dice explicitamente cuantas hubo, que es cero.
    expect(metrica()?.tags).toMatchObject({ executions: '0' })
  })

  it('5b · cuando SI hubo ejecuciones, el recuento lo dice', async () => {
    await recordTurnFailure('profile-1', { ...FALLO, executionCount: 2, closure: 'liquidada' })

    expect(metrica()?.tags).toMatchObject({ executions: '2', closure: 'liquidada' })
  })

  it('6 · el MENSAJE TECNICO y la TRAZA se conservan, en el registro tecnico', async () => {
    await recordTurnFailure('profile-1', FALLO)

    const [etiqueta, detalle] = registro.mock.calls[0] as [string, Record<string, unknown>]

    expect(etiqueta).toContain('[P1-C]')
    expect(detalle.turnId).toBe('turn-1')
    expect(detalle.message).toBe('el RPC de contabilidad no responde')
    expect(detalle.reservationId).toBe('res-1')
    expect(detalle.cierreEconomico).toBe('liberada')
    expect(typeof detalle.occurredAt).toBe('string')
  })

  it('7 · NO ANADE UNA VIA DE FALLO PROPIA: hereda la garantia de `recordMetric`', async () => {
    // El contrato real de Telemetria es no lanzar nunca: captura lo suyo y
    // devuelve un booleano. Lo que se comprueba aqui es que componer el
    // registro tampoco introduce una via nueva de excepcion.
    vi.mocked(recordMetric).mockResolvedValue(false)

    await expect(recordTurnFailure('profile-1', FALLO)).resolves.toBe(false)
  })

  it('7b · y si algun dia Telemetria rompiera ese contrato, el fallo NO se disfraza de exito', async () => {
    // No se absorbe aqui: quien invoca -- el Orquestador -- ya protege esta
    // llamada, y ahi es donde se decide que observar jamas sustituye al
    // error observado. Tragarselo dos veces solo ocultaria que telemetria
    // esta caida.
    vi.mocked(recordMetric).mockRejectedValue(new Error('telemetria caida'))

    await expect(recordTurnFailure('profile-1', FALLO)).rejects.toThrow('telemetria caida')
  })

  it('8 · NO CREA PERSISTENCIA NUEVA: solo el mecanismo de telemetria ya autorizado', () => {
    const codigo = readFileSync(join(__dirname, '..', 'record-turn-failure.ts'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')

    expect(codigo).not.toMatch(/supabase|createClient|from\(|rpc\(|insert|@\/lib\/repository-layer/i)
    expect(codigo).toMatch(/from '@\/lib\/telemetria'/)
    // Ni toca la economia.
    expect(codigo).not.toMatch(/settleReservation|releaseReservation|estimatedCost|CREDIT_VALUE/)
  })
})
