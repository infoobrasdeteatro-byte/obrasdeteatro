import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Fase 3 (B): bloqueos y avisos por correo
 * (20261024120000_red_fase3_avisos_bloqueos) sobre conexiones y mensajes.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

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
  return r.filas[0]?.v ?? null
}
const enviar = async (uid: string, perfil: string, texto: string) => {
  const r = await como('authenticated', uid, `select * from enviar_mensaje('${perfil}', '${texto}')`)
  if (r.error) throw new Error(r.error)
  return r.filas[0] as { conversacion: string | null; resultado: string }
}

let conv: string

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([
    '20261024090000_red_fase2_conexiones.sql',
    '20261024110000_red_fase3_mensajes.sql',
    '20261024120000_red_fase3_avisos_bloqueos.sql',
  ], PREVIO))
  // U1 y U2 conectados: mensajes gratis.
  await como('authenticated', U1, `select solicitar_conexion('${U2}')`)
  await como('authenticated', U2, `select solicitar_conexion('${U1}')`)
  conv = (await enviar(U1, U2, 'Hola')).conversacion!
})

describe('avisos por correo', () => {
  it('el primer mensaje avisa; el siguiente en menos de 6 h, no', async () => {
    expect(await valor(U1, `reclamar_aviso_mensaje('${conv}')`)).toBe(U2)
    expect(await valor(U1, `reclamar_aviso_mensaje('${conv}')`)).toBeNull()
  })
  it('pasadas 6 h vuelve a avisar', async () => {
    await db.exec(`update conversaciones set aviso_a_at = now() - interval '7 hours', aviso_b_at = now() - interval '7 hours'`)
    expect(await valor(U1, `reclamar_aviso_mensaje('${conv}')`)).toBe(U2)
  })
  it('sin avisos activados, no avisa', async () => {
    await db.exec(`update conversaciones set aviso_a_at = null, aviso_b_at = null; update profiles set avisos_mensajes_email = false where id = '${U2}'`)
    expect(await valor(U1, `reclamar_aviso_mensaje('${conv}')`)).toBeNull()
    await db.exec(`update profiles set avisos_mensajes_email = true where id = '${U2}'`)
  })
  it('un tercero no puede reclamar avisos de una conversación ajena', async () => {
    expect(await valor('00000000-0000-0000-0000-00000000000a', `reclamar_aviso_mensaje('${conv}')`)).toBeNull()
  })
})

describe('bloqueos', () => {
  it('al bloquear, quien bloquea ve «bloqueado» y la otra parte «no_disponible»', async () => {
    expect(await valor(U2, `bloquear('${U1}')`)).toBe(true)
    expect(await valor(U2, `puede_escribir('${U1}')`)).toBe('bloqueado')
    expect(await valor(U1, `puede_escribir('${U2}')`)).toBe('no_disponible')
  })
  it('la persona bloqueada no puede enviar, aunque haya conversación y conexión', async () => {
    expect((await enviar(U1, U2, 'Sigo aquí')).resultado).toBe('no_disponible')
  })
  it('solo quien bloquea ve su bloqueo; nadie escribe la tabla directamente', async () => {
    expect((await como('authenticated', U1, `select * from bloqueos`)).filas).toHaveLength(0)
    expect((await como('authenticated', U2, `select * from bloqueos`)).filas).toHaveLength(1)
    expect((await como('authenticated', U1, `delete from bloqueos`)).error).toMatch(/permission denied/)
  })
  it('la bandeja marca la conversación como bloqueada para quien bloqueó', async () => {
    const r = await como('authenticated', U2, `select bloqueado from mis_conversaciones()`)
    expect(r.filas).toEqual([{ bloqueado: true }])
    const r1 = await como('authenticated', U1, `select bloqueado from mis_conversaciones()`)
    expect(r1.filas).toEqual([{ bloqueado: false }])
  })
  it('al desbloquear se vuelve a poder escribir', async () => {
    expect(await valor(U2, `desbloquear('${U1}')`)).toBe(true)
    expect((await enviar(U1, U2, 'Hola de nuevo')).resultado).toBe('ok')
  })
  it('no se puede bloquear a uno mismo', async () => {
    expect(await valor(U1, `bloquear('${U1}')`)).toBeNull()
  })
})
