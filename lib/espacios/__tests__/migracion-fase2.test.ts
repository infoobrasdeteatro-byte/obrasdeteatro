import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, type Resultado } from './pglite'

/**
 * Las tres migraciones de espacios en orden (tabla y Canarias, lote de Madrid
 * y fase 2), ejecutadas en PGlite (PostgreSQL real en memoria; ./pglite.ts).
 *
 * Comprueba que la fase 2 se aplica sobre los 138 espacios sin tocar ninguno,
 * las CHECK de las columnas nuevas, la columna generada verificado, la RLS de
 * espacios_sugerencias y su antispam en la base: 3 por hora por hash de IP,
 * reglas de moderacion_reglas y borrado del hash a las 24 horas.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>
let leal: string

const IP_A = 'a'.repeat(64)
const IP_B = 'b'.repeat(64)

/** Inserta como lo hace la ruta: con la clave de servicio, que en PGlite es el propietario (sin RLS). */
const sugerir = (texto: string, ip: string | null, extra = '') =>
  db.query<{ estado: string; motivo_filtro: string | null }>(
    `insert into espacios_sugerencias (espacio_id, texto, ip_hash${extra ? ', email' : ''})
     values ('${leal}', '${texto}', ${ip ? `'${ip}'` : 'null'}${extra ? `, '${extra}'` : ''})
     returning estado, motivo_filtro`)

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones([
    '20261009120000_espacios_escenicos.sql',
    '20261009130000_espacios_escenicos_madrid.sql',
    '20261009150000_espacios_fichas_completas_y_sugerencias.sql',
  ]))
  leal = (await db.query<{ id: string }>(`select id from espacios_escenicos where slug = 'teatro-leal'`)).rows[0].id
}, 60_000)

