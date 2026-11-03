import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, type Resultado } from '@/lib/espacios/__tests__/pglite'
import { PREVIO } from './previo'

/**
 * Embajadores de Escena: tres meses para los colegas y escalera del embajador
 * (20261103120000_embajadores_recompensas) en PGlite, encima de Embajadores y
 * del Elenco Fundador tal como están en producción.
 */

const MIGRACION = '20261103120000_embajadores_recompensas.sql'
const leer = (m: string) => readFileSync(path.resolve(__dirname, '../../../supabase/migrations', m), 'utf8')

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const EMB = id(30)       // embajadora
const EMB_PAGA = id(31)  // embajador que ya paga Empresas
const EMB_RENUNCIA = id(32)
const VIEJO = id(33)     // colega con el mes antiguo, de antes de la migración

const uno = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows[0]
const plan = async (p: string) => (await uno(`select plan::text as v from profiles where id = '${p}'`)).v as string
const v = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select ${sql} as v`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.v ?? null
}
const membresia = async (p: string) =>
  (await uno(`select tipo, plan, hasta, honor_at, procesada,
     case when desde + interval '3 months' = hasta then '3 meses' when desde + interval '30 days' = hasta then '30 días' else (hasta - desde)::text end as duracion
     from membresias_cortesia where profile_id = '${p}'`)) as
    { tipo: string; plan: string; hasta: Date | string; honor_at: unknown; procesada: boolean; duracion: string } | undefined
const hasta = async (p: string) => String((await uno(`select hasta::text as v from membresias_cortesia where profile_id = '${p}'`)).v)
const puntos = async (p: string) => Number((await uno(`select embajadores_puntos('${p}') as v`)).v)
const escalones = async (p: string) =>
  (await db.query<{ escalon: number }>(`select escalon from embajadores_recompensas where embajador_id = '${p}' order by escalon`)).rows.map(r => Number(r.escalon))

async function hacerEmbajador(p: string, nombre: string, genero = 'f') {
  const token = (await uno(`insert into embajadores_invitaciones (nombre, genero, oficio) values ('${nombre}', '${genero}', 'interpretacion') returning token`)).token
  expect(await v(p, `aceptar_invitacion_embajador('${token}')`)).toBe('ok')
  return (await uno(`select codigo_referido as v from membresias_cortesia where profile_id = '${p}'`)).v as string
}

/** Cuenta nueva de tipo `tipo` que se registra con el código y lo canjea al confirmar el correo. */
let siguiente = 100
async function colega(codigo: string, tipo = 'profesional', datos = '') {
  const p = id(++siguiente)
  await db.exec(`insert into profiles (id, nombre, tipo_perfil) values ('${p}', 'colega ${siguiente}', '${tipo}')`)
  const r = await v(p, `canjear_referido('${codigo}')`)
  if (datos) await db.exec(`update profiles set ${datos} where id = '${p}'`)
  return { p, r }
}
const profesion = (p: string) => db.exec(`insert into profile_specialties (profile_id, specialty, is_primary) values ('${p}', 'interpretacion', true)`)
const personaActiva = async (codigo: string) => {
  const { p } = await colega(codigo, 'actor', "verificado = true, avatar_url = 'f.jpg'")
  await profesion(p)
  return p
}
const orgActiva = (codigo: string) => colega(codigo, 'compania', "avatar_url = 'logo.png', bio = 'x', ciudad = 'Lima'")

/** Definiciones del Elenco Fundador, para comprobar que la migración no las toca. */
const definicionesElenco = async () => (await db.query<{ n: string; d: string }>(`
  select p.proname as n, pg_get_functiondef(p.oid) as d from pg_proc p
  where p.pronamespace = 'public'::regnamespace and (p.proname like 'elenco%' or p.proname in ('profiles_suelo_elenco', 'plan_elenco_vigente', 'aceptar_invitacion_elenco', 'mi_elenco'))
  union all select 'vista', pg_get_viewdef('public.elenco_colegas'::regclass)
  union all select 'trigger:' || tgname, pg_get_triggerdef(t.oid) from pg_trigger t where not tgisinternal and tgname like '%elenco%'
  order by 1`)).rows

let elencoAntes: { n: string; d: string }[]
let codigo: string

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(
    ['20261025120000_embajadores_de_escena.sql', '20261031120000_elenco_fundador.sql', '20261031150000_elenco_colega_profesion.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre, tipo_perfil) values
      ('${EMB}', 'Embajadora', 'actor'), ('${EMB_PAGA}', 'Paga', 'actor'), ('${EMB_RENUNCIA}', 'Renuncia', 'actor'), ('${VIEJO}', 'Viejo', 'actor');
    update profiles set created_at = now() - interval '90 days' where id in ('${EMB}', '${EMB_PAGA}', '${EMB_RENUNCIA}');
  `)
  codigo = await hacerEmbajador(EMB, 'Embajadora')
  // Colega con el mes antiguo, concedido antes de esta migración.
  expect(await v(VIEJO, `canjear_referido('${codigo}')`)).toBe('ok')

  elencoAntes = await definicionesElenco()
  await db.exec(leer(MIGRACION))
})

