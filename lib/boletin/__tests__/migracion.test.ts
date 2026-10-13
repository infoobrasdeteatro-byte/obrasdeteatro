import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, type Resultado } from '@/lib/espacios/__tests__/pglite'

/** La migración 20261013170000_boletin ejecutada en PGlite. */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([]))
  await db.exec(readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261013170000_boletin.sql'), 'utf8'))
  await db.exec(`insert into boletin_suscriptores (email, estado) values ('ana@ejemplo.es', 'confirmado')`)
}, 60_000)

describe('boletín', () => {
  it('nace con una sola fila de configuración, desactivado y para todos', async () => {
    const r = await como('anon', null, `select nombre, activo, acceso, dia_envio from boletin_config`)
    expect(r.filas).toEqual([{ nombre: 'La Semana Escénica', activo: false, acceso: 'todos', dia_envio: 4 }])
    await expect(db.exec(`insert into boletin_config (id) values (false)`)).rejects.toThrow(/una_fila/)
  })

  it('solo moderación cambia la configuración', async () => {
    const u = await como('authenticated', U1, `update boletin_config set acceso = 'pago' returning acceso`)
    expect(u.filas).toHaveLength(0)
    const m = await como('authenticated', MOD, `update boletin_config set acceso = 'pago', activo = true returning acceso, activo`)
    expect(m.filas[0]).toEqual({ acceso: 'pago', activo: true })
    const malo = await como('authenticated', MOD, `update boletin_config set acceso = 'vip'`)
    expect(malo.error).toMatch(/acceso_check/)
  })

  it('nadie lee ni escribe suscriptores salvo moderación (que solo lee)', async () => {
    expect((await como('anon', null, `select email from boletin_suscriptores`)).error).toMatch(/permission/)
    expect((await como('authenticated', U1, `select email from boletin_suscriptores`)).filas).toHaveLength(0)
    expect((await como('authenticated', MOD, `select email from boletin_suscriptores`)).filas).toHaveLength(1)
    expect((await como('anon', null, `insert into boletin_suscriptores (email) values ('x@y.es')`)).error).toMatch(/permission/)
    expect((await como('authenticated', MOD, `delete from boletin_suscriptores`)).error).toMatch(/permission/)
  })

  it('el correo se guarda en minúsculas y una sola vez', async () => {
    await expect(db.exec(`insert into boletin_suscriptores (email) values ('Ana@Ejemplo.es')`)).rejects.toThrow(/email_formato/)
    await expect(db.exec(`insert into boletin_suscriptores (email) values ('ana@ejemplo.es')`)).rejects.toThrow(/email_unico/)
  })
})