describe('fase 2: columnas nuevas', () => {
  it('se aplica sobre los 138 espacios publicados y todas las columnas nuevas nacen vacías', async () => {
    const r = await db.query<{ n: number; vacias: number; verificados: number }>(`
      select count(*)::int n,
             count(*) filter (where codigo_postal is null and telefono is null and email is null and redes is null
               and accesibilidad is null and anio_inauguracion is null and arquitecto is null and titularidad is null
               and wikidata_id is null and imagen_url is null and descripcion_origen is null)::int vacias,
             count(*) filter (where verificado)::int verificados
      from espacios_escenicos where estado = 'publicado'`)
    expect(r.rows[0]).toEqual({ n: 138, vacias: 138, verificados: 0 })
  })

  it('acepta una ficha completa bien formada', async () => {
    await db.exec(`update espacios_escenicos set
      codigo_postal = '38201', telefono = '+34 922 609 450', email = 'info@teatroleal.es',
      redes = '{"instagram": "https://www.instagram.com/teatroleal", "x": "https://x.com/teatroleal"}',
      accesibilidad = 'si', anio_inauguracion = 1915, arquitecto = 'Antonio Pintor y Ocete', titularidad = 'publica',
      wikidata_id = 'Q950052', imagen_url = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Teatro_Leal.jpg',
      imagen_autor = 'Ana Pérez', imagen_licencia = 'CC BY-SA 4.0',
      imagen_fuente_url = 'https://commons.wikimedia.org/wiki/File:Teatro_Leal.jpg', descripcion_origen = 'ia_revisada'
      where id = '${leal}'`)
    const r = await db.query<{ anio_inauguracion: number }>(`select anio_inauguracion from espacios_escenicos where id = '${leal}'`)
    expect(r.rows[0].anio_inauguracion).toBe(1915)
  })

  it.each([
    ['accesibilidad', `'total'`, /accesibilidad_check/],
    ['anio_inauguracion', '1499', /anio_rango/],
    ['anio_inauguracion', '2101', /anio_rango/],
    ['arquitecto', `repeat('a', 121)`, /arquitecto_longitud/],
    ['titularidad', `'mixta'`, /titularidad_check/],
    ['wikidata_id', `'950052'`, /wikidata_formato/],
    ['imagen_url', `'https://example.com/foto.jpg'`, /imagen_url_commons/],
    ['imagen_url', `'http://upload.wikimedia.org/foto.jpg'`, /imagen_url_commons/],
    ['imagen_fuente_url', `'https://example.com/File:x'`, /imagen_fuente_commons/],
    ['imagen_autor', `repeat('a', 161)`, /imagen_autor_longitud/],
    ['imagen_licencia', `repeat('a', 61)`, /imagen_licencia_longitud/],
    ['descripcion_origen', `'chatgpt'`, /descripcion_origen_check/],
    ['telefono', `'llamar por la mañana'`, /telefono_formato/],
    ['email', `'info@'`, /email_formato/],
    ['codigo_postal', `'#38201'`, /codigo_postal_formato/],
  ])('CHECK: %s = %s se rechaza', async (columna, valor, error) => {
    await expect(db.exec(`update espacios_escenicos set ${columna} = ${valor} where id = '${leal}'`)).rejects.toThrow(error)
  })

  it('una foto sin licencia o sin página de Commons se rechaza', async () => {
    await expect(db.exec(`update espacios_escenicos set imagen_licencia = null where id = '${leal}'`)).rejects.toThrow(/imagen_con_credito/)
    await expect(db.exec(`update espacios_escenicos set imagen_fuente_url = null where id = '${leal}'`)).rejects.toThrow(/imagen_con_credito/)
  })

  it.each([
    [`'["https://instagram.com/x"]'`, 'una lista'],
    [`'{"linkedin": "https://linkedin.com/x"}'`, 'una red no admitida'],
    [`'{"instagram": "http://instagram.com/x"}'`, 'una URL sin https'],
    [`'{"instagram": 42}'`, 'un valor que no es texto'],
  ])('redes = %s (%s) se rechaza', async (valor) => {
    await expect(db.exec(`update espacios_escenicos set redes = ${valor} where id = '${leal}'`)).rejects.toThrow(/redes_validas/)
  })

  it('verificado es generado: sigue a gestionado_por y no se puede escribir', async () => {
    await db.exec(`update espacios_escenicos set gestionado_por = '${U1}' where id = '${leal}'`)
    expect((await db.query<{ verificado: boolean }>(`select verificado from espacios_escenicos where id = '${leal}'`)).rows[0].verificado).toBe(true)
    await db.exec(`update espacios_escenicos set gestionado_por = null where id = '${leal}'`)
    expect((await db.query<{ verificado: boolean }>(`select verificado from espacios_escenicos where id = '${leal}'`)).rows[0].verificado).toBe(false)
    await expect(db.exec(`update espacios_escenicos set verificado = true where id = '${leal}'`)).rejects.toThrow(/can only be updated to DEFAULT/)
  })

  it('el público lee las columnas nuevas de los publicados', async () => {
    const r = await como('anon', null, `select telefono, verificado from espacios_escenicos where slug = 'teatro-leal'`)
    expect(r.filas).toEqual([{ telefono: '+34 922 609 450', verificado: false }])
  })
})

describe('fase 2: RLS de espacios_sugerencias', () => {
  it('anon no inserta ni lee', async () => {
    expect((await como('anon', null, `insert into espacios_sugerencias (espacio_id, texto) values ('${leal}', 'El teléfono ha cambiado')`)).error).toMatch(/permission denied/)
    expect((await como('anon', null, `select * from espacios_sugerencias`)).error).toMatch(/permission denied/)
  })

  it('un usuario con sesión tampoco inserta directamente (solo la ruta, con la clave de servicio) ni ve ninguna', async () => {
    await sugerir('Sugerencia de otro visitante', IP_B)
    expect((await como('authenticated', U1, `insert into espacios_sugerencias (espacio_id, texto, profile_id) values ('${leal}', 'El teléfono ha cambiado', '${U1}')`)).error).toMatch(/permission denied/)
    expect((await como('authenticated', U1, `select count(*)::int n from espacios_sugerencias`)).filas[0].n).toBe(0)
  })

  it('moderación las ve y cambia su estado; resuelta_at se sella al resolver y se vacía al reabrir', async () => {
    const vistas = await como('authenticated', MOD, `select id from espacios_sugerencias`)
    expect(vistas.filas.length).toBeGreaterThan(0)
    const id = vistas.filas[0].id
    const r = await como('authenticated', MOD, `update espacios_sugerencias set estado = 'atendida' where id = '${id}' returning resuelta_at`)
    expect(r.filas[0].resuelta_at).toBeTruthy()
    const r2 = await como('authenticated', MOD, `update espacios_sugerencias set estado = 'pendiente' where id = '${id}' returning resuelta_at`)
    expect(r2.filas[0].resuelta_at).toBeNull()
  })

  it('las CHECK: texto de 10 a 1000, email válido y hash con forma de SHA-256', async () => {
    await expect(sugerir('corto', IP_B)).rejects.toThrow(/texto_longitud/)
    await expect(db.exec(`insert into espacios_sugerencias (espacio_id, texto) values ('${leal}', repeat('a', 1001))`)).rejects.toThrow(/texto_longitud/)
    await expect(sugerir('El teléfono ha cambiado', IP_B, 'no-es-email')).rejects.toThrow(/email_formato/)
    await expect(sugerir('El teléfono ha cambiado', '192.168.1.1')).rejects.toThrow(/ip_hash_formato/)
  })

  it('siempre nacen pendientes aunque se pida otro estado', async () => {
    const r = await db.query<{ estado: string }>(`insert into espacios_sugerencias (espacio_id, texto, estado, ip_hash) values ('${leal}', 'Quiero que salga atendida', 'atendida', '${'c'.repeat(64)}') returning estado`)
    expect(r.rows[0].estado).toBe('pendiente')
  })
})

