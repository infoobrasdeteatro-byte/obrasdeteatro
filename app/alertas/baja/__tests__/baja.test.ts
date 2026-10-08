import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crearTokenBaja } from '@/lib/alertas/alertas'

const db = { updates: [] as { cambios: Record<string, unknown>; id: unknown }[] }

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      update: (cambios: Record<string, unknown>) => ({
        eq: (_c: string, id: unknown) => { db.updates.push({ cambios, id }); return Promise.resolve({ error: null }) },
      }),
    }),
  }),
}))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) } }))
vi.mock('@/components/design-system/TopNav', () => ({ default: () => null }))

import { POST } from '@/app/api/alertas/baja/route'
import BajaAlertasPage from '../page'
import { confirmarBaja } from '../actions'

const ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'
const post = (t: string) =>
  POST(new Request(`http://localhost/api/alertas/baja?t=${encodeURIComponent(t)}`, { method: 'POST' }) as unknown as Parameters<typeof POST>[0])

beforeEach(() => {
  process.env.ALERTAS_CONVOCATORIAS_SECRET = 'secreto-alertas'
  db.updates = []
})

describe('baja por token, sin sesión', () => {
  it('POST de un clic con token válido: desactiva la alerta de ese usuario', async () => {
    const res = await post(crearTokenBaja(ID)!)
    expect(res.status).toBe(200)
    expect(db.updates).toEqual([{ cambios: { activa: false }, id: ID }])
  })

  it('token manipulado: 400 y nada cambia', async () => {
    const res = await post(`${crearTokenBaja(ID)!}x`)
    expect(res.status).toBe(400)
    expect(db.updates).toHaveLength(0)
  })

  it('la página (GET) no da de baja al abrirse', async () => {
    await BajaAlertasPage({ searchParams: Promise.resolve({ t: crearTokenBaja(ID)! }) })
    expect(db.updates).toHaveLength(0)
  })

  it('el botón de la página sí: desactiva y redirige con el resultado', async () => {
    const fd = new FormData()
    fd.set('t', crearTokenBaja(ID)!)
    await expect(confirmarBaja(fd)).rejects.toThrow('REDIRECT:/alertas/baja?resultado=hecha')
    expect(db.updates).toEqual([{ cambios: { activa: false }, id: ID }])
  })
})
