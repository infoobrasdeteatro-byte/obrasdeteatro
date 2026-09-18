import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getProfessionalProfilePublic, getProfilePlan } from '@/lib/repository-layer'
import { resolveScenaiaAccess, accessDenialStatus } from '../scenaia-access'

vi.mock('@/lib/repository-layer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/repository-layer')>()),
  getProfessionalProfilePublic: vi.fn(),
  getProfilePlan: vi.fn(),
}))

/**
 * P1.3 — LA REGLA DE ACCESO, EN UN SOLO SITIO.
 *
 * `getUsageLimit` llega REAL, sin simular: el catalogo de cuotas del
 * Bloque 5 es la unica fuente de "que planes existen", y simularlo aqui
 * permitiria que esta prueba siguiera pasando el dia en que el acceso
 * dejara de consultarlo.
 */
function perfil(isVerified: boolean) {
  return { firstName: null, lastName: null, artisticName: null, slug: null, bio: null, avatarUrl: null, coverUrl: null, isPublic: true, isVerified, websiteUrl: null }
}

beforeEach(() => {
  vi.mocked(getProfessionalProfilePublic).mockReset().mockResolvedValue(perfil(true) as never)
  vi.mocked(getProfilePlan).mockReset().mockResolvedValue('gratuito')
})

describe('resolveScenaiaAccess — P1.3', () => {
  it('1 · NO AUTENTICADO: denegado, y sin consultar nada mas', async () => {
    const acceso = await resolveScenaiaAccess(null)

    expect(acceso).toEqual({ allowed: false, reason: 'no_autenticado' })
    // No se paga una consulta por alguien que no tiene sesion.
    expect(getProfessionalProfilePublic).not.toHaveBeenCalled()
    expect(getProfilePlan).not.toHaveBeenCalled()
  })

  it('2 · AUTENTICADO SIN VERIFICAR: denegado, y no se llega a mirar el plan', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(perfil(false) as never)

    const acceso = await resolveScenaiaAccess('user-1')

    expect(acceso).toEqual({ allowed: false, reason: 'no_verificado' })
    expect(getProfilePlan).not.toHaveBeenCalled()
  })

  it('2b · perfil inexistente: se trata como no verificado, nunca como permitido', async () => {
    vi.mocked(getProfessionalProfilePublic).mockResolvedValue(null)

    expect(await resolveScenaiaAccess('user-1')).toEqual({ allowed: false, reason: 'no_verificado' })
  })

  it('3 · VERIFICADO + GRATUITO: PERMITIDO', async () => {
    // Tiene 5 creditos de IA desde el Bloque 5. Cerrarle el acceso
    // contradiria la arquitectura economica ya aprobada.
    vi.mocked(getProfilePlan).mockResolvedValue('gratuito')

    expect(await resolveScenaiaAccess('user-1')).toEqual({ allowed: true, userId: 'user-1', plan: 'gratuito' })
  })

  it('4 · VERIFICADO + PREMIUM: permitido', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('premium')

    expect((await resolveScenaiaAccess('user-1')).allowed).toBe(true)
  })

  it('5 · VERIFICADO + DESTACADO: permitido', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('destacado')

    expect((await resolveScenaiaAccess('user-1')).allowed).toBe(true)
  })

  it('6 · VERIFICADO + EMPRESAS SIN FILA EN subscriptions: PERMITIDO', async () => {
    // Es el caso real: la cuenta empresas no tiene fila de suscripcion. Su
    // entitlement es el plan, no el registro de pago.
    vi.mocked(getProfilePlan).mockResolvedValue('empresas')

    expect(await resolveScenaiaAccess('user-1')).toEqual({ allowed: true, userId: 'user-1', plan: 'empresas' })
  })

  it('7 · CANCELADO: el webhook ya degrado el plan a gratuito, y entra como gratuito', async () => {
    // No se consulta `subscriptions`: el plan efectivo YA refleja la baja.
    vi.mocked(getProfilePlan).mockResolvedValue('gratuito')

    const acceso = await resolveScenaiaAccess('user-1')

    expect(acceso).toEqual({ allowed: true, userId: 'user-1', plan: 'gratuito' })
  })

  it('7b · PLAN NO RECONOCIDO: denegado, ni siquiera degradado a gratuito', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue('plan-que-no-existe')

    expect(await resolveScenaiaAccess('user-1')).toEqual({ allowed: false, reason: 'plan_no_reconocido' })
  })

  it('7c · SIN PLAN (perfil inexistente o consulta fallida): denegado', async () => {
    vi.mocked(getProfilePlan).mockResolvedValue(null)

    expect(await resolveScenaiaAccess('user-1')).toEqual({ allowed: false, reason: 'plan_no_reconocido' })
  })

  it('8 · PAST_DUE conserva su plan efectivo, y por tanto el acceso', async () => {
    // El webhook NO degrada el plan ante un impago. P1.3 respeta ese
    // estado vigente en vez de introducir una politica nueva de bloqueo.
    vi.mocked(getProfilePlan).mockResolvedValue('premium')

    expect((await resolveScenaiaAccess('user-1')).allowed).toBe(true)
  })

  it('los planes reconocidos son los del CATALOGO DE CUOTAS, no una lista propia', async () => {
    for (const plan of ['gratuito', 'premium', 'destacado', 'empresas']) {
      vi.mocked(getProfilePlan).mockResolvedValue(plan)
      expect((await resolveScenaiaAccess('user-1')).allowed, plan).toBe(true)
    }
  })

  it('NO consulta `subscriptions`: una sola fuente de entitlement', async () => {
    // Se mira el CODIGO, no la documentacion: el comentario nombra
    // `subscriptions` y Stripe precisamente para explicar por que NO se
    // consultan, y explicarlo no es consultarlos.
    const codigo = readFileSync(join(__dirname, '..', 'scenaia-access.ts'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')

    expect(codigo).not.toMatch(/getSubscription|subscriptions|stripe/i)
    // Y no mantiene su propia lista de planes: la pide al catalogo.
    expect(codigo).not.toMatch(/'gratuito'|'premium'|'destacado'|'empresas'/)
    expect(codigo).toMatch(/getUsageLimit\(plan\)/)
  })

  it('el veredicto identifica al usuario cuando concede', async () => {
    const acceso = await resolveScenaiaAccess('user-42')

    expect(acceso.allowed && acceso.userId).toBe('user-42')
  })

  it('el codigo HTTP corresponde a la causa, y lo decide la regla', () => {
    expect(accessDenialStatus('no_autenticado')).toBe(401)
    expect(accessDenialStatus('no_verificado')).toBe(403)
    expect(accessDenialStatus('plan_no_reconocido')).toBe(403)
  })
})