describe('A · colegas que entran por el enlace de un embajador', () => {
  it('persona: 3 meses de Premium, sola al confirmar el correo', async () => {
    const { p, r } = await colega(codigo, 'actor')
    expect(r).toBe('ok')
    expect(await plan(p)).toBe('premium')
    const m = await membresia(p)
    expect(m).toMatchObject({ tipo: 'referido', plan: 'premium' })
    expect(String(m!.duracion)).toBe('3 meses')
  })

  it('organización (compañía, productora, sala, festival, escuela, institución): 3 meses de Empresas', async () => {
    for (const tipo of ['compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion']) {
      const { p, r } = await colega(codigo, tipo)
      expect(r).toBe('ok')
      expect(await plan(p)).toBe('empresas')
      expect(String((await membresia(p))!.duracion)).toBe('3 meses')
    }
  })

  it('público general: Premium, como una persona', async () => {
    const { p } = await colega(codigo, 'publico')
    expect(await plan(p)).toBe('premium')
  })

  it('no baja nunca un plan: quien ya paga uno superior lo conserva, y al terminar vuelve a su plan', async () => {
    const p = id(90)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil, plan, is_premium) values ('${p}', 'paga', 'actor', 'destacado', true);
      insert into subscriptions values ('${p}', 'destacado', 'active');`)
    expect(await v(p, `canjear_referido('${codigo}')`)).toBe('ok')
    expect(await plan(p)).toBe('destacado')
    await db.exec(`update membresias_cortesia set desde = desde - interval '4 months', hasta = hasta - interval '4 months' where profile_id = '${p}'`)
    await db.exec('select expirar_cortesias()')
    expect(await plan(p)).toBe('destacado')

    const { p: q } = await colega(codigo, 'actor')
    await db.exec(`update membresias_cortesia set desde = desde - interval '4 months', hasta = hasta - interval '4 months' where profile_id = '${q}'`)
    await db.exec('select expirar_cortesias()')
    expect(await plan(q)).toBe('gratuito')
  })

  it('una sola vez por cuenta; nunca a cuentas antiguas ni con el propio código', async () => {
    const { p } = await colega(codigo, 'actor')
    expect(await v(p, `canjear_referido('${codigo}')`)).toBe('no_aplica')
    expect(await v(EMB_PAGA, `canjear_referido('${codigo}')`)).toBe('no_aplica')
    expect(await v(EMB, `canjear_referido('${codigo}')`)).toBe('no_valido')
    expect(await v(p, `canjear_referido('XXXXXXXX')`)).toBe('no_valido')
  })

  it('las cortesías ya concedidas no cambian (el colega con el mes antiguo sigue con su mes)', async () => {
    expect(String((await membresia(VIEJO))!.duracion)).toBe('30 días')
    expect(await plan(VIEJO)).toBe('premium')
    // Pero cuenta para su embajadora.
    expect((await uno(`select embajador_id as v from embajadores_referidos where profile_id = '${VIEJO}'`)).v).toBe(EMB)
  })
})

describe('B · colegas activos y puntos (mismas reglas que el Elenco)', () => {
  it('persona = 1 (correo, foto y profesión); organización completa = 3; sala reclamada = 3; público general = 0', async () => {
    const e = id(40)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil, created_at) values ('${e}', 'E', 'actor', now() - interval '90 days')`)
    const c = await hacerEmbajador(e, 'E', 'm')
    expect(await puntos(e)).toBe(0)

    const { p: persona } = await colega(c, 'actor', "verificado = true, avatar_url = 'f.jpg'")
    expect(await puntos(e)).toBe(0)                 // sin profesión, todavía no
    await profesion(persona)
    expect(await puntos(e)).toBe(1)

    await colega(c, 'compania', "avatar_url = 'logo.png', bio = 'x'")
    expect(await puntos(e)).toBe(1)                 // sin ciudad, no
    await orgActiva(c)
    expect(await puntos(e)).toBe(4)

    const { p: sala } = await colega(c, 'teatro')
    expect(await puntos(e)).toBe(4)
    await db.exec(`insert into espacios_reclamaciones (profile_id, estado) values ('${sala}', 'aprobada')`)
    expect(await puntos(e)).toBe(7)

    const { p: publico } = await colega(c, 'publico', "verificado = true, avatar_url = 'f.jpg'")
    await profesion(publico)
    expect(await puntos(e)).toBe(7)

    // Una cuenta borrada deja de contar.
    await db.exec(`update profiles set deleted_at = now() where id = '${persona}'`)
    expect(await puntos(e)).toBe(6)
  })

  it('colega_estado da lo mismo que la vista del Elenco para los mismos perfiles', async () => {
    // Se atribuyen los mismos colegas a un fundador de prueba y se comparan fila a fila.
    const inv = (await uno(`select * from elenco_crear_invitacion('Comparar', 'persona', 'Interpretación', '+34 600 000 000', '', '')`)) as { id: string; token: string }
    await db.exec(`update elenco_fundadores set estado = 'aceptada', aceptada_por = '${id(40)}', aceptada_at = now() where id = '${inv.id}'`)
    await db.exec(`insert into elenco_referidos (profile_id, fundador_id)
      select profile_id, '${inv.id}' from embajadores_referidos on conflict do nothing`)
    const distintos = await db.query(`
      select e.profile_id from embajadores_colegas e join elenco_colegas c on c.profile_id = e.profile_id
      where (e.clase, e.activo, e.puntos) is distinct from (c.clase, c.activo, c.puntos)`)
    const comparados = Number((await uno(`select count(*)::int as v from embajadores_colegas e join elenco_colegas c on c.profile_id = e.profile_id`)).v)
    expect(comparados).toBeGreaterThan(10)
    expect(distintos.rows).toHaveLength(0)
    await db.exec(`delete from elenco_referidos where fundador_id = '${inv.id}'; delete from elenco_recompensas where fundador_id = '${inv.id}';
      delete from elenco_cortesias where fundador_id = '${inv.id}'; delete from elenco_fundadores where id = '${inv.id}';`)
  })
})

