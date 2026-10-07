import { describe, it, expect, beforeEach } from 'vitest'
import { crearToken, verificarToken, VIGENCIA_MS } from '../token-moderacion'

const ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'
const AHORA = new Date('2026-10-12T08:00:00Z')

beforeEach(() => {
  process.env.CONVOCATORIAS_MODERACION_SECRET = 'secreto-de-moderacion-de-prueba'
})

describe('tokens de moderación del resumen semanal', () => {
  it('válido: devuelve convocatoria, acción y caducidad a 14 días', () => {
    const t = crearToken(ID, 'aprobar', AHORA)!
    const v = verificarToken(t, AHORA)
    expect(v).toEqual({ ok: true, callId: ID, accion: 'aprobar', caduca: new Date(AHORA.getTime() + VIGENCIA_MS) })
  })

  it('sigue valiendo el día 14 y caduca después', () => {
    const t = crearToken(ID, 'rechazar', AHORA)!
    expect(verificarToken(t, new Date(AHORA.getTime() + VIGENCIA_MS)).ok).toBe(true)
    expect(verificarToken(t, new Date(AHORA.getTime() + VIGENCIA_MS + 1))).toEqual({ ok: false, motivo: 'caducado' })
  })

  it('manipulado: cambiar la acción, el id o la caducidad invalida la firma', () => {
    const t = crearToken(ID, 'rechazar', AHORA)!
    const [, firma] = t.split('.')
    const cambiar = (carga: object) => `${Buffer.from(JSON.stringify(carga)).toString('base64url')}.${firma}`
    const e = AHORA.getTime() + VIGENCIA_MS
    expect(verificarToken(cambiar({ c: ID, a: 'aprobar', e }), AHORA)).toEqual({ ok: false, motivo: 'firma' })
    expect(verificarToken(cambiar({ c: '11111111-1234-4abc-9def-0123456789ab', a: 'rechazar', e }), AHORA)).toEqual({ ok: false, motivo: 'firma' })
    expect(verificarToken(cambiar({ c: ID, a: 'rechazar', e: e + 999_999_999 }), AHORA)).toEqual({ ok: false, motivo: 'firma' })
  })

  it('firmado con otro secreto: no vale', () => {
    const t = crearToken(ID, 'aprobar', AHORA)!
    process.env.CONVOCATORIAS_MODERACION_SECRET = 'otro-secreto'
    expect(verificarToken(t, AHORA)).toEqual({ ok: false, motivo: 'firma' })
  })

  it('basura o vacío: formato', () => {
    expect(verificarToken('', AHORA)).toEqual({ ok: false, motivo: 'formato' })
    expect(verificarToken('abc', AHORA)).toEqual({ ok: false, motivo: 'formato' })
    expect(verificarToken(null, AHORA)).toEqual({ ok: false, motivo: 'formato' })
  })

  it('sin secreto configurado: ni se crea ni se acepta', () => {
    const t = crearToken(ID, 'aprobar', AHORA)!
    delete process.env.CONVOCATORIAS_MODERACION_SECRET
    expect(crearToken(ID, 'aprobar', AHORA)).toBeNull()
    expect(verificarToken(t, AHORA)).toEqual({ ok: false, motivo: 'sin_secreto' })
  })
})