describe('fase 2: antispam de sugerencias en la base', () => {
  it('3 por hora por hash de IP; la cuarta lanza limite_sugerencias; otra IP sigue pudiendo', async () => {
    for (let i = 1; i <= 3; i++) expect((await sugerir(`Corrección número ${i} del teatro`, IP_A)).rows[0].estado).toBe('pendiente')
    await expect(sugerir('Corrección número 4 del teatro', IP_A)).rejects.toThrow(/limite_sugerencias/)
    expect((await sugerir('Corrección desde otra conexión', IP_B)).rows).toHaveLength(1)
  })

  it('las de hace más de una hora no cuentan', async () => {
    await db.exec(`update espacios_sugerencias set created_at = now() - interval '61 minutes' where ip_hash = '${IP_A}'`)
    expect((await sugerir('Corrección una hora después', IP_A)).rows).toHaveLength(1)
  })

  it('una regla activa de moderacion_reglas descarta la sugerencia al entrar, con su motivo', async () => {
    await db.exec(`insert into moderacion_reglas (patron, tipo, motivo) values
      ('casino', 'palabra', 'Spam: apuestas'), ('https?://[^ ]*\\.ru', 'regex', null), ('viagra', 'palabra', 'inactiva')`)
    await db.exec(`update moderacion_reglas set activo = false where patron = 'viagra'`)

    const palabra = await sugerir('Visita nuestro CASINO online ahora', 'd'.repeat(64))
    expect(palabra.rows[0]).toEqual({ estado: 'descartada', motivo_filtro: 'Spam: apuestas' })

    const regex = await sugerir('Más info en http://ofertas.ru/teatro', 'd'.repeat(64))
    expect(regex.rows[0]).toEqual({ estado: 'descartada', motivo_filtro: 'Regla de moderación' })

    const inactiva = await sugerir('Esto menciona viagra pero la regla está inactiva', 'd'.repeat(64))
    expect(inactiva.rows[0]).toEqual({ estado: 'pendiente', motivo_filtro: null })
  })

  it('el hash de la IP se borra a las 24 horas, y el cron diario queda programado una sola vez', async () => {
    await db.exec(`update espacios_sugerencias set created_at = now() - interval '25 hours' where ip_hash = '${IP_B}'`)
    await db.exec(`select public.espacios_sugerencias_borrar_ip_hash()`)
    const r = await db.query<{ con: number; sin: number }>(`
      select count(*) filter (where ip_hash = '${IP_B}')::int con,
             count(*) filter (where ip_hash is null and created_at < now() - interval '24 hours')::int sin
      from espacios_sugerencias`)
    expect(r.rows[0].con).toBe(0)
    expect(r.rows[0].sin).toBeGreaterThan(0)

    const jobs = await db.query<{ n: number }>(`select count(*)::int n from cron.job where jobname = 'espacios-sugerencias-borrar-ip-hash'`)
    expect(jobs.rows[0].n).toBe(1)
  })

  it('nadie más que el planificador puede llamar a las funciones del antispam', async () => {
    expect((await como('authenticated', U1, `select public.espacios_sugerencias_borrar_ip_hash()`)).error).toMatch(/permission denied/)
    expect((await como('anon', null, `select public.espacios_sugerencias_borrar_ip_hash()`)).error).toMatch(/permission denied/)
  })
})