describe('B · escalera del embajador', () => {
  let e: string
  let c: string
  beforeAll(async () => {
    e = id(50)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil, created_at) values ('${e}', 'Escalera', 'actor', now() - interval '90 days')`)
    c = await hacerEmbajador(e, 'Escalera')
  })

  it('5 puntos: +6 meses sumados a lo que le queda, una sola vez', async () => {
    const antes = await hasta(e)
    await orgActiva(c)
    expect(await escalones(e)).toEqual([])
    await personaActiva(c); await personaActiva(c)          // 3 + 1 + 1 = 5, al momento (trigger)
    expect(await escalones(e)).toEqual([5])
    expect((await uno(`select '${antes}'::timestamptz + interval '6 months' = hasta as v from membresias_cortesia where profile_id = '${e}'`)).v).toBe(true)

    const tras5 = await hasta(e)
    expect(Number((await uno('select embajadores_revisar_todos() as v')).v)).toBe(0)
    expect(await escalones(e)).toEqual([5])
    expect(await hasta(e)).toBe(tras5)
  })

  it('10 puntos: +12 meses más', async () => {
    const antes = await hasta(e)
    await orgActiva(c); await personaActiva(c); await personaActiva(c)   // 5 + 3 + 1 + 1 = 10
    expect(await escalones(e)).toEqual([5, 10])
    expect((await uno(`select '${antes}'::timestamptz + interval '12 months' = hasta as v from membresias_cortesia where profile_id = '${e}'`)).v).toBe(true)
  })

  it('25 puntos: Embajadora de Honor, Destacado para siempre, sin duplicados', async () => {
    for (let i = 0; i < 5; i++) await orgActiva(c)              // 10 + 15 = 25
    expect(await escalones(e)).toEqual([5, 10, 25])
    const m = await membresia(e)
    expect(await hasta(e)).toBe('infinity')
    expect(m!.honor_at).not.toBeNull()
    expect(await plan(e)).toBe('destacado')
    await db.exec('select embajadores_revisar_todos(); select expirar_cortesias();')
    expect(await escalones(e)).toEqual([5, 10, 25])
    expect(await plan(e)).toBe('destacado')
    const d = await como('anon', null, `select * from embajadores_distintivos(array['${e}']::uuid[])`)
    expect(d.filas[0]).toMatchObject({ genero: 'f', honor: true })
    expect(Number((await uno(`select count(*)::int as v from embajadores_recompensas where embajador_id = '${e}'`)).v)).toBe(3)
  })

  it('una membresía ya terminada se renueva desde hoy (su actividad la renueva)', async () => {
    const x = id(60)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil, created_at) values ('${x}', 'Vencida', 'actor', now() - interval '2 years')`)
    const cx = await hacerEmbajador(x, 'Vencida')
    await orgActiva(cx)                                          // 3 puntos, todavía sin escalón
    const { p: a } = await colega(cx, 'actor', "verificado = true, avatar_url = 'f.jpg'")
    const { p: b } = await colega(cx, 'actor', "verificado = true, avatar_url = 'f.jpg'")
    await db.exec(`update membresias_cortesia set desde = now() - interval '13 months', hasta = now() - interval '1 month' where profile_id = '${x}'; select expirar_cortesias();`)
    expect(await plan(x)).toBe('gratuito')
    // Con la membresía terminada su enlace ya no admite colegas nuevos…
    expect((await colega(cx, 'actor')).r).toBe('no_valido')
    // …pero los que ya trajo siguen sumando: al completar su perfil, 5 puntos.
    await profesion(a); await profesion(b)
    expect(await escalones(x)).toEqual([5])
    expect(await plan(x)).toBe('destacado')
    expect((await uno(`select hasta between now() + interval '6 months' - interval '1 minute' and now() + interval '6 months' + interval '1 minute' as v from membresias_cortesia where profile_id = '${x}'`)).v).toBe(true)
    expect((await membresia(x))!.procesada).toBe(false)
  })

  it('Honor con un plan de pago superior: lo conserva', async () => {
    await db.exec(`update profiles set plan = 'empresas', is_premium = true where id = '${EMB_PAGA}'; insert into subscriptions values ('${EMB_PAGA}', 'empresas', 'active');`)
    const cp = await hacerEmbajador(EMB_PAGA, 'Paga', 'm')
    expect(await plan(EMB_PAGA)).toBe('empresas')
    for (let i = 0; i < 9; i++) await orgActiva(cp)              // 27 puntos
    expect(await escalones(EMB_PAGA)).toEqual([5, 10, 25])
    expect(await plan(EMB_PAGA)).toBe('empresas')
    const d = await como('anon', null, `select * from embajadores_distintivos(array['${EMB_PAGA}']::uuid[])`)
    expect(d.filas[0]).toMatchObject({ genero: 'm', honor: true })
  })

  it('quien renunció a su membresía no recibe escalones', async () => {
    const cr = await hacerEmbajador(EMB_RENUNCIA, 'Renuncia')
    await orgActiva(cr)
    const { p: pendiente } = await colega(cr, 'compania')
    expect(await v(EMB_RENUNCIA, 'renunciar_cortesia()')).toBe(true)
    await db.exec(`update profiles set avatar_url = 'l.png', bio = 'x', ciudad = 'Bogotá' where id = '${pendiente}'`)
    expect(await puntos(EMB_RENUNCIA)).toBe(6)
    expect(await escalones(EMB_RENUNCIA)).toEqual([])
    expect(await plan(EMB_RENUNCIA)).toBe('gratuito')
  })

  it('el colega sigue contando aunque después acepte su propia invitación de embajador', async () => {
    const p = await personaActiva(c)
    const antes = await puntos(e)
    await hacerEmbajador(p, 'Colega que asciende')
    expect(await puntos(e)).toBe(antes)
  })
})

