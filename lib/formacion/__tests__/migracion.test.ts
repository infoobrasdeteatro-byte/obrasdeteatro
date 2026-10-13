import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * La migración 20261013130000_formaciones ejecutada de verdad en PGlite
 * (PostgreSQL en memoria, ver lib/espacios/__tests__/pglite.ts).
 *
 * U1 es una escuela con plan gratuito (puede publicar), U2 un actor con plan
 * gratuito (no puede hasta subir a Premium) y MOD el moderador.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const MIGRACION = readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261013130000_formaciones.sql'), 'utf8')

const nueva = (uid: string, extra = '', valores = '') => `
  insert into formaciones (profile_id, titulo, tipo, modalidad, pais_code, ciudad, url_inscripcion${extra})
  values ('${uid}', 'Taller de clown', 'taller', 'presencial', 'ES', 'Madrid', 'https://escuela.es/clown'${valores})
  returning id, slug, estado, fecha_publicacion`

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([]))
  await db.exec(`
    alter table profiles add column tipo_perfil text, add column plan text default 'gratuito',
      add column activo boolean default true, add column deleted_at timestamptz;
    update profiles set tipo_perfil = 'escuela' where id = '${U1}';
    update profiles set tipo_perfil = 'actor' where id = '${U2}';
    update profiles set tipo_perfil = 'publico' where id = '${MOD}';
  `)
  await db.exec(MIGRACION)
}, 60_000)

describe('formaciones: quién publica', () => {
  it('una escuela con plan gratuito publica directamente, sin revisión', async () => {
    const r = await como('authenticated', U1, nueva(U1, ', estado', ", 'publicado'"))
    expect(r.error).toBeNull()
    expect(r.filas[0].estado).toBe('publicado')
    expect(r.filas[0].fecha_publicacion).not.toBeNull()
    expect(r.filas[0].slug).toBe('taller-de-clown')
  })

  it('un actor con plan gratuito no puede crear; con Premium sí', async () => {
    const r = await como('authenticated', U2, nueva(U2))
    expect(r.error).toMatch(/row-level security/)
    await db.exec(`update profiles set plan = 'premium' where id = '${U2}'`)
    const ok = await como('authenticated', U2, nueva(U2, ', estado', ", 'publicado'"))
    expect(ok.error).toBeNull()
    expect(ok.filas[0].slug).toBe('taller-de-clown-madrid')
  })

  it('al bajar de plan no publica nuevas, pero lo ya publicado sigue', async () => {
    await db.exec(`update profiles set plan = 'gratuito' where id = '${U2}'`)
    const borrador = await db.query<{ id: string }>(`
      insert into formaciones (profile_id, titulo, tipo, modalidad, url_inscripcion)
      values ('${U2}', 'Masterclass de voz', 'masterclass', 'online', 'https://x.es') returning id`)
    const r = await como('authenticated', U2, `update formaciones set estado = 'publicado' where id = '${borrador.rows[0].id}' returning estado`)
    expect(r.error).toMatch(/plan Premium o superior/)
    const publicadas = await db.query<{ n: number }>(`select count(*)::int n from formaciones where profile_id = '${U2}' and estado = 'publicado'`)
    expect(publicadas.rows[0].n).toBe(1)
  })
})

