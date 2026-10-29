import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Correo entrante (20261029120000_correos_entrantes) en PGlite: solo admin
 * lee y actualiza; moderator, cuentas normales y anon no ven nada; nadie con
 * sesión inserta ni borra; solo se cambian estado, categoría y nota; el
 * trigger pone quién y cuándo lo atendió.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const ADMIN = '00000000-0000-0000-0000-0000000000ad'

const PREVIO = `
  -- Como en Supabase: service_role se salta la RLS.
  create role service_role nologin bypassrls;
  grant usage on schema public to service_role;
`

const insertar = (id: string) => db.exec(`
  insert into correos_entrantes (resend_email_id, buzon, direccion_destino, remitente_email, asunto, categoria)
  values ('${id}', 'hola', 'legal@obrasdeteatro.com', 'ana@x.com', 'Consulta', 'persona')`)

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261029120000_correos_entrantes.sql'], PREVIO))
  await db.exec(`
    insert into profiles values ('${ADMIN}', 'admin');
    insert into profile_roles values ('${ADMIN}', 'admin');
  `)
  await insertar('e1')
  await insertar('e2')
})

describe('RLS de correos_entrantes', () => {
  it('admin lee todo', async () => {
    const r = await como('authenticated', ADMIN, 'select resend_email_id from correos_entrantes order by 1')
    expect(r.error).toBeNull()
    expect(r.filas.map(f => f.resend_email_id)).toEqual(['e1', 'e2'])
  })

  it('moderator, una cuenta normal y anon no ven nada', async () => {
    for (const [rol, uid] of [['authenticated', MOD], ['authenticated', U1], ['anon', null]] as const) {
      const r = await como(rol, uid, 'select * from correos_entrantes')
      expect(r.filas).toHaveLength(0)
    }
  })

  it('nadie con sesión inserta ni borra, ni siquiera admin', async () => {
    const ins = await como('authenticated', ADMIN, `insert into correos_entrantes (resend_email_id, buzon, categoria) values ('x', 'hola', 'persona')`)
    expect(ins.error).toMatch(/permission denied/)
    const del = await como('authenticated', ADMIN, `delete from correos_entrantes where resend_email_id = 'e2'`)
    expect(del.error).toMatch(/permission denied/)
    expect((await db.query('select count(*)::int as n from correos_entrantes')).rows[0]).toEqual({ n: 2 })
  })

  it('admin cambia estado, categoría y nota; no el contenido', async () => {
    const ok = await como('authenticated', ADMIN, `update correos_entrantes set estado = 'leido', categoria = 'servicio', nota_interna = 'ok' where resend_email_id = 'e1' returning estado, categoria, nota_interna`)
    expect(ok.filas[0]).toEqual({ estado: 'leido', categoria: 'servicio', nota_interna: 'ok' })
    const mal = await como('authenticated', ADMIN, `update correos_entrantes set asunto = 'cambiado' where resend_email_id = 'e1'`)
    expect(mal.error).toMatch(/permission denied/)
  })

  it('moderator no puede actualizar (0 filas)', async () => {
    const r = await como('authenticated', MOD, `update correos_entrantes set estado = 'archivado' where resend_email_id = 'e2' returning id`)
    expect(r.filas).toHaveLength(0)
    expect((await db.query(`select estado from correos_entrantes where resend_email_id = 'e2'`)).rows[0]).toEqual({ estado: 'nuevo' })
  })

  it('el trigger pone quién y cuándo lo atendió, y lo quita al reabrir', async () => {
    await como('authenticated', ADMIN, `update correos_entrantes set estado = 'atendido' where resend_email_id = 'e2'`)
    let f = (await db.query<{ atendido_por: string; atendido_at: string | null }>(`select atendido_por, atendido_at from correos_entrantes where resend_email_id = 'e2'`)).rows[0]
    expect(f.atendido_por).toBe(ADMIN)
    expect(f.atendido_at).not.toBeNull()
    await como('authenticated', ADMIN, `update correos_entrantes set estado = 'nuevo' where resend_email_id = 'e2'`)
    f = (await db.query<{ atendido_por: string; atendido_at: string | null }>(`select atendido_por, atendido_at from correos_entrantes where resend_email_id = 'e2'`)).rows[0]
    expect(f).toEqual({ atendido_por: null, atendido_at: null })
  })

  it('CHECK de estado y UNIQUE de resend_email_id', async () => {
    const r = await como('authenticated', ADMIN, `update correos_entrantes set estado = 'borrado' where resend_email_id = 'e1'`)
    expect(r.error).toMatch(/check constraint/)
    await expect(insertar('e1')).rejects.toThrow(/duplicate key/)
  })

  it('service_role inserta y borra', async () => {
    await db.exec(`set role service_role; insert into correos_entrantes (resend_email_id, buzon, categoria) values ('srv', 'gmail', 'servicio'); delete from correos_entrantes where resend_email_id = 'srv'; reset role;`)
    expect((await db.query(`select count(*)::int as n from correos_entrantes where resend_email_id = 'srv'`)).rows[0]).toEqual({ n: 0 })
  })
})