describe('C · lo que ve cada uno y permisos', () => {
  it('mi_embajador: solo sus cifras', async () => {
    const r = await como('authenticated', EMB, 'select * from mi_embajador()')
    expect(r.error).toBeNull()
    expect(r.filas[0]).toMatchObject({ codigo_referido: codigo, honor: false, activa: true })
    expect(Number(r.filas[0].registrados)).toBeGreaterThan(5)
    expect((await como('authenticated', id(101), 'select * from mi_embajador()')).filas).toHaveLength(0)
  })

  it('nadie lee las tablas del programa con una sesión', async () => {
    for (const t of ['embajadores_referidos', 'embajadores_recompensas', 'embajadores_colegas']) {
      expect((await como('authenticated', EMB, `select * from ${t}`)).error).toMatch(/permission denied/)
    }
    for (const f of [`embajadores_revisar('${EMB}')`, 'embajadores_revisar_todos()', `colega_estado('${EMB}')`, `embajadores_puntos('${EMB}')`]) {
      expect((await como('authenticated', EMB, `select ${f}`)).error).toMatch(/permission denied/)
    }
  })

  it('revisión diaria programada antes de expirar las cortesías', async () => {
    const r = (await db.query<{ jobname: string; schedule: string }>(`select jobname, schedule from cron.job where jobname in ('embajadores-revisar', 'expirar-cortesias') order by jobname`)).rows
    expect(r).toEqual([{ jobname: 'embajadores-revisar', schedule: '30 3 * * *' }, { jobname: 'expirar-cortesias', schedule: '40 3 * * *' }])
  })
})

