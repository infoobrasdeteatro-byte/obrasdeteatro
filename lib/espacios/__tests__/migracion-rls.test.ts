import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'

/**
 * La migración 20261009120000_espacios_escenicos ejecutada de verdad, en
 * PGlite (PostgreSQL compilado a WebAssembly, en memoria), con lo mínimo de
 * Supabase que necesita: roles anon y authenticated con los permisos por
 * defecto de Supabase, auth.uid() leído de request.jwt.claim.sub, profiles,
 * profile_roles, es_moderador(), update_updated_at() y slugificar() (copiada
 * tal cual de su migración).
 *
 * Comprueba la carga de los 40 espacios, los slugs, la RLS de las dos tablas
 * y el trigger que rellena gestionado_por al aprobar una reclamación.
 */

const RAIZ = path.resolve(__dirname, '../../..')
const MIGRACION = readFileSync(path.join(RAIZ, 'supabase/migrations/20261009120000_espacios_escenicos.sql'), 'utf8')
const SLUGS = readFileSync(path.join(RAIZ, 'supabase/migrations/20261006105630_slugs_normalizar_en_orden.sql'), 'utf8')
const SLUGIFICAR = SLUGS.slice(
  SLUGS.indexOf('create or replace function public.slugificar'),
  SLUGS.indexOf('comment on function public.slugificar'),
)

const MOD = '00000000-0000-0000-0000-00000000000a'
const U1 = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-000000000002'

let db: PGlite

type Resultado = { filas: Record<string, unknown>[]; error: string | null }

