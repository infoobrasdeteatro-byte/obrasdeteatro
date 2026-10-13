import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, type Resultado } from '@/lib/espacios/__tests__/pglite'

/** La migración 20261013150000_mediateca ejecutada en PGlite. */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const MIGRACION = readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261013150000_mediateca.sql'), 'utf8')

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([]))
  await db.exec(`create table public.colaboradores (id uuid primary key default gen_random_uuid(), nombre text)`)
  await db.exec(MIGRACION)
}, 60_000)

const programa = (nombre: string, activo = true) => `
  insert into mediateca_programas (nombre, activo, youtube_channel_id)
  values ('${nombre}', ${activo}, 'UC9BFlzXJ2JIj4RB1D1vtVCQ') returning id, slug`

describe('mediateca: programas', () => {
  it('solo moderación da de alta; el slug sale del nombre y no cambia', async () => {
    const usuario = await como('authenticated', U1, programa('Cartografías Teatrales'))
    expect(usuario.error).toMatch(/row-level security/)
    const r = await como('authenticated', MOD, programa('Cartografías Teatrales'))
    expect(r.error).toBeNull()
    expect(r.filas[0].slug).toBe('cartografias-teatrales')
    const u = await como('authenticated', MOD, `update mediateca_programas set nombre = 'Otro', slug = 'x' where id = '${r.filas[0].id}' returning slug`)
    expect(u.filas[0].slug).toBe('cartografias-teatrales')
  })

  it('rechaza un canal de YouTube mal escrito', async () => {
    const r = await como('authenticated', MOD, `insert into mediateca_programas (nombre, youtube_channel_id) values ('Malo', '@canal')`)
    expect(r.error).toMatch(/youtube_formato/)
  })

  it('el público solo ve los activos', async () => {
    await como('authenticated', MOD, programa('Programa oculto', false))
    const r = await como('anon', null, `select nombre from mediateca_programas`)
    expect(r.filas.map(f => f.nombre)).toEqual(['Otro'])
  })
})

describe('mediateca: episodios', () => {
  let activo: string
  let oculto: string
  beforeAll(async () => {
    activo = (await db.query<{ id: string }>(`select id from mediateca_programas where activo`)).rows[0].id
    oculto = (await db.query<{ id: string }>(`select id from mediateca_programas where not activo`)).rows[0].id
    await db.exec(`
      insert into mediateca_episodios (programa_id, titulo, fecha_publicacion, youtube_video_id)
      values ('${activo}', 'Episodio 1: Jorge Dubatti', now(), 'abcdefghijk'),
             ('${activo}', 'Episodio 1: Jorge Dubatti', now(), 'abcdefghijl'),
             ('${oculto}', 'Episodio oculto', now(), 'abcdefghijm');
    `)
  })

  it('slug único por programa', async () => {
    const r = await db.query<{ slug: string }>(`select slug from mediateca_episodios where programa_id = '${activo}' order by slug`)
    expect(r.rows.map(x => x.slug)).toEqual(['episodio-1-jorge-dubatti', 'episodio-1-jorge-dubatti-2'])
  })

  it('sin nada que reproducir no entra', async () => {
    await expect(db.exec(`insert into mediateca_episodios (programa_id, titulo, fecha_publicacion) values ('${activo}', 'Vacío', now())`))
      .rejects.toThrow(/reproducible/)
  })

  it('el público no ve episodios de programas inactivos ni retirados', async () => {
    let r = await como('anon', null, `select titulo from mediateca_episodios`)
    expect(r.filas).toHaveLength(2)
    await como('authenticated', MOD, `update mediateca_episodios set estado = 'retirado', motivo_retirada = 'duplicado' where slug = 'episodio-1-jorge-dubatti-2'`)
    r = await como('anon', null, `select titulo from mediateca_episodios`)
    expect(r.filas).toHaveLength(1)
  })

  it('un usuario no puede tocar episodios; restaurar borra el motivo', async () => {
    const u = await como('authenticated', U1, `update mediateca_episodios set titulo = 'x' returning id`)
    expect(u.filas).toHaveLength(0)
    const r = await como('authenticated', MOD, `update mediateca_episodios set estado = 'publicado' where slug = 'episodio-1-jorge-dubatti-2' returning motivo_retirada`)
    expect(r.filas[0].motivo_retirada).toBeNull()
  })
})

describe('mediateca: filtro de título', () => {
  it('la migración 20261013160000 añade filtro_titulo con su límite', async () => {
    await db.exec(readFileSync(path.resolve(__dirname, '../../../supabase/migrations/20261013160000_mediateca_filtro_titulo.sql'), 'utf8'))
    const ok = await como('authenticated', MOD, `insert into mediateca_programas (nombre, youtube_channel_id, filtro_titulo) values ('Cartografía Teatral', 'UCxsJKNct8hWaEUbomHFBEew', 'Cartografía Teatral') returning slug`)
    expect(ok.error).toBeNull()
    expect(ok.filas[0].slug).toBe('cartografia-teatral')
    const malo = await como('authenticated', MOD, `insert into mediateca_programas (nombre, youtube_channel_id, filtro_titulo) values ('X', 'UCxsJKNct8hWaEUbomHFBEew', ' ')`)
    expect(malo.error).toMatch(/filtro_longitud/)
  })
})