describe('Elenco Fundador sin cambios', () => {
  it('ninguna función, vista ni trigger del Elenco cambia con la migración', async () => {
    expect(await definicionesElenco()).toEqual(elencoAntes)
  })

  it('su escalera sigue funcionando con los triggers nuevos', async () => {
    const f = id(70)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil, created_at) values ('${f}', 'Fundadora', 'actor', now() - interval '90 days')`)
    const inv = (await uno(`select * from elenco_crear_invitacion('Fundadora', 'persona', 'Interpretación', '+34 600 000 000', '', '')`)) as { id: string; numero: number; token: string }
    expect(await v(f, `aceptar_invitacion_elenco('${inv.token}')`)).toBe('ok')
    for (let i = 0; i < 2; i++) {
      const p = id(800 + i)
      await db.exec(`insert into profiles (id, nombre, tipo_perfil) values ('${p}', 'o', 'compania')`)
      expect((await uno(`select elenco_atribuir('${p}', ${inv.numero}) as v`)).v).toBe('ok')
      await db.exec(`update profiles set avatar_url = 'l.png', bio = 'x', ciudad = 'Quito' where id = '${p}'`)
    }
    expect((await db.query(`select escalon from elenco_recompensas where fundador_id = '${inv.id}'`)).rows).toEqual([{ escalon: 5 }])
    expect(await plan(f)).toBe('premium')
  })
})
