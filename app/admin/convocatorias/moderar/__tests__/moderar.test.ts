import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crearToken } from '@/lib/convocatorias/token-moderacion'

// ── Supabase (cliente con sesión) en memoria: registra cualquier UPDATE ─────
const estado = {
  user: { id: 'moderador-1' } as { id: string } | null,
  roles: [{ role: 'admin' }] as { role: string }[],
  call: { id: '', title: 'Convocatoria de prueba', estado: 'pendiente_revision' } as Record<string, unknown> | null,
  updates: [] as { cambios: Record<string, unknown>; filtros: [string, unknown][] }[],
  resultadoUpdate: { data: { estado: 'publicado' } as Record<string, unknown> | null, error: null as { message: string } | null },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.user } }) },
    from: (tabla: string) => {
      if (tabla === 'profile_roles') {
        return { select: () => ({ eq: () => ({ in: () => Promise.resolve({ data: estado.roles }) }) }) }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: estado.call }) }) }),
        update: (cambios: Record<string, unknown>) => {
          const registro = { cambios, filtros: [] as [string, unknown][] }
          estado.updates.push(registro)
          const cadena = {
            eq: (col: string, v: unknown) => { registro.filtros.push([col, v]); return cadena },
            select: () => ({ maybeSingle: () => Promise.resolve(estado.resultadoUpdate) }),
          }
          return cadena
        },
      }
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) },
}))

vi.mock('@/components/NavAutenticado', () => ({ default: () => null }))
vi.mock('@/components/design-system/Sidebar', () => ({ default: () => null }))

import ConfirmarModeracionPage from '../page'
import { confirmarModeracion } from '../actions'

const ID = '0b5c6d7e-1234-4abc-9def-0123456789ab'

beforeEach(() => {
  process.env.CONVOCATORIAS_MODERACION_SECRET = 'secreto-moderacion'
  estado.user = { id: 'moderador-1' }
  estado.roles = [{ role: 'admin' }]
  estado.call = { id: ID, title: 'Convocatoria de prueba', estado: 'pendiente_revision' }
  estado.updates = []
  estado.resultadoUpdate = { data: { estado: 'publicado' }, error: null }
})

const pagina = (sp: Record<string, string>) => ConfirmarModeracionPage({ searchParams: Promise.resolve(sp) })

function formulario(token: string) {
  const fd = new FormData()
  fd.set('t', token)
  return fd
}

describe('GET /admin/convocatorias/moderar — no modifica nada', () => {
  it('con token válido de aprobar o rechazar: enseña la confirmación sin UPDATE', async () => {
    await pagina({ t: crearToken(ID, 'aprobar')! })
    await pagina({ t: crearToken(ID, 'rechazar')! })
    expect(estado.updates).toHaveLength(0)
  })

  it('con token caducado o manipulado: tampoco hace nada', async () => {
    const caducado = crearToken(ID, 'aprobar', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000))!
    await pagina({ t: caducado })
    await pagina({ t: 'manipulado.firma' })
    expect(estado.updates).toHaveLength(0)
  })

  it('sin sesión: al login con vuelta a la página, sin UPDATE', async () => {
    estado.user = null
    await expect(pagina({ t: crearToken(ID, 'aprobar')! })).rejects.toThrow(/REDIRECT:\/auth\/login/)
    expect(estado.updates).toHaveLength(0)
  })
})

describe('POST (acción de confirmación)', () => {
  it('aprobar: UPDATE a publicado solo si sigue pendiente', async () => {
    await expect(confirmarModeracion(formulario(crearToken(ID, 'aprobar')!))).rejects.toThrow(/hecho=publicada/)
    expect(estado.updates).toEqual([{ cambios: { estado: 'publicado' }, filtros: [['id', ID], ['estado', 'pendiente_revision']] }])
  })

  it('rechazar: guarda el motivo del resumen semanal', async () => {
    estado.resultadoUpdate = { data: { estado: 'rechazado' }, error: null }
    await expect(confirmarModeracion(formulario(crearToken(ID, 'rechazar')!))).rejects.toThrow(/hecho=rechazada/)
    expect(estado.updates[0].cambios).toEqual({ estado: 'rechazado', motivo_rechazo: 'Rechazada desde resumen semanal' })
  })

  it('token caducado o manipulado: no hay UPDATE', async () => {
    const caducado = crearToken(ID, 'aprobar', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000))!
    await expect(confirmarModeracion(formulario(caducado))).rejects.toThrow(/error=caducado/)
    await expect(confirmarModeracion(formulario('a.b'))).rejects.toThrow(/error=/)
    expect(estado.updates).toHaveLength(0)
  })

  it('sin sesión: al login, sin UPDATE', async () => {
    estado.user = null
    await expect(confirmarModeracion(formulario(crearToken(ID, 'aprobar')!))).rejects.toThrow(/REDIRECT:\/auth\/login/)
    expect(estado.updates).toHaveLength(0)
  })

  it('si ya no estaba pendiente, lo dice y no inventa un resultado', async () => {
    estado.resultadoUpdate = { data: null, error: null }
    await expect(confirmarModeracion(formulario(crearToken(ID, 'aprobar')!))).rejects.toThrow(/hecho=sin_cambio/)
  })
})
