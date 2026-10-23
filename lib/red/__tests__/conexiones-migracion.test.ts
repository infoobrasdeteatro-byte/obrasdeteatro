import { describe, it, expect, beforeAll } from 'vitest'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * La migración de la Fase 2 de la red (20261024090000_red_fase2_conexiones)
 * ejecutada en PGlite: solicitud, aceptación cruzada, rechazo invisible para
 * quien pidió, permisos de la tabla y listados de Mi red.
 */

let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const U3 = '00000000-0000-0000-0000-000000000003'
const OCULTO = '00000000-0000-0000-0000-000000000004'

const PREVIO = `
  alter table public.profiles
    add column apellidos text, add column nombre_artistico text, add column slug text, add column avatar_url text,
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

const rpc1 = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select ${sql} as v`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.v
}
const estado = async (uid: string | null, perfil: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select * from estado_conexion('${perfil}')`)
  if (r.error) throw new Error(r.error)
  return r.filas[0] as { estado: string; solicitud: string | null }
}

beforeAll(async () => {
  let db
  ({ db, como } = await baseConMigraciones(['20261024090000_red_fase2_conexiones.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre) values ('${U3}', 'u3');
    insert into profiles (id, nombre, perfil_publico) values ('${OCULTO}', 'oculto', false);
    insert into profile_follows (follower_id, following_id) values ('${U2}', '${U1}'), ('${U1}', '${U3}');
  `)
})

describe('conexiones', () => {
  it('anónimo y propio', async () => {
    expect((await estado(null, U1)).estado).toBe('anonimo')
    expect((await estado(U1, U1)).estado).toBe('propio')
  })

  it('solicitar: nueva, existente, y la otra parte la ve como recibida', async () => {
    expect(await rpc1(U1, `solicitar_conexion('${U2}', '  Hola  ')`)).toBe('nueva')
    expect(await rpc1(U1, `solicitar_conexion('${U2}')`)).toBe('existente')
    expect((await estado(U1, U2)).estado).toBe('enviada')
    const r = await estado(U2, U1)
    expect(r.estado).toBe('recibida')
    expect(r.solicitud).toBeTruthy()
  })

  it('si la otra parte también pulsa «Conectar», queda aceptada', async () => {
    expect(await rpc1(U2, `solicitar_conexion('${U1}')`)).toBe('aceptada')
    expect((await estado(U1, U2)).estado).toBe('conectados')
    expect((await estado(U2, U1)).estado).toBe('conectados')
  })

  it('eliminar la conexión la deshace para los dos', async () => {
    expect(await rpc1(U2, `eliminar_conexion('${U1}')`)).toBe(true)
    expect((await estado(U1, U2)).estado).toBe('ninguna')
  })

  it('un rechazo no se le muestra a quien pidió', async () => {
    expect(await rpc1(U3, `solicitar_conexion('${U1}', 'Proyecto')`)).toBe('nueva')
    const { solicitud } = await estado(U1, U3)
    expect(await rpc1(U1, `responder_conexion('${solicitud}', false)`)).toBe(true)
    expect((await estado(U3, U1)).estado).toBe('enviada')
    expect((await como('authenticated', U3, `select * from conexiones`)).filas).toHaveLength(0)
    const r = await como('authenticated', U3, `select direccion, estado from mis_conexiones()`)
    expect(r.filas).toEqual([{ direccion: 'enviada', estado: 'pendiente' }])
    // Quien rechazó ya no la ve en su lista, y puede conectar si cambia de opinión.
    expect((await como('authenticated', U1, `select * from mis_conexiones()`)).filas).toHaveLength(0)
    expect(await rpc1(U1, `solicitar_conexion('${U3}')`)).toBe('aceptada')
  })

  it('no se puede conectar con un perfil no público ni con uno mismo', async () => {
    expect(await rpc1(U1, `solicitar_conexion('${OCULTO}')`)).toBe('no_disponible')
    expect(await rpc1(U1, `solicitar_conexion('${U1}')`)).toBe('no_disponible')
    expect(await rpc1(null, `solicitar_conexion('${U2}')`).catch(e => String(e))).toMatch(/permission denied/)
  })

  it('la tabla no se puede escribir directamente', async () => {
    const r = await como('authenticated', U1, `insert into conexiones (solicitante, destinatario, estado) values ('${U1}', '${OCULTO}', 'aceptada')`)
    expect(r.error).toMatch(/permission denied/)
    expect((await como('anon', null, `select * from conexiones`)).error).toMatch(/permission denied/)
  })

  it('solo se responde a solicitudes propias y pendientes', async () => {
    expect(await rpc1(U2, `solicitar_conexion('${U3}')`)).toBe('nueva')
    const { solicitud } = await estado(U3, U2)
    expect(await rpc1(U1, `responder_conexion('${solicitud}', true)`)).toBe(false)
    expect(await rpc1(U3, `responder_conexion('${solicitud}', true)`)).toBe(true)
    expect(await rpc1(U3, `responder_conexion('${solicitud}', false)`)).toBe(false)
  })
})

describe('mis_seguimientos', () => {
  it('seguidores y seguidos del titular, con nombre', async () => {
    const r = await como('authenticated', U1, `select direccion, otro_nombre from mis_seguimientos() order by direccion`)
    expect(r.filas).toEqual([
      { direccion: 'seguidor', otro_nombre: 'u2' },
      { direccion: 'siguiendo', otro_nombre: 'u3' },
    ])
    expect((await como('anon', null, `select * from mis_seguimientos()`)).error).toMatch(/permission denied/)
  })
})
