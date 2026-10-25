import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Embajadores de Escena (20261025120000_embajadores_de_escena) en PGlite:
 * invitación de un solo uso, plan sin bajar nunca, referidos solo para
 * cuentas nuevas, renuncia, caducidad y distintivo público.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const NUEVO = '00000000-0000-0000-0000-000000000003'
const PAGA = '00000000-0000-0000-0000-000000000004'
const VIEJO = '00000000-0000-0000-0000-000000000005'

const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column is_premium boolean not null default false,
    add column created_at timestamptz not null default now(),
    add column updated_at timestamptz not null default now();
  create table public.subscriptions (profile_id uuid unique, plan text not null, status text not null);
  create role service_role nologin;
  grant usage on schema public to service_role;
`

const v = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select ${sql} as v`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.v ?? null
}
const plan = async (id: string) => (await db.query<{ plan: string }>(`select plan::text from profiles where id = '${id}'`)).rows[0].plan
const invitar = async (nombre = 'Ana', genero = 'f') =>
  (await db.query<{ token: string }>(`insert into embajadores_invitaciones (nombre, genero, oficio) values ('${nombre}', '${genero}', 'dramaturgia') returning token`)).rows[0].token

let tokenU1: string

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261025120000_embajadores_de_escena.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre, created_at) values ('${NUEVO}', 'nuevo', now());
    insert into profiles (id, nombre, plan, is_premium) values ('${PAGA}', 'paga', 'empresas', true);
    insert into subscriptions values ('${PAGA}', 'empresas', 'active');
    insert into profiles (id, nombre, created_at) values ('${VIEJO}', 'viejo', now() - interval '60 days');
    update profiles set created_at = now() - interval '90 days' where id in ('${U1}', '${U2}');
  `)
  tokenU1 = await invitar()
})

describe('invitación', () => {
  it('la página pública ve nombre y estado; un token falso, nada', async () => {
    const r = await como('anon', null, `select * from invitacion_publica('${tokenU1}')`)
    expect(r.filas[0]).toMatchObject({ nombre: 'Ana', genero: 'f', oficio: 'dramaturgia', estado: 'pendiente' })
    expect((await como('anon', null, `select * from invitacion_publica('falso')`)).filas).toHaveLength(0)
  })

  it('al aceptar: Destacado 12 meses y código personal', async () => {
    expect(await v(U1, `aceptar_invitacion_embajador('${tokenU1}')`)).toBe('ok')
    expect(await plan(U1)).toBe('destacado')
    const r = await como('authenticated', U1, `select tipo, plan, activa, codigo_referido from mi_cortesia()`)
    expect(r.filas[0]).toMatchObject({ tipo: 'embajador', plan: 'destacado', activa: true })
    expect(String(r.filas[0].codigo_referido)).toMatch(/^[0-9A-Z]{8}$/)
  })

  it('un solo uso: otra persona no puede usar el mismo enlace', async () => {
    expect(await v(U2, `aceptar_invitacion_embajador('${tokenU1}')`)).toBe('usada')
    expect(await v(U1, `aceptar_invitacion_embajador('${tokenU1}')`)).toBe('ok')
  })

  it('anulada o caducada no se acepta', async () => {
    const t1 = await invitar('B', 'm')
    await db.exec(`update embajadores_invitaciones set estado = 'anulada' where token = '${t1}'`)
    expect(await v(U2, `aceptar_invitacion_embajador('${t1}')`)).toBe('no_valida')
    const t2 = await invitar('C', 'm')
    await db.exec(`update embajadores_invitaciones set caduca_at = now() - interval '1 day' where token = '${t2}'`)
    expect(await v(U2, `aceptar_invitacion_embajador('${t2}')`)).toBe('caducada')
  })

  it('nunca baja el plan de quien ya paga uno superior', async () => {
    expect(await v(PAGA, `aceptar_invitacion_embajador('${await invitar('D')}')`)).toBe('ok')
    expect(await plan(PAGA)).toBe('empresas')
  })

  it('las invitaciones no se leen desde fuera', async () => {
    expect((await como('authenticated', U1, `select * from embajadores_invitaciones`)).error).toMatch(/permission denied/)
  })
})

describe('referidos', () => {
  const codigoU1 = async () =>
    (await db.query<{ c: string }>(`select codigo_referido as c from membresias_cortesia where profile_id = '${U1}'`)).rows[0].c

  it('una cuenta nueva recibe 1 mes de Premium', async () => {
    expect(await v(NUEVO, `canjear_referido('${(await codigoU1()).toLowerCase()}')`)).toBe('ok')
    expect(await plan(NUEVO)).toBe('premium')
    const r = await como('authenticated', U1, `select referidos from mi_cortesia()`)
    expect(r.filas[0].referidos).toBe(1)
  })

  it('una vez por persona, no para cuentas antiguas ni para uno mismo', async () => {
    expect(await v(NUEVO, `canjear_referido('${await codigoU1()}')`)).toBe('no_aplica')
    expect(await v(VIEJO, `canjear_referido('${await codigoU1()}')`)).toBe('no_aplica')
    expect(await v(U1, `canjear_referido('${await codigoU1()}')`)).toBe('no_valido')
    expect(await v(VIEJO, `canjear_referido('NOEXISTE')`)).toBe('no_valido')
  })
})

describe('fin de la cortesía', () => {
  it('distintivo público solo para embajadores activos', async () => {
    const r = await como('anon', null, `select profile_id, genero from embajadores_activos(array['${U1}', '${NUEVO}']::uuid[])`)
    expect(r.filas).toEqual([{ profile_id: U1, genero: 'f' }])
  })

  it('al vencer, el plan vuelve a «gratuito» (o al de pago si lo tiene)', async () => {
    await db.exec(`update membresias_cortesia set hasta = now() - interval '1 minute' where profile_id in ('${NUEVO}', '${PAGA}')`)
    await db.exec(`set role service_role`)
    const n = (await db.query<{ n: number }>(`select expirar_cortesias() as n`)).rows[0].n
    await db.exec(`reset role`)
    expect(n).toBe(2)
    expect(await plan(NUEVO)).toBe('gratuito')
    expect(await plan(PAGA)).toBe('empresas')
  })

  it('renunciar: termina hoy, quita el distintivo y baja el plan', async () => {
    expect(await v(U1, `renunciar_cortesia()`)).toBe(true)
    expect(await plan(U1)).toBe('gratuito')
    expect((await como('anon', null, `select * from embajadores_activos(array['${U1}']::uuid[])`)).filas).toHaveLength(0)
    expect(await v(U1, `renunciar_cortesia()`)).toBe(false)
  })

  it('expirar_cortesias solo la ejecuta el servidor', async () => {
    expect((await como('authenticated', U1, `select expirar_cortesias()`)).error).toMatch(/permission denied/)
  })
})
