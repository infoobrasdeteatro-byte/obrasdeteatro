import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * Elenco Fundador (20261031120000_elenco_fundador) en PGlite, sobre la
 * migración de Embajadores de Escena: plazas 001–100, invitación de un solo
 * uso, atribución por primer enlace, colegas activos y puntos calculados en
 * SQL, escalera sin duplicados, bono activable y caducidad, tramos que se
 * suman, plan que nunca baja y Embajadores sin cambios.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const ORG = id(20)        // fundador organización
const PAGA = id(21)       // fundador que ya paga Empresas
const EMB = id(22)        // embajador de escena (sin Elenco)

const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  create type public.tipo_perfil as enum ('actor', 'director', 'dramaturgo', 'compania', 'productora', 'teatro', 'festival', 'escuela', 'institucion', 'profesional', 'publico');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column is_premium boolean not null default false,
    add column created_at timestamptz not null default now(),
    add column updated_at timestamptz not null default now(),
    add column nombre_artistico text,
    add column avatar_url text,
    add column bio text,
    add column ciudad text,
    add column verificado boolean not null default false,
    add column tipo_perfil public.tipo_perfil not null default 'profesional',
    add column deleted_at timestamptz,
    add column slug text,
    add column perfil_publico boolean not null default true,
    add column email text;
  create table public.subscriptions (profile_id uuid unique, plan text not null, status text not null);
  create table public.espacios_reclamaciones (id uuid primary key default gen_random_uuid(), profile_id uuid not null, estado text not null default 'pendiente');
  create table public.cartelera_destacados (id uuid primary key default gen_random_uuid(), espectaculo_id uuid, desde date, hasta date);
  create table public.profile_specialties (id uuid primary key default gen_random_uuid(), profile_id uuid not null, specialty text not null, is_primary boolean not null default false);
  create role service_role nologin;
  grant usage on schema public to service_role;
  -- Sello «✓ Verificado» que sigue al plan (copia de 20261023140000_perfiles_verificacion_profesional).
  alter table public.profiles add column verificado_profesional boolean not null default false;
  create table public.verificaciones_profesionales (profile_id uuid, estado text);
  create function public.profiles_sello_sigue_plan() returns trigger language plpgsql set search_path = 'public' as $$
  begin
    if new.plan is distinct from old.plan then
      if new.plan::text = 'gratuito' then
        new.verificado_profesional := false;
      elsif old.plan::text = 'gratuito' and exists (
        select 1 from public.verificaciones_profesionales v where v.profile_id = new.id and v.estado = 'aprobada') then
        new.verificado_profesional := true;
      end if;
    end if;
    return new;
  end $$;
  create trigger profiles_sello_sigue_plan before update of plan on public.profiles
    for each row execute function public.profiles_sello_sigue_plan();
