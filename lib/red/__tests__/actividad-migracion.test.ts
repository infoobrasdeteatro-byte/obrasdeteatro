import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Migración de «Última actividad» (20261024100000_red_fase2_actividad) en
 * PGlite: la fecha exacta no se puede leer, solo el tramo; se respeta
 * mostrar_actividad y el titular siempre ve la suya.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const PREVIO = `
  alter table public.profiles
    add column perfil_publico boolean not null default true, add column verificado boolean not null default true,
    add column activo boolean not null default true, add column deleted_at timestamptz,
    add column extincion_solicitada_at timestamptz;
`

const tramo = async (uid: string | null, perfil: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select actividad_de('${perfil}') as t`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.t ?? null
}

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261024100000_red_fase2_actividad.sql'], PREVIO))
})

describe('última actividad', () => {
  it('sin registro: null', async () => {
    expect(await tramo(null, U1)).toBeNull()
  })

  it('registrar_actividad anota a quien llama; anónimo no puede', async () => {
    expect((await como('authenticated', U1, `select registrar_actividad()`)).error).toBeNull()
    expect(await tramo(null, U1)).toBe('hoy')
    expect((await como('anon', null, `select registrar_actividad()`)).error).toMatch(/permission denied/)
  })

  it('la fecha exacta no se puede leer ni escribir directamente', async () => {
    expect((await como('anon', null, `select * from perfil_actividad`)).error).toMatch(/permission denied/)
    expect((await como('authenticated', U1, `select * from perfil_actividad`)).error).toMatch(/permission denied/)
    expect((await como('authenticated', U1, `update perfil_actividad set ultima_at = now()`)).error).toMatch(/permission denied/)
  })

  it('tramos: semana, mes y antes', async () => {
    await db.exec(`update perfil_actividad set ultima_at = now() - interval '3 days' where profile_id = '${U1}'`)
    expect(await tramo(null, U1)).toBe('semana')
    await db.exec(`update perfil_actividad set ultima_at = now() - interval '20 days' where profile_id = '${U1}'`)
    expect(await tramo(null, U1)).toBe('mes')
    await db.exec(`update perfil_actividad set ultima_at = now() - interval '90 days' where profile_id = '${U1}'`)
    expect(await tramo(null, U1)).toBe('antes')
  })

  it('como mucho una vez por hora', async () => {
    await db.exec(`update perfil_actividad set ultima_at = now() - interval '30 minutes' where profile_id = '${U1}'`)
    await como('authenticated', U1, `select registrar_actividad()`)
    const r = await db.query<{ min: number }>(`select extract(epoch from now() - ultima_at) / 60 as min from perfil_actividad where profile_id = '${U1}'`)
    expect(Number(r.rows[0].min)).toBeGreaterThan(29)
  })

  it('oculta: los demás no la ven; el titular sí', async () => {
    await db.exec(`update profiles set mostrar_actividad = false where id = '${U1}'`)
    expect(await tramo(null, U1)).toBeNull()
    expect(await tramo(U2, U1)).toBeNull()
    expect(await tramo(U1, U1)).toBe('hoy')
  })

  it('perfil no público: nadie más la ve', async () => {
    await db.exec(`update profiles set mostrar_actividad = true, perfil_publico = false where id = '${U1}'`)
    expect(await tramo(U2, U1)).toBeNull()
  })
})
