import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROLES } from '../cartelera'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * 20261014230000_cartelera_limite_revision: el límite del plan también al
 * mandar a revisión y al aprobar desde la cola de moderación.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column verificado boolean not null default false;
  create table public.works (id uuid primary key);
  create table public.espacios_escenicos (id uuid primary key, nombre text, municipio text, pais_code text, estado text);
`

async function pedir(titulo: string) {
  const r = await como('authenticated', U2, `
    insert into espectaculos (user_id, titulo, compania_nombre, estado) values ('${U2}', '${titulo}', 'Cía', 'publicado')
    returning id, estado`)
  return { id: r.filas[0]?.id as string | undefined, estado: r.filas[0]?.estado as string | undefined, error: r.error }
}
const aprobar = (id: string) => como('authenticated', MOD, `update espectaculos set estado = 'publicado' where id = '${id}' returning estado`)

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261014200000_cartelera.sql', '20261014230000_cartelera_limite_revision.sql'], PREVIO))
}, 60_000)

describe('límite del plan con revisión', () => {
  it('perfil sin verificar (gratuito, 2): van a revisión y moderación aprueba hasta el límite', async () => {
    const a = await pedir('Uno')
    const b = await pedir('Dos')
    const c = await pedir('Tres')
    expect([a.estado, b.estado, c.estado]).toEqual(['pendiente_revision', 'pendiente_revision', 'pendiente_revision'])
    expect((await aprobar(a.id!)).error).toBeNull()
    expect((await aprobar(b.id!)).error).toBeNull()
    const r = await aprobar(c.id!)
    expect(r.error).toMatch(/Tu plan permite 2/)
  })

  it('con el límite lleno, ni siquiera puede mandar otro a revisión', async () => {
    const d = await pedir('Cuatro')
    expect(d.error).toMatch(/Tu plan permite 2/)
  })

  it('moderación puede restaurar uno retirado por su cuenta (no cuenta como petición)', async () => {
    const e = await db.query<{ id: string }>(`select id from espectaculos where titulo = 'Uno'`)
    const id = e.rows[0].id
    await como('authenticated', MOD, `update espectaculos set estado = 'retirado' where id = '${id}'`)
    await aprobar((await db.query<{ id: string }>(`select id from espectaculos where titulo = 'Tres'`)).rows[0].id)
    const r = await como('authenticated', MOD, `update espectaculos set estado = 'publicado' where id = '${id}' returning estado`)
    expect(r.error).toBeNull()
    expect(r.filas[0].estado).toBe('publicado')
  })
})

describe('20261015120000: más papeles en la ficha artística', () => {
  it('acepta los nuevos papeles y sigue rechazando los inventados', async () => {
    await db.exec(readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261015120000_cartelera_mas_papeles.sql'), 'utf8'))
    const id = (await db.query<{ id: string }>(`select id from espectaculos limit 1`)).rows[0].id
    for (const r of ROLES) {
      await db.exec(`insert into espectaculo_personas (espectaculo_id, nombre, rol) values ('${id}', 'Nombre', '${r.value}')`)
    }
    await expect(db.exec(`insert into espectaculo_personas (espectaculo_id, nombre, rol) values ('${id}', 'Nombre', 'inventado')`)).rejects.toThrow()
  })
})