/** Ejecuta `sql` con el rol y el usuario dados, como lo haría PostgREST. */
async function como(rol: 'anon' | 'authenticated', uid: string | null, sql: string): Promise<Resultado> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${rol};`)
  try {
    const r = await db.query<Record<string, unknown>>(sql)
    return { filas: r.rows, error: null }
  } catch (e) {
    return { filas: [], error: e instanceof Error ? e.message : String(e) }
  } finally {
    await db.exec('reset role')
  }
}

const idDe = async (slug: string) =>
  (await db.query<{ id: string }>(`select id from espacios_escenicos where slug = '${slug}'`)).rows[0].id

beforeAll(async () => {
  db = new PGlite({ extensions: { unaccent } })
  await db.exec(`
    create schema extensions;
    create extension unaccent with schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public, extensions to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create table public.profiles (id uuid primary key, nombre text);
    create table public.profile_roles (profile_id uuid, role text);
    create function public.es_moderador() returns boolean language sql stable security definer set search_path = 'public' as
      $$ select exists (select 1 from public.profile_roles where profile_id = auth.uid() and role in ('admin', 'moderator')) $$;
    create function public.update_updated_at() returns trigger language plpgsql as
      $$ begin new.updated_at = now(); return new; end $$;
    ${SLUGIFICAR}
  `)
  await db.exec(MIGRACION)
  await db.exec(`
    insert into profiles values ('${MOD}', 'mod'), ('${U1}', 'u1'), ('${U2}', 'u2');
    insert into profile_roles values ('${MOD}', 'moderator');
  `)
}, 60_000)

describe('migración espacios_escenicos: carga inicial y slugs', () => {
  it('carga los 40 espacios, todos publicados, de Canarias (ES)', async () => {
    const r = await db.query<{ n: number; p: number; c: number }>(`
      select count(*)::int n,
             count(*) filter (where estado = 'publicado')::int p,
             count(*) filter (where pais_code = 'ES' and region = 'Canarias')::int c
      from espacios_escenicos`)
    expect(r.rows[0]).toEqual({ n: 40, p: 40, c: 40 })
  })

  it('slug, municipio_slug y nombre_normalizado calculados por el trigger', async () => {
    const r = await db.query<{ slug: string; municipio_slug: string; nombre_normalizado: string }>(
      `select slug, municipio_slug, nombre_normalizado from espacios_escenicos where nombre = 'Teatro Guimerá'`)
    expect(r.rows[0]).toEqual({ slug: 'teatro-guimera', municipio_slug: 'santa-cruz-de-tenerife', nombre_normalizado: 'teatro guimera' })
    const salinero = await db.query<{ slug: string }>(`select slug from espacios_escenicos where nombre like '%Salinero%'`)
    expect(salinero.rows[0].slug).toBe('teatro-victor-fernandez-gopar-el-salinero')
    const laguna = await db.query<{ municipio_slug: string }>(`select distinct municipio_slug from espacios_escenicos where municipio = 'San Cristóbal de La Laguna'`)
    expect(laguna.rows).toEqual([{ municipio_slug: 'san-cristobal-de-la-laguna' }])
  })

  it('los 40 slugs son únicos', async () => {
    const r = await db.query<{ n: number }>(`select count(distinct slug)::int n from espacios_escenicos`)
    expect(r.rows[0].n).toBe(40)
  })

  it('solo Orfeón La Paz y Teatro Guiniguada siguen en http://; Guimerá y Cuyás pasan a https', async () => {
    const http = await db.query<{ nombre: string }>(`select nombre from espacios_escenicos where web like 'http://%' order by nombre`)
    expect(http.rows.map(r => r.nombre)).toEqual(['Orfeón La Paz', 'Teatro Guiniguada'])
    const https = await db.query<{ web: string }>(`select web from espacios_escenicos where nombre in ('Teatro Guimerá', 'Teatro Cuyás') order by nombre`)
    expect(https.rows.map(r => r.web)).toEqual(['https://www.teatrocuyas.com', 'https://www.teatroguimera.es/'])
  })

  it('colisión de slug: primero nombre-municipio, luego sufijo numérico; editar no cambia el slug', async () => {
    await db.exec(`
      insert into espacios_escenicos (nombre, tipo, pais_code, region, municipio, lat, lon)
      values ('Teatro Leal', 'teatro', 'ES', 'Canarias', 'Arona', 1, 1),
             ('Teatro Leal', 'teatro', 'ES', 'Canarias', 'Arona', 1, 1)`)
    const r = await db.query<{ slug: string }>(`select slug from espacios_escenicos where nombre = 'Teatro Leal' order by slug`)
    expect(r.rows.map(x => x.slug)).toEqual(['teatro-leal', 'teatro-leal-arona', 'teatro-leal-arona-2'])

    await db.exec(`update espacios_escenicos set municipio = 'Adeje', nombre = 'Teatro Leal de Adeje' where slug = 'teatro-leal-arona'`)
    const e = await db.query<{ slug: string; municipio_slug: string }>(`select slug, municipio_slug from espacios_escenicos where nombre = 'Teatro Leal de Adeje'`)
    expect(e.rows[0]).toEqual({ slug: 'teatro-leal-arona', municipio_slug: 'adeje' })

    await db.exec(`update espacios_escenicos set estado = 'borrador' where slug in ('teatro-leal-arona', 'teatro-leal-arona-2')`)
  })

  it('las CHECK rechazan país fuera del ámbito, web que no es http(s), tipo y descripción larga', async () => {
    const base = `insert into espacios_escenicos (nombre, tipo, pais_code, region, municipio, lat, lon`
    await expect(db.exec(`${base}) values ('X', 'teatro', 'FR', 'Canarias', 'Y', 1, 1)`)).rejects.toThrow(/pais_check/)
    await expect(db.exec(`${base}, web) values ('X', 'teatro', 'ES', 'Canarias', 'Y', 1, 1, 'ftp://x.es')`)).rejects.toThrow(/web_formato/)
    await expect(db.exec(`${base}) values ('X', 'cine', 'ES', 'Canarias', 'Y', 1, 1)`)).rejects.toThrow(/tipo_check/)
    await expect(db.exec(`${base}, descripcion) values ('X', 'teatro', 'ES', 'Canarias', 'Y', 1, 1, repeat('a', 601))`)).rejects.toThrow(/descripcion_longitud/)
    await expect(db.exec(`${base}) values ('X', 'teatro', 'ES', 'Canarias', 'Y', 91, 1)`)).rejects.toThrow(/lat_rango/)
  })
})

describe('RLS de espacios_escenicos', () => {
  it('el público (anon) solo ve los publicados y no escribe', async () => {
    expect((await como('anon', null, `select count(*)::int n from espacios_escenicos`)).filas[0].n).toBe(40)
    expect((await como('anon', null, `update espacios_escenicos set nombre = 'x'`)).error).toMatch(/permission denied/)
  })

  it('un usuario con sesión no crea ni edita espacios', async () => {
    const ins = await como('authenticated', U1, `insert into espacios_escenicos (nombre, tipo, pais_code, region, municipio, lat, lon) values ('X', 'teatro', 'ES', 'Canarias', 'Y', 1, 1)`)
    expect(ins.error).toMatch(/row-level security/)
    const upd = await como('authenticated', U1, `update espacios_escenicos set nombre = 'x' where slug = 'teatro-leal' returning id`)
    expect(upd.filas).toHaveLength(0)
  })

  it('moderación lo ve todo y cambia el estado', async () => {
    expect((await como('authenticated', MOD, `select count(*)::int n from espacios_escenicos`)).filas[0].n).toBe(42)
    const r = await como('authenticated', MOD, `update espacios_escenicos set estado = 'retirado' where slug = 'teatro-leal-arona-2' returning estado`)
    expect(r.filas).toEqual([{ estado: 'retirado' }])
  })
})

describe('reclamaciones y aprobación', () => {
  let reclamacionU1: string

  it('anon no reclama ni ve reclamaciones', async () => {
    const leal = await idDe('teatro-leal')
    expect((await como('anon', null, `insert into espacios_reclamaciones (espacio_id, profile_id, mensaje) values ('${leal}', '${U1}', 'Director, 600000000')`)).error).toBeTruthy()
    expect((await como('anon', null, `select * from espacios_reclamaciones`)).error).toMatch(/permission denied/)
  })

  it('no se reclama en nombre de otro, ya aprobada, un espacio sin publicar ni con mensaje corto', async () => {
    const leal = await idDe('teatro-leal')
    const borrador = await idDe('teatro-leal-arona')
    const ins = (espacio: string, perfil: string, mensaje: string, extra = '') =>
      como('authenticated', U1, `insert into espacios_reclamaciones (espacio_id, profile_id, mensaje${extra ? ', estado' : ''}) values ('${espacio}', '${perfil}', '${mensaje}'${extra ? `, '${extra}'` : ''})`)
    expect((await ins(leal, U2, 'Director, 600000000')).error).toMatch(/row-level security/)
    expect((await ins(leal, U1, 'Director, 600000000', 'aprobada')).error).toMatch(/row-level security/)
    expect((await ins(borrador, U1, 'Director, 600000000')).error).toMatch(/row-level security/)
    expect((await ins(leal, U1, 'corto')).error).toMatch(/mensaje_longitud/)
  })

  it('el usuario crea la suya, solo una pendiente por espacio, y solo ve las suyas', async () => {
    const leal = await idDe('teatro-leal')
    const r = await como('authenticated', U1, `insert into espacios_reclamaciones (espacio_id, profile_id, mensaje) values ('${leal}', '${U1}', 'Director del Teatro Leal, 600000000') returning id, estado`)
    expect(r.error).toBeNull()
    expect(r.filas[0].estado).toBe('pendiente')
    reclamacionU1 = r.filas[0].id as string

    const otra = await como('authenticated', U1, `insert into espacios_reclamaciones (espacio_id, profile_id, mensaje) values ('${leal}', '${U1}', 'Otra vez, 600000000')`)
    expect(otra.error).toMatch(/espacios_reclamaciones_una_pendiente/)

    const deU2 = await como('authenticated', U2, `insert into espacios_reclamaciones (espacio_id, profile_id, mensaje) values ('${leal}', '${U2}', 'Gerente, gerente@leal.es') returning id`)
    expect(deU2.filas).toHaveLength(1)

    expect((await como('authenticated', U1, `select count(*)::int n from espacios_reclamaciones`)).filas[0].n).toBe(1)
  })

  it('el usuario no puede aprobarse ni borrar su reclamación', async () => {
    expect((await como('authenticated', U1, `update espacios_reclamaciones set estado = 'aprobada' where id = '${reclamacionU1}' returning id`)).filas).toHaveLength(0)
    expect((await como('authenticated', U1, `delete from espacios_reclamaciones where id = '${reclamacionU1}' returning id`)).filas).toHaveLength(0)
    const g = await db.query<{ n: number }>(`select count(*)::int n from espacios_escenicos where gestionado_por is not null`)
    expect(g.rows[0].n).toBe(0)
  })

  it('al aprobar, moderación sella resuelta_at y el espacio pasa a gestionarlo quien reclamó', async () => {
    expect((await como('authenticated', MOD, `select count(*)::int n from espacios_reclamaciones where estado = 'pendiente'`)).filas[0].n).toBe(2)

    const r = await como('authenticated', MOD, `update espacios_reclamaciones set estado = 'aprobada' where id = '${reclamacionU1}' and estado = 'pendiente' returning resuelta_at`)
    expect(r.filas).toHaveLength(1)
    expect(r.filas[0].resuelta_at).toBeTruthy()

    const leal = await idDe('teatro-leal')
    const g = await db.query<{ gestionado_por: string }>(`select gestionado_por from espacios_escenicos where id = '${leal}'`)
    expect(g.rows[0].gestionado_por).toBe(U1)
  })

  it('rechazar no toca gestionado_por', async () => {
    const r = await como('authenticated', MOD, `update espacios_reclamaciones set estado = 'rechazada' where profile_id = '${U2}' returning id`)
    expect(r.filas).toHaveLength(1)
    const g = await db.query<{ gestionado_por: string }>(`select gestionado_por from espacios_escenicos where slug = 'teatro-leal'`)
    expect(g.rows[0].gestionado_por).toBe(U1)
  })

  it('el responsable lee su ficha aunque esté en borrador, pero todavía no la edita', async () => {
    await db.exec(`update espacios_escenicos set estado = 'borrador' where slug = 'teatro-leal'`)
    expect((await como('authenticated', U1, `select count(*)::int n from espacios_escenicos where slug = 'teatro-leal'`)).filas[0].n).toBe(1)
    expect((await como('authenticated', U2, `select count(*)::int n from espacios_escenicos where slug = 'teatro-leal'`)).filas[0].n).toBe(0)
    expect((await como('authenticated', U1, `update espacios_escenicos set nombre = 'Mío' where slug = 'teatro-leal' returning id`)).filas).toHaveLength(0)
  })
})
