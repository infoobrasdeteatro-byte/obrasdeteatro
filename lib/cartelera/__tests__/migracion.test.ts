import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/**
 * La migración de la cartelera (20261014200000_cartelera) ejecutada de verdad
 * en PGlite: slug, moderación (filtro, verificados, límites por plan), RLS,
 * lugar de las funciones, coherencia de las opciones de compra y el registro
 * de clics.
 */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const SALA = '00000000-0000-0000-0000-0000000000b1'
const SALA_BORRADOR = '00000000-0000-0000-0000-0000000000b2'

const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column verificado boolean not null default false,
    add column activo boolean not null default true,
    add column deleted_at timestamptz;
  create table public.works (id uuid primary key default gen_random_uuid(), titulo text);
  create table public.espacios_escenicos (
    id uuid primary key, nombre text not null, municipio text, pais_code text, estado text not null);
`

/** Crea un espectáculo como `uid` y devuelve id y estado (o el error). */
async function crear(uid: string, titulo: string, estado = 'publicado', extra = '') {
  const r = await como('authenticated', uid, `
    insert into espectaculos (user_id, titulo, compania_nombre, estado${extra ? ', sinopsis' : ''})
    values ('${uid}', '${titulo}', 'Compañía Prueba', '${estado}'${extra ? `, '${extra}'` : ''})
    returning id, slug, estado, motivo_filtro, publicado_at`)
  return { fila: r.filas[0] as { id: string; slug: string; estado: string; motivo_filtro: string | null; publicado_at: string | null } | undefined, error: r.error }
}

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261014200000_cartelera.sql'], PREVIO))
  await db.exec(`
    update profiles set verificado = true where id = '${U1}';
    insert into espacios_escenicos values
      ('${SALA}', 'Teatro Guimerá', 'Santa Cruz de Tenerife', 'ES', 'publicado'),
      ('${SALA_BORRADOR}', 'Sala Oculta', 'Madrid', 'ES', 'borrador');
    insert into moderacion_reglas (patron, motivo) values ('casino', 'Publicidad no permitida');
  `)
}, 60_000)

describe('espectáculos: slug y moderación', () => {
  it('slug a partir del título, único', async () => {
    const a = await crear(U1, 'La Casa de Bernarda Alba', 'borrador')
    const b = await crear(U1, 'La casa de Bernarda Alba', 'borrador')
    expect(a.fila?.slug).toBe('la-casa-de-bernarda-alba')
    expect(b.fila?.slug).toBe('la-casa-de-bernarda-alba-2')
  })

  it('perfil verificado y contenido limpio: sale publicado solo', async () => {
    const r = await crear(U1, 'Yerma')
    expect(r.error).toBeNull()
    expect(r.fila?.estado).toBe('publicado')
    expect(r.fila?.publicado_at).not.toBeNull()
  })

  it('perfil sin verificar: queda pendiente de revisión', async () => {
    const r = await crear(U2, 'Bodas de sangre')
    expect(r.fila?.estado).toBe('pendiente_revision')
    expect(r.fila?.publicado_at).toBeNull()
  })

  it('el filtro de palabras lo deja pendiente aunque el perfil esté verificado', async () => {
    const r = await crear(U1, 'Noche de teatro', 'publicado', 'Patrocinado por un casino')
    expect(r.fila?.estado).toBe('pendiente_revision')
    expect(r.fila?.motivo_filtro).toBe('Publicidad no permitida')
  })

  it('el usuario no puede ponerse rechazado, retirado ni finalizado', async () => {
    for (const estado of ['rechazado', 'retirado', 'finalizado']) {
      const r = await crear(U2, `Prueba ${estado}`, estado)
      expect(r.fila?.estado).toBe('borrador')
    }
    const b = await crear(U2, 'Borrador que intenta finalizar', 'borrador')
    await como('authenticated', U2, `update espectaculos set estado = 'finalizado' where id = '${b.fila!.id}'`)
    const e = await db.query<{ estado: string }>(`select estado from espectaculos where id = '${b.fila!.id}'`)
    expect(e.rows[0].estado).toBe('borrador')
  })

  it('cambiar el texto de uno publicado lo devuelve a revisión (si no está verificado)', async () => {
    const r = await crear(U2, 'Doña Rosita')
    await como('authenticated', MOD, `update espectaculos set estado = 'publicado' where id = '${r.fila!.id}'`)
    await como('authenticated', U2, `update espectaculos set duracion_min = 90 where id = '${r.fila!.id}'`)
    let e = await db.query<{ estado: string }>(`select estado from espectaculos where id = '${r.fila!.id}'`)
    expect(e.rows[0].estado).toBe('publicado')
    await como('authenticated', U2, `update espectaculos set titulo = 'Doña Rosita la soltera' where id = '${r.fila!.id}'`)
    e = await db.query<{ estado: string }>(`select estado from espectaculos where id = '${r.fila!.id}'`)
    expect(e.rows[0].estado).toBe('pendiente_revision')
  })

  it('retirado por moderación: el usuario ya no lo puede tocar', async () => {
    const r = await crear(U2, 'Retirable', 'borrador')
    const m = await como('authenticated', MOD, `update espectaculos set estado = 'retirado', motivo_rechazo = 'Spam' where id = '${r.fila!.id}'`)
    expect(m.error).toBeNull()
    const u = await como('authenticated', U2, `update espectaculos set titulo = 'Otro' where id = '${r.fila!.id}'`)
    expect(u.error).toMatch(/retirado/)
  })

  it('límite del plan gratuito: 2 publicados a la vez', async () => {
    await db.exec(`insert into profiles (id, nombre, verificado) values ('00000000-0000-0000-0000-0000000000c1', 'c1', true)`)
    const C1 = '00000000-0000-0000-0000-0000000000c1'
    expect((await crear(C1, 'Uno')).fila?.estado).toBe('publicado')
    expect((await crear(C1, 'Dos')).fila?.estado).toBe('publicado')
    const tres = await crear(C1, 'Tres')
    expect(tres.error).toMatch(/Tu plan permite 2/)
    await db.exec(`update profiles set plan = 'premium' where id = '${C1}'`)
    expect((await crear(C1, 'Tres')).fila?.estado).toBe('publicado')
  })
})

describe('RLS', () => {
  it('anónimo ve publicados, no pendientes ni borradores', async () => {
    const r = await como('anon', null, `select titulo from espectaculos order by titulo`)
    const titulos = r.filas.map(f => f.titulo)
    expect(titulos).toContain('Yerma')
    expect(titulos).not.toContain('Bodas de sangre')
    expect(titulos).not.toContain('La Casa de Bernarda Alba')
  })

  it('el dueño ve los suyos; otro usuario no', async () => {
    const propio = await como('authenticated', U2, `select 1 from espectaculos where titulo = 'Bodas de sangre'`)
    const ajeno = await como('authenticated', U1, `select 1 from espectaculos where titulo = 'Bodas de sangre'`)
    expect(propio.filas).toHaveLength(1)
    expect(ajeno.filas).toHaveLength(0)
  })

  it('anónimo no puede escribir; nadie crea a nombre de otro', async () => {
    const a = await como('anon', null, `insert into espectaculos (user_id, titulo, compania_nombre) values ('${U1}', 'X anon', 'Cía')`)
    expect(a.error).toMatch(/permission denied/)
    const b = await como('authenticated', U2, `insert into espectaculos (user_id, titulo, compania_nombre) values ('${U1}', 'X ajeno', 'Cía')`)
    expect(b.error).toMatch(/row-level security/)
  })

  it('eventos y referencias: ni anónimo ni usuarios escriben', async () => {
    const a = await como('anon', null, `select * from cartelera_eventos`)
    expect(a.error).toMatch(/permission denied/)
    const b = await como('authenticated', U1, `insert into cartelera_eventos (tipo, espectaculo_id) select 'venta', id from espectaculos limit 1`)
    expect(b.error).toMatch(/permission denied/)
  })
})

describe('funciones y opciones de compra', () => {
  let yerma: string
  let otro: string
  beforeAll(async () => {
    yerma = (await db.query<{ id: string }>(`select id from espectaculos where titulo = 'Yerma'`)).rows[0].id
    otro = (await db.query<{ id: string }>(`select id from espectaculos where titulo = 'Bodas de sangre'`)).rows[0].id
  })

  it('con sala: copia nombre, ciudad y país de Espacios escénicos', async () => {
    const r = await como('authenticated', U1, `
      insert into funciones (espectaculo_id, inicio, espacio_id) values ('${yerma}', now() + interval '3 days', '${SALA}')
      returning lugar_nombre, ciudad, pais_code`)
    expect(r.error).toBeNull()
    expect(r.filas[0]).toEqual({ lugar_nombre: 'Teatro Guimerá', ciudad: 'Santa Cruz de Tenerife', pais_code: 'ES' })
  })

  it('sala no publicada: error', async () => {
    const r = await como('authenticated', U1, `insert into funciones (espectaculo_id, inicio, espacio_id) values ('${yerma}', now(), '${SALA_BORRADOR}')`)
    expect(r.error).toMatch(/no existe o no está publicada/)
  })

  it('sin sala: hacen falta lugar, ciudad y país', async () => {
    const mal = await como('authenticated', U1, `insert into funciones (espectaculo_id, inicio, lugar_nombre) values ('${yerma}', now(), 'Plaza')`)
    expect(mal.error).toMatch(/funciones_lugar/)
    const bien = await como('authenticated', U1, `insert into funciones (espectaculo_id, inicio, lugar_nombre, ciudad, pais_code) values ('${yerma}', now() + interval '5 days', 'Plaza Mayor', 'Buenos Aires', 'AR')`)
    expect(bien.error).toBeNull()
  })

  it('otro usuario no añade funciones a un espectáculo ajeno', async () => {
    const r = await como('authenticated', U2, `insert into funciones (espectaculo_id, inicio, espacio_id) values ('${yerma}', now(), '${SALA}')`)
    expect(r.error).toMatch(/row-level security/)
  })

  it('la opción de una función tiene que ser del mismo espectáculo', async () => {
    await db.exec(`insert into funciones (espectaculo_id, inicio, lugar_nombre, ciudad, pais_code) values ('${otro}', now() + interval '1 day', 'Sala B', 'Madrid', 'ES')`)
    const fOtro = (await db.query<{ id: string }>(`select id from funciones where espectaculo_id = '${otro}'`)).rows[0].id
    const r = await como('authenticated', U1, `insert into opciones_compra (espectaculo_id, funcion_id, url) values ('${yerma}', '${fOtro}', 'https://entradas.example.com/x')`)
    expect(r.error).toMatch(/no es de este espectáculo/)
  })

  it('venta online exige enlace; gratis no lleva precio', async () => {
    const sinUrl = await como('authenticated', U1, `insert into opciones_compra (espectaculo_id, tipo) values ('${yerma}', 'venta')`)
    expect(sinUrl.error).toMatch(/opciones_compra_url_si_online/)
    const gratisPrecio = await como('authenticated', U1, `insert into opciones_compra (espectaculo_id, tipo, precio_desde, moneda) values ('${yerma}', 'gratis', 5, 'EUR')`)
    expect(gratisPrecio.error).toMatch(/opciones_compra_gratis_sin_precio/)
  })

  it('registrar_clic_compra (anónimo): anota el clic y devuelve el enlace; nada si no está publicado', async () => {
    const o = await como('authenticated', U1, `insert into opciones_compra (espectaculo_id, url, proveedor, precio_desde, moneda) values ('${yerma}', 'https://entradas.example.com/yerma', 'externo', 15, 'EUR') returning id`)
    expect(o.error).toBeNull()
    const id = o.filas[0].id as string
    const r = await como('anon', null, `select registrar_clic_compra('${id}') as url`)
    expect(r.filas[0].url).toBe('https://entradas.example.com/yerma')
    const ev = await db.query<{ n: number }>(`select count(*)::int n from cartelera_eventos where opcion_id = '${id}' and tipo = 'clic_compra'`)
    expect(ev.rows[0].n).toBe(1)

    await db.exec(`insert into opciones_compra (id, espectaculo_id, url) values ('00000000-0000-0000-0000-0000000000d1', '${otro}', 'https://x.example.com')`)
    const no = await como('anon', null, `select registrar_clic_compra('00000000-0000-0000-0000-0000000000d1') as url`)
    expect(no.filas[0].url).toBeNull()
  })

  it('el dueño ve los eventos de sus espectáculos; otro no', async () => {
    const propio = await como('authenticated', U1, `select count(*)::int n from cartelera_eventos`)
    const ajeno = await como('authenticated', U2, `select count(*)::int n from cartelera_eventos`)
    expect(propio.filas[0].n).toBeGreaterThan(0)
    expect(ajeno.filas[0].n).toBe(0)
  })
})

describe('cierre diario', () => {
  it('finaliza los publicados sin funciones por delante y deja el resto', async () => {
    const pasado = await crear(U1, 'Ya pasó')
    expect(pasado.fila?.estado).toBe('publicado')
    await db.exec(`insert into funciones (espectaculo_id, inicio, lugar_nombre, ciudad, pais_code) values ('${pasado.fila!.id}', now() - interval '2 days', 'Sala', 'Lima', 'PE')`)
    const n = await db.query<{ n: number }>(`select finalizar_espectaculos_terminados() n`)
    expect(n.rows[0].n).toBe(1)
    const e = await db.query<{ titulo: string; estado: string }>(`select titulo, estado from espectaculos where titulo in ('Ya pasó', 'Yerma') order by titulo`)
    expect(e.rows).toEqual([{ titulo: 'Ya pasó', estado: 'finalizado' }, { titulo: 'Yerma', estado: 'publicado' }])
    const anon = await como('anon', null, `select 1 from espectaculos where titulo = 'Ya pasó'`)
    expect(anon.filas).toHaveLength(1)
  })

  it('programa el cron diario', async () => {
    const r = await db.query<{ schedule: string }>(`select schedule from cron.job where jobname = 'finalizar-espectaculos-terminados'`)
    expect(r.rows[0].schedule).toBe('20 3 * * *')
  })
})
