import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, U1, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * La migración 20261013180000_alertas_castings en PGlite, sobre una tabla
 * castings mínima (la real se creó antes de que las migraciones vivieran en
 * el repositorio) con un trg_castings_sync_estado de mentira.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>
const MIG = (n: string) => readFileSync(path.resolve(__dirname, '../../../supabase/migrations', n), 'utf8')

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([]))
  await db.exec(`
    create function public.plan_de_pago() returns boolean language sql stable as $$ select true $$;
    create table public.castings (
      id uuid primary key default gen_random_uuid(),
      estado text not null default 'borrador',
      publicado boolean,
      pais text,
      updated_at timestamptz not null default now()
    );
    -- Como el real: decide el estado final (aquí, pendiente_revision pasa a publicado).
    create function public.castings_sync_estado() returns trigger language plpgsql as $$
    begin
      if new.estado = 'pendiente_revision' then new.estado := 'publicado'; end if;
      new.publicado := (new.estado = 'publicado');
      return new;
    end $$;
    create trigger trg_castings_sync_estado before insert or update of estado on public.castings
      for each row execute function public.castings_sync_estado();
  `)
  await db.exec(MIG('20261008090000_alertas_convocatorias.sql'))
  await db.exec(MIG('20261013180000_alertas_castings.sql'))
}, 60_000)

describe('castings.pais', () => {
  it('solo uno de los 20 países (por nombre) o vacío', async () => {
    await db.exec(`insert into castings (pais) values ('México'), (null)`)
    await expect(db.exec(`insert into castings (pais) values ('Mexico')`)).rejects.toThrow(/castings_pais_check/)
  })
})

describe('castings.publicado_at', () => {
  it('se pone al publicarse (tras el trigger de estado), no se puede falsear y no cambia al reabrir', async () => {
    const [{ id }] = (await db.query<{ id: string }>(`insert into castings (publicado_at) values ('2020-01-01') returning id`)).rows
    expect((await db.query(`select publicado_at from castings where id = '${id}'`)).rows[0]).toEqual({ publicado_at: null })

    await db.exec(`update castings set estado = 'pendiente_revision' where id = '${id}'`)
    const [p1] = (await db.query<{ estado: string; publicado_at: Date | null }>(`select estado, publicado_at from castings where id = '${id}'`)).rows
    expect(p1.estado).toBe('publicado')
    expect(p1.publicado_at).not.toBeNull()

    await db.exec(`update castings set publicado_at = '2020-01-01' where id = '${id}'`)
    await db.exec(`update castings set estado = 'cerrado' where id = '${id}'`)
    await db.exec(`update castings set estado = 'publicado' where id = '${id}'`)
    const [p2] = (await db.query<{ publicado_at: Date }>(`select publicado_at from castings where id = '${id}'`)).rows
    expect(p2.publicado_at.getTime()).toBe(p1.publicado_at!.getTime())
  })
})

describe('alertas_convocatorias: filtros de castings', () => {
  it('el usuario guarda sus filtros de castings; desactivados por defecto', async () => {
    const ins = await como('authenticated', U1, `insert into alertas_convocatorias (profile_id) values ('${U1}') returning castings_activa, castings_solo_remunerados`)
    expect(ins.filas).toEqual([{ castings_activa: false, castings_solo_remunerados: false }])
    const upd = await como('authenticated', U1, `update alertas_convocatorias set castings_activa = true, castings_paises = '{MX,ES}',
      castings_disciplinas = '{teatro}', castings_edad = 34, castings_genero = 'No binario', castings_solo_remunerados = true
      where profile_id = '${U1}' returning castings_edad`)
    expect(upd.error).toBeNull()
    expect(upd.filas).toEqual([{ castings_edad: 34 }])
  })

  it('las CHECK rechazan valores fuera de la lista', async () => {
    const mal = async (set: string) => (await como('authenticated', U1, `update alertas_convocatorias set ${set} where profile_id = '${U1}'`)).error
    expect(await mal(`castings_paises = '{US}'`)).toMatch(/alertas_castings_paises_check/)
    expect(await mal(`castings_edad = 0`)).toMatch(/alertas_castings_edad_check/)
    expect(await mal(`castings_genero = 'Indistinto'`)).toMatch(/alertas_castings_genero_check/)
  })

  it('ultimo_envio_at sigue sin poder escribirse', async () => {
    const r = await como('authenticated', U1, `update alertas_convocatorias set ultimo_envio_at = now() where profile_id = '${U1}'`)
    expect(r.error).toMatch(/permission/)
  })
})
