import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Mensajería (20261024110000_red_fase3_mensajes) en PGlite, sobre la de
 * conexiones: contactos gratis, plan de pago para el resto, «solo contactos»,
 * respuesta libre en conversación abierta, lectura solo de las partes y
 * antispam.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const PAGO = '00000000-0000-0000-0000-000000000003'
const CERRADO = '00000000-0000-0000-0000-000000000004'
const OTRO = '00000000-0000-0000-0000-000000000005'

const PREVIO = `
  alter table public.profiles
    add column apellidos text, add column nombre_artistico text, add column slug text, add column avatar_url text,
    add column plan text not null default 'gratuito',
    add column perfil_publico boolean not null default true, add column verificado boolean not null default true,
    add column activo boolean not null default true, add column deleted_at timestamptz,
    add column extincion_solicitada_at timestamptz, add column identidad_extinguida_at timestamptz;
  create function public.perfil_contactable(p_perfil uuid) returns boolean language sql stable security definer set search_path = 'public' as
    $$ select exists (select 1 from public.profiles where id = p_perfil and perfil_publico and verificado and activo
         and deleted_at is null and extincion_solicitada_at is null) $$;
  create table public.profile_follows (
    id uuid primary key default gen_random_uuid(), follower_id uuid not null, following_id uuid not null,
    created_at timestamptz not null default now());
`

const valor = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select ${sql} as v`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.v
}
const enviar = async (uid: string, perfil: string, texto: string) => {
  const r = await como('authenticated', uid, `select * from enviar_mensaje('${perfil}', '${texto}')`)
  if (r.error) throw new Error(r.error)
  return r.filas[0] as { conversacion: string | null; resultado: string }
}

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(
    ['20261024090000_red_fase2_conexiones.sql', '20261024110000_red_fase3_mensajes.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre, plan) values ('${PAGO}', 'pago', 'premium');
    insert into profiles (id, nombre, mensajes_solo_contactos) values ('${CERRADO}', 'cerrado', true);
    insert into profiles (id, nombre) values ('${OTRO}', 'otro');
  `)
})

describe('puede_escribir', () => {
  it('anónimo, propio y sin plan', async () => {
    expect(await valor(null, `puede_escribir('${U1}')`)).toBe('anonimo')
    expect(await valor(U1, `puede_escribir('${U1}')`)).toBe('propio')
    expect(await valor(U1, `puede_escribir('${U2}')`)).toBe('plan')
  })
  it('con plan de pago, sí; salvo a quien solo recibe de sus contactos', async () => {
    expect(await valor(PAGO, `puede_escribir('${U1}')`)).toBe('si')
    expect(await valor(PAGO, `puede_escribir('${CERRADO}')`)).toBe('solo_contactos')
  })
  it('entre contactos conectados, gratis (también con «solo contactos»)', async () => {
    await como('authenticated', U1, `select solicitar_conexion('${CERRADO}')`)
    await como('authenticated', CERRADO, `select solicitar_conexion('${U1}')`)
    expect(await valor(U1, `puede_escribir('${CERRADO}')`)).toBe('si')
  })
})

describe('enviar_mensaje y lectura', () => {
  it('sin plan no se abre conversación con quien no es contacto', async () => {
    expect((await enviar(U1, U2, 'Hola')).resultado).toBe('plan')
  })

  it('con plan se abre; quien recibe responde aunque sea gratuito', async () => {
    const a = await enviar(PAGO, U1, 'Te escribo por un proyecto')
    expect(a.resultado).toBe('nueva')
    expect(await valor(U1, `puede_escribir('${PAGO}')`)).toBe('si')
    const b = await enviar(U1, PAGO, 'Encantado')
    expect(b).toEqual({ conversacion: a.conversacion, resultado: 'ok' })
  })

  it('bandeja, no leídos y marcar como leída', async () => {
    const r = await como('authenticated', U1, `select otro_nombre, ultimo_texto, ultimo_mio, sin_leer from mis_conversaciones() where otro_id = '${PAGO}'`)
    expect(r.filas).toEqual([{ otro_nombre: 'pago', ultimo_texto: 'Encantado', ultimo_mio: true, sin_leer: 1 }])
    expect(await valor(U1, `mensajes_sin_leer()`)).toBe(1)
    const { filas: [c] } = await como('authenticated', U1, `select id from mis_conversaciones() where otro_id = '${PAGO}'`)
    expect(await valor(U1, `marcar_conversacion_leida('${c.id}')`)).toBe(1)
    expect(await valor(U1, `mensajes_sin_leer()`)).toBe(0)
    const m = await como('authenticated', U1, `select mio, texto from mensajes_de('${c.id}')`)
    expect(m.filas).toEqual([{ mio: false, texto: 'Te escribo por un proyecto' }, { mio: true, texto: 'Encantado' }])
  })

  it('un tercero no ve la conversación ni sus mensajes', async () => {
    const { filas: [c] } = await como('authenticated', U1, `select id from mis_conversaciones() where otro_id = '${PAGO}'`)
    expect((await como('authenticated', OTRO, `select * from mensajes_de('${c.id}')`)).filas).toHaveLength(0)
    expect((await como('authenticated', OTRO, `select * from mensajes`)).filas).toHaveLength(0)
    expect((await como('authenticated', OTRO, `select * from conversaciones`)).filas).toHaveLength(0)
    expect(await valor(OTRO, `marcar_conversacion_leida('${c.id}')`)).toBe(0)
  })

  it('las tablas no se escriben directamente; anónimo no lee', async () => {
    const r = await como('authenticated', U1, `insert into conversaciones (perfil_a, perfil_b, iniciada_por) values ('${U1}', '${OTRO}', '${U1}')`)
    expect(r.error).toMatch(/permission denied/)
    expect((await como('anon', null, `select * from mensajes`)).error).toMatch(/permission denied/)
  })

  it('mensaje vacío no se envía', async () => {
    expect((await enviar(PAGO, U1, '   ')).resultado).toBe('vacio')
  })

  it('antispam: 10 conversaciones nuevas al día con quien no es contacto', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, '0')}`)
    await db.exec(`insert into profiles (id, nombre) values ${ids.map(id => `('${id}', 'x')`).join(',')}`)
    const resultados = []
    for (const id of ids) resultados.push((await enviar(PAGO, id, 'Hola')).resultado)
    // Ya tenía 1 abierta hoy (con U1): 9 nuevas más y la siguiente se bloquea.
    expect(resultados.filter(r => r === 'nueva')).toHaveLength(9)
    expect(resultados.at(-1)).toBe('limite')
  })
})
