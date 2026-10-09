import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'

/**
 * PostgreSQL real (PGlite, compilado a WebAssembly, en memoria) con lo mínimo
 * de Supabase que necesitan las migraciones de espacios: roles anon y
 * authenticated con los permisos por defecto de Supabase, auth.uid() leído de
 * request.jwt.claim.sub, profiles, profile_roles, es_moderador(),
 * update_updated_at(), slugificar() (copiada tal cual de su migración),
 * moderacion_reglas y un cron.schedule de mentira.
 */

const RAIZ = path.resolve(__dirname, '../../..')
const leer = (nombre: string) => readFileSync(path.join(RAIZ, 'supabase/migrations', nombre), 'utf8')

const SLUGS = leer('20261006105630_slugs_normalizar_en_orden.sql')
const SLUGIFICAR = SLUGS.slice(
  SLUGS.indexOf('create or replace function public.slugificar'),
  SLUGS.indexOf('comment on function public.slugificar'),
)

export const MOD = '00000000-0000-0000-0000-00000000000a'
export const U1 = '00000000-0000-0000-0000-000000000001'
export const U2 = '00000000-0000-0000-0000-000000000002'

export type Resultado = { filas: Record<string, unknown>[]; error: string | null }

export async function baseConMigraciones(migraciones: string[]) {
  const db = new PGlite({ extensions: { unaccent } })
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
    create table public.moderacion_reglas (
      id uuid primary key default gen_random_uuid(), patron text not null,
      tipo text not null default 'palabra', motivo text, activo boolean not null default true,
      created_at timestamptz not null default now());
    alter table public.moderacion_reglas enable row level security;
    create schema cron;
    create table cron.job (jobid serial primary key, jobname text, schedule text, command text);
    create function cron.schedule(n text, s text, c text) returns int language sql as
      $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
    create function cron.unschedule(id int) returns boolean language sql as
      $$ delete from cron.job where jobid = id returning true $$;
  `)
  for (const m of migraciones) await db.exec(leer(m))
  await db.exec(`
    insert into profiles values ('${MOD}', 'mod'), ('${U1}', 'u1'), ('${U2}', 'u2');
    insert into profile_roles values ('${MOD}', 'moderator');
  `)

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

  return { db, como }
}
