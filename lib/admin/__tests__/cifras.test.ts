import { describe, it, expect } from 'vitest'
import { cargarCifras } from '../datos'

/**
 * Cliente falso: cualquier cadena .from().select().eq()/.is()/.gte()/.in()/
 * .limit() resuelve con `respuesta(tabla)`.
 */
function cliente(respuesta: (tabla: string) => { count?: number | null; data?: unknown; error: unknown }) {
  return {
    from: (tabla: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'neq', 'is', 'gte', 'in', 'limit']) q[m] = () => q
      q.then = (ok: (r: unknown) => unknown) => ok({ count: null, data: null, ...respuesta(tabla) })
      return q
    },
  } as never
}

const AHORA = new Date('2026-10-29T12:00:00Z')

describe('La plataforma en cifras: un recuento fallido es «—», no 0', () => {
  it('con recuentos buenos, los números (incluido el 0)', async () => {
    const c = cliente(t => (t === 'subscriptions' ? { data: [{ plan: 'premium' }], error: null } : { count: t === 'espacios_escenicos' ? 0 : 7, error: null }))
    const r = await cargarCifras(c, c, false, AHORA)
    expect(r).toMatchObject({ usuarios: 7, usuariosNuevos7d: 7, espaciosPublicados: 0, suscriptoresProscenio: 7, suscripcionesPorPlan: [{ plan: 'premium', n: 1 }] })
  })

  it('recuento vacío sin error (HEAD a una tabla que no existe): null', async () => {
    const c = cliente(t => (t === 'subscriptions' ? { data: [], error: null } : { count: null, error: null }))
    const r = await cargarCifras(c, c, false, AHORA)
    expect(r).toMatchObject({ usuarios: null, usuariosNuevos7d: null, espaciosPublicados: null, suscriptoresProscenio: null })
  })

  it('recuento con error: null', async () => {
    const c = cliente(t => (t === 'subscriptions' ? { data: null, error: { message: 'x' } } : { count: null, error: { message: 'x' } }))
    const r = await cargarCifras(c, c, false, AHORA)
    expect(r).toMatchObject({ usuarios: null, espaciosPublicados: null, suscripcionesPorPlan: null })
  })
})

describe('Plazas de Elenco Fundador (solo admin)', () => {
  it('aceptadas y pendientes sin anular sobre 100', async () => {
    const c = cliente(t => (t === 'elenco_fundadores' ? { count: 2, error: null }
      : t === 'subscriptions' || t === 'embajadores_invitaciones' ? { data: [], error: null } : { count: 1, error: null }))
    const r = await cargarCifras(c, c, true, AHORA)
    expect(r.elenco).toEqual({ ocupadas: 2, total: 100 })
  })

  it('con error, «—» (null); sin admin, no se lee', async () => {
    const c = cliente(t => (t === 'elenco_fundadores' ? { count: null, error: { message: 'x' } } : { data: [], count: 1, error: null }))
    expect((await cargarCifras(c, c, true, AHORA)).elenco).toBeNull()
    expect((await cargarCifras(c, c, false, AHORA)).elenco).toBeUndefined()
  })
})