`

const uno = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows[0]
const plan = async (p: string) => (await uno(`select plan::text as v from profiles where id = '${p}'`)).v as string
const v = async (uid: string | null, sql: string) => {
  const r = await como(uid ? 'authenticated' : 'anon', uid, `select ${sql} as v`)
  if (r.error) throw new Error(r.error)
  return r.filas[0]?.v ?? null
}
const invitar = async (nombre: string, tipo = 'persona') =>
  (await uno(`select * from elenco_crear_invitacion('${nombre}', '${tipo}', 'Interpretación', '+34 600 000 000', '', '')`)) as { id: string; numero: number; token: string }
const fundadorDe = async (p: string) => (await uno(`select id from elenco_fundadores where aceptada_por = '${p}'`)).id as string
const puntos = async (f: string) => Number((await uno(`select elenco_puntos('${f}') as v`)).v)
const escalones = async (f: string) =>
  (await db.query<{ escalon: number }>(`select escalon from elenco_recompensas where fundador_id = '${f}' order by escalon`)).rows.map(r => Number(r.escalon))
const tramos = async (p: string) =>
  (await db.query<{ motivo: string; plan: string; desde: string; hasta: string }>(
    `select motivo, plan, desde::text, hasta::text from elenco_cortesias where profile_id = '${p}' order by desde`)).rows

/** Crea un colega nuevo atribuido al fundador nº `numero`. */
let siguiente = 100
async function colega(numero: number, tipo = 'profesional', datos = '', profesion = false) {
  const p = id(++siguiente)
  await db.exec(`insert into profiles (id, nombre, tipo_perfil) values ('${p}', 'colega ${siguiente}', '${tipo}')`)
  expect((await uno(`select elenco_atribuir('${p}', ${numero}) as v`)).v).toBe('ok')
  if (datos) await db.exec(`update profiles set ${datos} where id = '${p}'`)
  if (profesion) await elegirProfesion(p)
  return p
}
const elegirProfesion = (p: string) => db.exec(`insert into profile_specialties (profile_id, specialty, is_primary) values ('${p}', 'interpretacion', true)`)
const activarPersona = 'verificado = true, avatar_url = \'f.jpg\''

let n1: { id: string; numero: number; token: string }

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(
    ['20261025120000_embajadores_de_escena.sql', '20261031120000_elenco_fundador.sql', '20261031150000_elenco_colega_profesion.sql'], PREVIO))
  await db.exec(`
    insert into profiles (id, nombre, tipo_perfil) values ('${ORG}', 'Compañía', 'compania'), ('${EMB}', 'Embajadora', 'actor');
    insert into profiles (id, nombre, plan, is_premium) values ('${PAGA}', 'paga', 'empresas', true);
    insert into subscriptions values ('${PAGA}', 'empresas', 'active');
    update profiles set created_at = now() - interval '90 days' where id in ('${U1}', '${U2}', '${ORG}', '${PAGA}', '${EMB}');
  `)
  n1 = await invitar('Ana')
})

describe('invitaciones y plazas', () => {
  it('numera desde 001; una anulada libera su número; no pasa de 100', async () => {
    expect(n1.numero).toBe(1)
    const b = await invitar('Borja')
    expect(b.numero).toBe(2)
    await db.exec(`update elenco_fundadores set estado = 'anulada' where id = '${b.id}'`)
    expect((await invitar('Carla')).numero).toBe(2)

    await db.exec(`insert into elenco_fundadores (numero, nombre, tipo, oficio, email)
      select g, 'x' || g, 'persona', 'otros', 'x@y.es' from generate_series(3, 100) g`)
    await expect(invitar('Sobra')).rejects.toThrow(/sin_plazas/)
    await db.exec(`delete from elenco_fundadores where numero > 3`)
  })

  it('pide teléfono o correo', async () => {
    await expect(db.exec(`insert into elenco_fundadores (numero, nombre, tipo, oficio) values (50, 'x', 'persona', 'otros')`)).rejects.toThrow()
  })

  it('la página pública ve nombre, tipo y estado; un token falso, nada', async () => {
    const r = await como('anon', null, `select * from elenco_invitacion_publica('${n1.token}')`)
    expect(r.filas[0]).toMatchObject({ nombre: 'Ana', tipo: 'persona', estado: 'pendiente' })
    expect((await como('anon', null, `select * from elenco_invitacion_publica('falso')`)).filas).toHaveLength(0)
  })

  it('se acepta con una cuenta ya existente; enlace de un solo uso; una plaza por cuenta', async () => {
    expect(await v(U1, `aceptar_invitacion_elenco('${n1.token}')`)).toBe('ok')
    expect(await v(U1, `aceptar_invitacion_elenco('${n1.token}')`)).toBe('ok')
    expect(await v(U2, `aceptar_invitacion_elenco('${n1.token}')`)).toBe('usada')
    const c = (await uno(`select token from elenco_fundadores where numero = 2 and estado <> 'anulada'`)).token
    expect(await v(U1, `aceptar_invitacion_elenco('${c}')`)).toBe('ya_fundador')
    // El plan de base es el gratuito: aceptar no regala nada todavía.
    expect(await plan(U1)).toBe('gratuito')
  })

  it('nadie lee las tablas del programa con una sesión', async () => {
    for (const t of ['elenco_fundadores', 'elenco_referidos', 'elenco_cortesias', 'elenco_recompensas', 'elenco_colegas']) {
      expect((await como('authenticated', U1, `select * from ${t}`)).error).toMatch(/permission denied/)
    }
    expect((await como('authenticated', U1, `select elenco_revisar('${n1.id}')`)).error).toMatch(/permission denied/)
  })
})

describe('atribución por primer enlace', () => {
  it('cuenta el primer enlace, una sola vez por cuenta', async () => {
    const c = (await uno(`select token from elenco_fundadores where numero = 2 and estado <> 'anulada'`)).token
    expect(await v(U2, `aceptar_invitacion_elenco('${c}')`)).toBe('ok')
    const p = await colega(1)
    expect((await uno(`select elenco_atribuir('${p}', 2) as v`)).v).toBe('ya_atribuida')
    expect((await uno(`select f.numero from elenco_referidos r join elenco_fundadores f on f.id = r.fundador_id where r.profile_id = '${p}'`)).numero).toBe(1)
  })

  it('no atribuye cuentas antiguas, al propio fundador ni a plazas sin fundador', async () => {
    expect((await uno(`select elenco_atribuir('${EMB}', 1) as v`)).v).toBe('no_aplica')
    expect((await uno(`select elenco_atribuir('${U1}', 1) as v`)).v).toBe('no_aplica')
    const nuevo = id(99)
    await db.exec(`insert into profiles (id, nombre) values ('${nuevo}', 'n')`)
    expect((await uno(`select elenco_atribuir('${nuevo}', 3) as v`)).v).toBe('no_valido')
  })

  it('si un referido acepta después su propia invitación, su atribución no cambia', async () => {
    const p = await colega(2)
    const inv = await invitar('Referida')
    expect(await v(p, `aceptar_invitacion_elenco('${inv.token}')`)).toBe('ok')
    expect((await uno(`select count(*)::int as v from elenco_referidos where profile_id = '${p}'`)).v).toBe(1)
  })
})

describe('colegas activos y puntos (calculados en SQL)', () => {
  it('persona: correo confirmado + foto = 1 punto; organización completa = 3; sala con reclamación aprobada = 3', async () => {
    const f = await fundadorDe(U2)
    const base = await puntos(f)
    const sinFoto = await colega(2, 'actor', 'verificado = true')
    const sinConfirmar = await colega(2, 'actor', "avatar_url = 'f.jpg'")
    expect(await puntos(f)).toBe(base)

    // Correo confirmado y foto, pero sin profesión: todavía no cuenta.
    const sinProfesion = await colega(2, 'actor', activarPersona)
    expect(await puntos(f)).toBe(base)
    // Público general: queda atribuido, pero nunca suma, aunque lo tenga todo.
    const publico = await colega(2, 'publico', activarPersona, true)
    expect(await puntos(f)).toBe(base)
    expect((await uno(`select clase, activo, puntos from elenco_colegas where profile_id = '${publico}'`))).toEqual({ clase: 'publico', activo: false, puntos: 0 })
    // Al elegir una profesión pasa a activo en el momento (trigger).
    await elegirProfesion(sinProfesion)
    expect(await puntos(f)).toBe(base + 1)

    await colega(2, 'compania', "avatar_url = 'logo.png', bio = 'x'")
    expect(await puntos(f)).toBe(base + 1)
    const org = await colega(2, 'festival', "avatar_url = 'logo.png', bio = 'x', ciudad = 'Madrid'")
    expect(await puntos(f)).toBe(base + 4)

    const sala = await colega(2, 'teatro', "avatar_url = 'logo.png', bio = 'x', ciudad = 'Madrid'")
    expect(await puntos(f)).toBe(base + 4)
    await db.exec(`insert into espacios_reclamaciones (profile_id, estado) values ('${sala}', 'aprobada')`)
    expect(await puntos(f)).toBe(base + 7)

    // Se recalcula con los datos reales: si el colega pierde la foto, deja de contar.
    await db.exec(`update profiles set avatar_url = null where id = '${org}'`)
    expect(await puntos(f)).toBe(base + 4)
    const filas = (await db.query<{ profile_id: string; activo: boolean }>(`select profile_id, activo from elenco_colegas where profile_id in ('${sinFoto}', '${sinConfirmar}')`)).rows
    expect(filas.every(r => r.activo === false)).toBe(true)
  })
})

describe('escalera de recompensas', () => {
  it('al llegar a 5 puntos otorga el escalón al momento (trigger) y nunca dos veces', async () => {
    const f = n1.id
    for (let i = 0; i < 4; i++) await colega(1, 'actor', activarPersona, true)
    expect(await escalones(f)).toEqual([])
    await colega(1, 'actor', activarPersona, true)   // 5.º colega activo
    expect(await puntos(f)).toBe(5)
    expect(await escalones(f)).toEqual([5])
    expect(await plan(U1)).toBe('premium')

    expect(Number((await uno(`select elenco_revisar('${f}') as v`)).v)).toBe(0)
    expect(Number((await uno(`select elenco_revisar_todos() as v`)).v)).toBe(0)
    expect(await escalones(f)).toEqual([5])
    expect((await tramos(U1)).filter(t => t.motivo === 'escalon_5')).toHaveLength(1)
  })

  it('un salto de puntos otorga todos los escalones intermedios, cada uno una vez', async () => {
    const f = await fundadorDe(ORG).catch(() => null)
    expect(f).toBeNull()
    const inv = await invitar('Compañía', 'organizacion')
    expect(await v(ORG, `aceptar_invitacion_elenco('${inv.token}')`)).toBe('ok')
    numeroOrg = inv.numero
    for (let i = 0; i < 4; i++) await colega(inv.numero, 'compania')
    await db.exec(`update profiles set avatar_url = 'l.png', bio = 'x', ciudad = 'y'
      where id in (select profile_id from elenco_referidos where fundador_id = '${inv.id}')`)
    expect(await puntos(inv.id)).toBe(12)
    expect(await escalones(inv.id)).toEqual([5, 10])
    expect(await plan(ORG)).toBe('empresas')
    // Tiempo sumado, no superpuesto: 3 meses + 12 meses seguidos.
    const t = await tramos(ORG)
    expect(t.map(x => x.motivo)).toEqual(['escalon_5', 'escalon_10'])
    expect(t[1].desde).toBe(t[0].hasta)
  })

  it('25 puntos: año de Destacado a la persona sin recortar su tiempo de Premium; organización: semanas de Cartelera', async () => {
    for (let i = 0; i < 20; i++) await colega(1, 'actor', activarPersona, true)
    expect(await escalones(n1.id)).toEqual([5, 10, 25])
    expect(await plan(U1)).toBe('destacado')

    // Los tramos no se solapan; el Destacado empieza ya y el Premium que
    // quedaba se aplaza entero: siguen siendo 3 + 12 meses de Premium.
    const t = await tramos(U1)
    for (let i = 1; i < t.length; i++) expect(Date.parse(t[i].desde)).toBeGreaterThanOrEqual(Date.parse(t[i - 1].hasta))
    const destacado = t.find(x => x.plan === 'destacado')!
    expect(Math.abs(Date.parse(destacado.desde) - Date.now())).toBeLessThan(60_000)
    const dias = t.filter(x => x.plan === 'premium').reduce((s, x) => s + (Date.parse(x.hasta) - Date.parse(x.desde)), 0) / 86400e3
    expect(dias).toBeGreaterThan(15 * 30.4 - 4)
    expect(dias).toBeLessThan(15 * 30.4 + 4)

    for (let i = 0; i < 5; i++) await colega(inv25(), 'compania', "avatar_url = 'l.png', bio = 'x', ciudad = 'y'")
    const org = await fundadorDe(ORG)
    expect(await escalones(org)).toEqual([5, 10, 25])
    expect((await uno(`select semanas_cartelera from elenco_recompensas where fundador_id = '${org}' and escalon = 25`)).semanas_cartelera).toBe(4)
    expect((await uno(`select semanas_cartelera from elenco_recompensas where fundador_id = '${n1.id}' and escalon = 25`)).semanas_cartelera).toBe(0)
  })

  it('50 puntos: Miembro de Honor para siempre', async () => {
    for (let i = 0; i < 9; i++) await colega(inv25(), 'compania', "avatar_url = 'l.png', bio = 'x', ciudad = 'y'")
    const org = await fundadorDe(ORG)
    expect(await escalones(org)).toEqual([5, 10, 25, 50])
    const honor = (await tramos(ORG)).find(x => x.motivo === 'escalon_50')!
    expect(honor.hasta).toBe('infinity')
  })
})

/** Número del fundador organización. */
let numeroOrg = 0
function inv25() { return numeroOrg }

describe('bono de bienvenida', () => {
  it('se activa una vez con el botón, dentro de los 12 meses', async () => {
    const inv = await invitar('Dani')
    const p = id(70)
    await db.exec(`insert into profiles (id, nombre) values ('${p}', 'dani')`)
    expect(await v(p, `aceptar_invitacion_elenco('${inv.token}')`)).toBe('ok')
    let mio = (await como('authenticated', p, 'select * from mi_elenco()')).filas[0]
    expect(mio).toMatchObject({ bono_estado: 'disponible', puntos: 0, escalon: 0 })
    expect(await plan(p)).toBe('gratuito')

    expect(await v(p, 'elenco_activar_bono()')).toBe('ok')
    expect(await plan(p)).toBe('premium')
    expect(await v(p, 'elenco_activar_bono()')).toBe('ya_activado')
    mio = (await como('authenticated', p, 'select * from mi_elenco()')).filas[0]
    expect(mio.bono_estado).toBe('activo')
    const t = (await tramos(p))[0]
    expect(Date.parse(t.hasta) - Date.parse(t.desde)).toBeGreaterThan(88 * 86400e3)

    // Al terminar, vuelve a su plan.
    await db.exec(`update elenco_cortesias set desde = desde - interval '4 months', hasta = hasta - interval '4 months' where profile_id = '${p}'`)
    await db.exec('select elenco_revisar_todos()')
    expect(await plan(p)).toBe('gratuito')
    expect((await como('authenticated', p, 'select * from mi_elenco()')).filas[0].bono_estado).toBe('usado')
  })

  it('caduca si no se activa en 12 meses', async () => {
    const inv = await invitar('Eva')
    const p = id(71)
    await db.exec(`insert into profiles (id, nombre) values ('${p}', 'eva')`)
    await v(p, `aceptar_invitacion_elenco('${inv.token}')`)
    await db.exec(`update elenco_fundadores set aceptada_at = now() - interval '13 months' where id = '${inv.id}'`)
    expect((await como('authenticated', p, 'select * from mi_elenco()')).filas[0].bono_estado).toBe('caducado')
    expect(await v(p, 'elenco_activar_bono()')).toBe('caducado')
    expect(await plan(p)).toBe('gratuito')
  })

  it('una organización recibe Empresas; quien no es fundador no puede activarlo', async () => {
    const inv = await invitar('Sala Uno', 'organizacion')
    const p = id(72)
    await db.exec(`insert into profiles (id, nombre, tipo_perfil) values ('${p}', 'sala', 'teatro')`)
    await v(p, `aceptar_invitacion_elenco('${inv.token}')`)
    expect(await v(p, 'elenco_activar_bono()')).toBe('ok')
    expect(await plan(p)).toBe('empresas')
    expect(await v(EMB, 'elenco_activar_bono()')).toBe('no_fundador')
  })
})

describe('el plan no baja nunca', () => {
  it('a quien ya paga un plan superior, el bono no le baja el plan, ni al empezar ni al terminar', async () => {
    const inv = await invitar('Paga')
    await v(PAGA, `aceptar_invitacion_elenco('${inv.token}')`)
    expect(await v(PAGA, 'elenco_activar_bono()')).toBe('ok')
    expect(await plan(PAGA)).toBe('empresas')
    await db.exec(`update elenco_cortesias set desde = desde - interval '4 months', hasta = hasta - interval '4 months' where profile_id = '${PAGA}'`)
    await db.exec('select elenco_revisar_todos()')
    expect(await plan(PAGA)).toBe('empresas')
  })

  it('si Stripe retira una suscripción mientras dura un tramo del Elenco, el plan se queda en el del tramo y el sello no se pierde', async () => {
    expect(await plan(U1)).toBe('destacado')
    await db.exec(`update profiles set verificado_profesional = true where id = '${U1}'`)
    await db.exec(`update profiles set plan = 'gratuito', is_premium = false where id = '${U1}'`)
    expect(await plan(U1)).toBe('destacado')
    expect((await uno(`select verificado_profesional as v from profiles where id = '${U1}'`)).v).toBe(true)
  })
})

describe('Embajadores de Escena sin cambios', () => {
  it('invitación, Destacado 12 meses, renuncia y vuelta a gratuito, igual que antes', async () => {
    const token = (await uno(`insert into embajadores_invitaciones (nombre, genero, oficio) values ('Emb', 'f', 'dramaturgia') returning token`)).token
    expect(await v(EMB, `aceptar_invitacion_embajador('${token}')`)).toBe('ok')
    expect(await plan(EMB)).toBe('destacado')
    expect(await v(EMB, 'renunciar_cortesia()')).toBe(true)
    expect(await plan(EMB)).toBe('gratuito')
  })

  it('el fin de una cortesía de Embajador no retira el plan del Elenco a un fundador', async () => {
    const token = (await uno(`insert into embajadores_invitaciones (nombre, genero, oficio) values ('Ana', 'f', 'otros') returning token`)).token
    expect(await v(U1, `aceptar_invitacion_embajador('${token}')`)).toBe('ok')
    expect(await v(U1, 'renunciar_cortesia()')).toBe(true)
    expect(await plan(U1)).toBe('destacado')
  })
})

describe('páginas públicas', () => {
  it('distintivo con su número y lista pública desde el escalón 10', async () => {
    const d = (await como('anon', null, `select * from elenco_distintivos(array['${U1}', '${EMB}']::uuid[])`)).filas
    expect(d).toEqual([{ profile_id: U1, numero: 1 }])
    const pub = (await como('anon', null, 'select numero, escalon from elenco_publico()')).filas
    expect(pub.map(r => Number(r.numero))).toContain(1)
    expect(pub.every(r => Number(r.escalon) >= 10)).toBe(true)
    expect((await como('anon', null, 'select * from elenco_fundador_publico(1)')).filas[0]).toMatchObject({ numero: 1, nombre: 'u1' })
    expect((await como('anon', null, 'select * from elenco_fundador_publico(99)')).filas).toHaveLength(0)
  })
})

describe('script del editor supabase/tests/elenco_escalones.sql', () => {
  it('termina en ELENCO_OK y no deja nada guardado', async () => {
    // Dos perfiles reales que ya contarían como colega activo, los primeros por antigüedad: el script no debe elegirlos.
    for (let i = 0; i < 2; i++) {
      await db.exec(`insert into profiles (id, nombre, created_at, tipo_perfil, verificado, avatar_url) values ('${id(600 + i)}', 'activo ${i}', now() - interval '2000 days', 'actor', true, 'f.jpg')`)
      await elegirProfesion(id(600 + i))
    }
    for (let i = 0; i < 18; i++) await db.exec(`insert into profiles (id, nombre, created_at) values ('${id(500 + i)}', 'libre ${i}', now() - interval '1000 days')`)
    const antes = (await uno('select (select count(*) from elenco_fundadores) + (select count(*) from elenco_recompensas) + (select count(*) from elenco_referidos) as v')).v
    const script = readFileSync(path.resolve(__dirname, '../../../supabase/tests/elenco_escalones.sql'), 'utf8')
    await expect(db.exec(script)).rejects.toThrow(/ELENCO_OK: fundador nº \d{3}; 51 puntos \(partida 0\), escalones \{5,10,25,50\}/)
    await db.exec('rollback')
    const despues = (await uno('select (select count(*) from elenco_fundadores) + (select count(*) from elenco_recompensas) + (select count(*) from elenco_referidos) as v')).v
    expect(despues).toBe(antes)
  })
})

describe('script de limpieza supabase/mantenimiento/elenco_limpieza_pruebas.sql', () => {
  it('muestra antes lo que borraría y borra solo lo de las cuentas indicadas', async () => {
    await db.exec(`update profiles set email = 'u1@prueba.es' where id = '${U1}'; update profiles set email = 'org@prueba.es' where id = '${ORG}'`)
    const otros = (await uno(`select count(*)::int as v from elenco_fundadores where aceptada_por not in ('${U1}', '${ORG}') or aceptada_por is null`)).v
    const texto = readFileSync(path.resolve(__dirname, '../../../supabase/mantenimiento/elenco_limpieza_pruebas.sql'), 'utf8')
      .replace(/\('prueba1@ejemplo\.com'\),\s*\('prueba2@ejemplo\.com'\)/g, "('u1@prueba.es'), ('ORG@prueba.es')")
    const [parteA, parteB] = texto.split('-- ═══ PARTE B')

    const vista = (await db.query<{ que: string; numero: string | null; detalle: string | null }>(parteA.slice(parteA.indexOf('with correos')))).rows
    expect(vista.filter(r => r.que === 'Cuenta de prueba encontrada')).toHaveLength(2)
    expect(vista.filter(r => r.que === 'Invitación / plaza de fundador').map(r => r.numero).sort()).toHaveLength(2)
    expect(vista.some(r => r.que === 'Recompensa (escalón)')).toBe(true)
    expect(vista.find(r => r.que === 'Siguiente número que se asignará')!.numero).toBe('001')
    // La parte A no borra nada.
    expect((await uno(`select count(*)::int as v from elenco_fundadores where aceptada_por in ('${U1}', '${ORG}')`)).v).toBe(2)

    await db.exec(parteB.slice(parteB.indexOf('begin;')))
    expect((await uno(`select count(*)::int as v from elenco_fundadores where aceptada_por in ('${U1}', '${ORG}')`)).v).toBe(0)
    expect((await uno(`select count(*)::int as v from elenco_cortesias where profile_id in ('${U1}', '${ORG}')`)).v).toBe(0)
    expect((await uno(`select count(*)::int as v from elenco_fundadores`)).v).toBe(otros)
    expect(await plan(U1)).toBe('gratuito')
    expect(await plan(ORG)).toBe('gratuito')
    expect((await uno(`select min(g)::int as v from generate_series(1, 100) g where not exists (select 1 from elenco_fundadores f where f.numero = g and f.estado <> 'anulada')`)).v).toBe(1)
  })
})
