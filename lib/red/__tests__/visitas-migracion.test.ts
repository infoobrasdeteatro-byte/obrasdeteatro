import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * PP2-E.3B (20261024140000_pp2_e3b_visitas) en PGlite: una visita por huella
 * y día, apariciones, solo el servidor registra y cada titular ve lo suyo.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const PREVIO = `
  create role service_role nologin;
  grant usage on schema public to service_role;
`
const H1 = 'a'.repeat(32)
const H2 = 'b'.repeat(32)

async function comoServidor(sql: string) {
  await db.exec('set role service_role')
  try { return (await db.query<Record<string, unknown>>(sql)).rows } finally { await db.exec('reset role') }
}
const stats = async (uid: string) => {
  const r = await como('authenticated', uid, `select * from mis_estadisticas_perfil()`)
  if (r.error) throw new Error(r.error)
  return r.filas[0] as { visitas_30: number; visitas_prev: number; apariciones_30: number; apariciones_prev: number }
}

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261024140000_pp2_e3b_visitas.sql'], PREVIO))
})

describe('visitas', () => {
  it('una visita por huella y día', async () => {
    expect((await comoServidor(`select registrar_visita('${U1}', '${H1}') as v`))[0].v).toBe(true)
    expect((await comoServidor(`select registrar_visita('${U1}', '${H1}') as v`))[0].v).toBe(false)
    expect((await comoServidor(`select registrar_visita('${U1}', '${H2}') as v`))[0].v).toBe(true)
    expect((await stats(U1)).visitas_30).toBe(2)
  })

  it('huella demasiado corta: no cuenta', async () => {
    expect((await comoServidor(`select registrar_visita('${U1}', 'corta') as v`))[0].v).toBe(false)
  })

  it('nadie más que el servidor puede registrar', async () => {
    expect((await como('anon', null, `select registrar_visita('${U1}', '${'c'.repeat(32)}')`)).error).toMatch(/permission denied/)
    expect((await como('authenticated', U2, `select registrar_visita('${U1}', '${'c'.repeat(32)}')`)).error).toMatch(/permission denied/)
    expect((await como('authenticated', U2, `select registrar_apariciones(array['${U1}']::uuid[])`)).error).toMatch(/permission denied/)
  })

  it('las tablas no se leen directamente', async () => {
    expect((await como('authenticated', U1, `select * from perfil_visitas_dia`)).error).toMatch(/permission denied/)
    expect((await como('anon', null, `select * from perfil_visitas_huellas`)).error).toMatch(/permission denied/)
  })

  it('cada titular solo ve lo suyo', async () => {
    expect((await stats(U2)).visitas_30).toBe(0)
  })

  it('30 días frente a los 30 anteriores, y por meses', async () => {
    await db.exec(`insert into perfil_visitas_dia values ('${U1}', (now() at time zone 'utc')::date - 40, 5)`)
    const s = await stats(U1)
    expect(s.visitas_30).toBe(2)
    expect(s.visitas_prev).toBe(5)
    const m = await como('authenticated', U1, `select sum(visitas)::int as t from mis_visitas_por_mes()`)
    expect(m.filas[0].t).toBe(7)
  })
})

describe('apariciones', () => {
  it('una por perfil y listado, sin repetidos', async () => {
    expect((await comoServidor(`select registrar_apariciones(array['${U1}', '${U2}', '${U1}']::uuid[]) as n`))[0].n).toBe(2)
    await comoServidor(`select registrar_apariciones(array['${U1}']::uuid[])`)
    expect((await stats(U1)).apariciones_30).toBe(2)
    expect((await stats(U2)).apariciones_30).toBe(1)
  })
})
