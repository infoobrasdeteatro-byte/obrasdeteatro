import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { baseConMigraciones, MOD, U1, U2, type Resultado } from '@/lib/espacios/__tests__/pglite'

/** 20261017120000_cartelera_destacar: destacar con el cupo del plan. */

let db: PGlite
let como: (rol: 'anon' | 'authenticated', uid: string | null, sql: string) => Promise<Resultado>

const PREVIO = `
  create type public.plan_suscripcion as enum ('gratuito', 'premium', 'destacado', 'empresas');
  alter table public.profiles
    add column plan public.plan_suscripcion not null default 'gratuito',
    add column verificado boolean not null default true;
  create table public.works (id uuid primary key);
  create table public.espacios_escenicos (id uuid primary key, nombre text, municipio text, pais_code text, estado text);
`

/** Día de hoy en Madrid + n, como texto AAAA-MM-DD. */
let hoy: string
const dia = (n: number) => {
  const [a, m, d] = hoy.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

async function espectaculo(uid: string, titulo: string, diasFunciones: number[]) {
  const r = await db.query<{ id: string }>(`
    insert into espectaculos (user_id, titulo, compania_nombre, estado) values ('${uid}', '${titulo}', 'Cía', 'publicado') returning id`)
  const id = r.rows[0].id
  for (const n of diasFunciones) {
    await db.exec(`insert into funciones (espectaculo_id, inicio, zona_horaria, lugar_nombre, ciudad, pais_code)
      values ('${id}', '${dia(n)}T20:00:00+02:00', 'Europe/Madrid', 'Sala', 'Madrid', 'ES')`)
  }
  return id
}
const destacar = (uid: string, id: string, desde: string) =>
  como('authenticated', uid, `select id, desde::text, hasta::text, origen from cartelera_destacar('${id}', '${desde}')`)

beforeAll(async () => {
  ({ db, como } = await baseConMigraciones(['20261014200000_cartelera.sql', '20261017120000_cartelera_destacar.sql'], PREVIO))
  hoy = (await db.query<{ d: string }>(`select (now() at time zone 'Europe/Madrid')::date::text as d`)).rows[0].d
  // Funciones de prueba sin pasar por moderación: lo insertamos como moderación.
}, 60_000)

describe('destacar con el cupo del plan', () => {
  it('plan gratuito: no incluye semanas', async () => {
    const id = await espectaculo(U1, 'Gratis', [3])
    const r = await destacar(U1, id, dia(1))
    expect(r.error).toMatch(/no incluye semanas de destacado/)
  })

  it('premium: una semana al mes; la segunda del mismo mes no; quitar una futura la devuelve', async () => {
    await db.exec(`update profiles set plan = 'premium' where id = '${U2}'`)
    const id = await espectaculo(U2, 'Premium', [2, 9, 40])
    const a = await destacar(U2, id, dia(1))
    expect(a.error).toBeNull()
    expect(a.filas[0]).toMatchObject({ desde: dia(1), hasta: dia(7), origen: 'plan' })
    // Mismo espectáculo, días que se solapan.
    expect((await destacar(U2, id, dia(5))).error).toMatch(/ya está destacado/)
    // Otra semana del mismo mes (si dia(8) cae en el mismo mes que dia(1)).
    if (dia(8).slice(0, 7) === dia(1).slice(0, 7)) {
      expect((await destacar(U2, id, dia(8))).error).toMatch(/1 semana\(s\) de destacado al mes/)
    }
    const quitar = await como('authenticated', U2, `select cartelera_quitar_destacado('${a.filas[0].id}')`)
    expect(quitar.error).toBeNull()
    expect((await destacar(U2, id, dia(1))).error).toBeNull()
  })

  it('la semana tiene que tener funciones; ni pasado ni a más de 60 días', async () => {
    await db.exec(`update profiles set plan = 'empresas' where id = '${U2}'`)
    const id = await espectaculo(U2, 'Sin función esa semana', [30])
    expect((await destacar(U2, id, dia(1))).error).toMatch(/no tiene funciones/)
    expect((await destacar(U2, id, dia(-1))).error).toMatch(/pasado/)
    expect((await destacar(U2, id, dia(61))).error).toMatch(/60 días/)
    expect((await destacar(U2, id, dia(25))).error).toBeNull()
  })

  it('no se destaca lo ajeno ni lo que no está publicado; anónimo no puede', async () => {
    const ajeno = await espectaculo(U1, 'Ajeno', [2])
    expect((await destacar(U2, ajeno, dia(1))).error).toMatch(/no es tuyo/)
    const borrador = await espectaculo(U2, 'Borrador', [2])
    await db.exec(`update espectaculos set estado = 'borrador' where id = '${borrador}'`)
    expect((await destacar(U2, borrador, dia(1))).error).toMatch(/Solo se pueden destacar espectáculos publicados/)
    expect((await como('anon', null, `select cartelera_destacar('${ajeno}', '${dia(1)}')`)).error).toMatch(/permission denied/)
  })

  it('una semana que ya empezó, o puesta por moderación, no se quita; tampoco se escribe la tabla directamente', async () => {
    const id = await espectaculo(U2, 'Empezada', [0, 1])
    const r = await destacar(U2, id, dia(0))
    expect(r.error).toBeNull()
    expect((await como('authenticated', U2, `select cartelera_quitar_destacado('${r.filas[0].id}')`)).error).toMatch(/ya ha empezado/)
    const mod = await como('authenticated', MOD, `insert into cartelera_destacados (espectaculo_id, desde, hasta, origen) values ('${id}', '${dia(10)}', '${dia(16)}', 'moderacion') returning id`)
    expect(mod.error).toBeNull()
    expect((await como('authenticated', U2, `select cartelera_quitar_destacado('${mod.filas[0].id}')`)).error).toMatch(/equipo de ObrasDeTeatro/)
    const directo = await como('authenticated', U2, `insert into cartelera_destacados (espectaculo_id, desde, hasta) values ('${id}', '${dia(20)}', '${dia(26)}')`)
    expect(directo.error).toMatch(/row-level security/)
  })
})
