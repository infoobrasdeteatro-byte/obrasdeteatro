import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  user: { id: 'u1' } as { id: string } | null,
  plan: 'premium',
  existente: null as Record<string, unknown> | null,
  escrituras: [] as { op: string; fila: Record<string, unknown> }[],
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: (tabla: string) => {
      if (tabla === 'profiles') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { plan: db.plan } }) }) }) }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: db.existente, error: null }) }) }),
        insert: (fila: Record<string, unknown>) => { db.escrituras.push({ op: 'insert', fila }); return Promise.resolve({ error: null }) },
        update: (fila: Record<string, unknown>) => ({ eq: () => { db.escrituras.push({ op: 'update', fila }); return Promise.resolve({ error: null }) } }),
      }
    },
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import { guardarAlertas } from '../alertas-actions'

function formulario() {
  const fd = new FormData()
  fd.set('activa', 'on'); fd.append('paises', 'CO'); fd.append('categorias', 'residencia'); fd.set('frecuencia', 'semanal')
  return fd
}

beforeEach(() => {
  db.user = { id: 'u1' }
  db.plan = 'premium'
  db.existente = null
  db.escrituras = []
})

describe('guardarAlertas (server action, sesión del usuario)', () => {
  it('plan gratuito: no escribe nada', async () => {
    db.plan = 'gratuito'
    expect(await guardarAlertas({}, formulario())).toEqual({ error: expect.stringMatching(/plan Premium/) })
    expect(db.escrituras).toHaveLength(0)
  })

  it('primera vez: inserta su fila', async () => {
    expect(await guardarAlertas({}, formulario())).toEqual({ ok: 'Alertas guardadas.' })
    expect(db.escrituras).toEqual([{ op: 'insert', fila: { profile_id: 'u1', activa: true, paises: ['CO'], categorias: ['residencia'], frecuencia: 'semanal' } }])
  })

  it('ya existía: actualiza sin tocar profile_id ni ultimo_envio_at', async () => {
    db.existente = { profile_id: 'u1' }
    await guardarAlertas({}, formulario())
    expect(db.escrituras[0].op).toBe('update')
    expect(db.escrituras[0].fila).not.toHaveProperty('profile_id')
    expect(db.escrituras[0].fila).not.toHaveProperty('ultimo_envio_at')
  })

  it('sin sesión o con datos no válidos: no escribe', async () => {
    db.user = null
    expect((await guardarAlertas({}, formulario())).error).toBeDefined()
    db.user = { id: 'u1' }
    const fd = formulario(); fd.append('paises', 'US')
    expect((await guardarAlertas({}, fd)).error).toMatch(/país/)
    expect(db.escrituras).toHaveLength(0)
  })
})