describe('formaciones: visibilidad y moderación', () => {
  it('anónimo ve solo las publicadas', async () => {
    await db.exec(`insert into formaciones (profile_id, titulo, tipo, modalidad, url_inscripcion) values ('${U1}', 'Borrador secreto', 'curso', 'online', 'https://x.es')`)
    const r = await como('anon', null, `select titulo from formaciones order by titulo`)
    expect(r.filas.map(f => f.titulo)).not.toContain('Borrador secreto')
    expect(r.filas.length).toBeGreaterThan(0)
  })

  it('el autor no puede retirar ni tocar otra ajena; moderación retira con motivo', async () => {
    const id = (await db.query<{ id: string }>(`select id from formaciones where slug = 'taller-de-clown'`)).rows[0].id
    const propia = await como('authenticated', U1, `update formaciones set estado = 'retirado' where id = '${id}'`)
    expect(propia.error).toMatch(/Solo el equipo de moderación/)
    const ajena = await como('authenticated', U2, `update formaciones set titulo = 'Hackeo' where id = '${id}' returning id`)
    expect(ajena.filas).toHaveLength(0)
    const mod = await como('authenticated', MOD, `update formaciones set estado = 'retirado', motivo_retirada = 'No es teatro' where id = '${id}' returning estado, motivo_retirada`)
    expect(mod.filas[0]).toEqual({ estado: 'retirado', motivo_retirada: 'No es teatro' })
    const vuelve = await como('authenticated', U1, `update formaciones set estado = 'publicado' where id = '${id}'`)
    expect(vuelve.error).toMatch(/la ha retirado el equipo/)
    const anon = await como('anon', null, `select id from formaciones where id = '${id}'`)
    expect(anon.filas).toHaveLength(0)
  })

  it('el slug no cambia al editar el título', async () => {
    const r = await como('authenticated', U2, `update formaciones set titulo = 'Taller de clown avanzado' where slug = 'taller-de-clown-madrid' returning slug`)
    expect(r.filas[0].slug).toBe('taller-de-clown-madrid')
  })
})

describe('formaciones: reglas de datos', () => {
  const base = `insert into formaciones (profile_id, titulo, tipo, modalidad, pais_code, ciudad, url_inscripcion, estado`
  it('presencial exige país y ciudad; publicada exige vía de inscripción', async () => {
    await expect(db.exec(`${base}) values ('${U1}', 'Curso X', 'curso', 'presencial', null, null, 'https://x.es', 'borrador')`)).rejects.toThrow(/lugar_si_presencial/)
    await expect(db.exec(`${base}) values ('${U1}', 'Curso X', 'curso', 'online', null, null, null, 'publicado')`)).rejects.toThrow(/inscripcion_si_publicada/)
  })
  it('fechas en orden, precio con moneda y gratuita sin precio', async () => {
    await expect(db.exec(`${base}, fecha_inicio, fecha_fin) values ('${U1}', 'Curso X', 'curso', 'online', null, null, 'https://x.es', 'borrador', '2027-02-01', '2027-01-01')`)).rejects.toThrow(/fechas_orden/)
    await expect(db.exec(`${base}, precio) values ('${U1}', 'Curso X', 'curso', 'online', null, null, 'https://x.es', 'borrador', 50)`)).rejects.toThrow(/moneda_con_precio/)
    await expect(db.exec(`${base}, es_gratuita, precio, moneda) values ('${U1}', 'Curso X', 'curso', 'online', null, null, 'https://x.es', 'borrador', true, 50, 'EUR')`)).rejects.toThrow(/gratuita_sin_precio/)
    await expect(db.exec(`${base}) values ('${U1}', 'Curso X', 'tutoria', 'online', null, null, 'https://x.es', 'borrador')`)).rejects.toThrow(/tipo_check/)
  })
})

describe('formaciones: cierre diario', () => {
  it('finaliza las publicadas cuya fecha de fin ya pasó', async () => {
    await db.exec(`insert into formaciones (profile_id, titulo, tipo, modalidad, url_inscripcion, estado, fecha_inicio, fecha_fin)
      values ('${U1}', 'Curso pasado', 'curso', 'online', 'https://x.es', 'publicado', '2020-01-01', '2020-02-01'),
             ('${U1}', 'Curso futuro', 'curso', 'online', 'https://x.es', 'publicado', '2099-01-01', null)`)
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
    const n = await db.query<{ n: number }>(`select public.finalizar_formaciones_terminadas() n`)
    expect(n.rows[0].n).toBe(1)
    const r = await db.query<{ titulo: string; estado: string }>(`select titulo, estado from formaciones where titulo like 'Curso %' order by titulo`)
    expect(r.rows).toEqual([{ titulo: 'Curso futuro', estado: 'publicado' }, { titulo: 'Curso pasado', estado: 'finalizado' }])
    const job = await db.query<{ n: number }>(`select count(*)::int n from cron.job where jobname = 'finalizar-formaciones-terminadas'`)
    expect(job.rows[0].n).toBe(1)
  })
})
